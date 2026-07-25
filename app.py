from flask import Flask, render_template, request, jsonify
import subprocess
import os
import json
import glob
import shutil

app = Flask(__name__)

def parse_with_verilator(verilog_code):
    try:
        with open("temp_fsm.v", "w") as f:
            f.write(verilog_code)
        if os.path.exists("obj_dir"):
            shutil.rmtree("obj_dir")
            
        result = subprocess.run(
            ["verilator", "--json-only", "--Wno-fatal", "--bbox-sys", "temp_fsm.v"],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return {"error": "Verilator Error", "details": result.stderr}
            
        json_files = glob.glob("obj_dir/V*.tree.json")
        if not json_files:
            return {"error": "JSON not found"}
            
        with open(json_files[0], 'r') as f:
            ast = json.load(f)
            
        states = []
        transitions = []
        
        def get_state_name(node):
            if isinstance(node, dict):
                return node.get("origParamName") or node.get("name")
            return None

        def traverse(node, current_state=None, condition="always"):
            if isinstance(node, dict):
                node_type = node.get("type", "")
                if node_type == "VAR" and node.get("isParam") in [True, "true", 1]:
                    state_name = node.get("name")
                    if state_name and state_name not in states:
                        states.append(state_name)
                elif node_type == "CASEITEM":
                    conds = node.get("condsp", [])
                    if conds and isinstance(conds[0], dict):
                        cs_name = get_state_name(conds[0])
                        if cs_name in states:
                            current_state = cs_name
                            stmts = node.get("stmtsp", [])
                            for stmt in stmts:
                                traverse(stmt, current_state, "always")
                    return
                elif node_type == "IF":
                    if current_state:
                        condp = node.get("condp", [])
                        cond_str = "expr"
                        if condp and isinstance(condp[0], dict):
                            if condp[0].get("type") == "VARREF":
                                cond_str = condp[0].get("name")
                        thenp = node.get("thenp", [])
                        if thenp: traverse(thenp, current_state, cond_str)
                        elsep = node.get("elsep", [])
                        if elsep:
                            else_cond = cond_str[1:] if cond_str.startswith('!') else f"NOT {cond_str}"
                            traverse(elsep, current_state, else_cond)
                    return
                elif node_type == "ASSIGN":
                    lhs = node.get("lhsp", [])
                    rhs = node.get("rhsp", [])
                    if lhs and rhs and isinstance(lhs[0], dict) and isinstance(rhs[0], dict):
                        lhs_name = lhs[0].get("name")
                        if lhs_name in ["ns", "next_state"]:
                            process_rhs(rhs[0], current_state, condition)
                    return
                for key, val in node.items():
                    if key in ["modulesp", "stmtsp", "itemsp", "thenp", "elsep"]:
                        traverse(val, current_state, condition)
            elif isinstance(node, list):
                for item in node:
                    traverse(item, current_state, condition)

        def process_rhs(rhs_node, current_state, condition):
            if not isinstance(rhs_node, dict) or not current_state: return
            rhs_type = rhs_node.get("type", "")
            if rhs_type == "COND":
                condp = rhs_node.get("condp", [])
                cond_str = "expr"
                if condp and isinstance(condp[0], dict):
                    if condp[0].get("type") == "VARREF":
                        cond_str = condp[0].get("name")
                thenp = rhs_node.get("thenp", [])
                elsep = rhs_node.get("elsep", [])
                if thenp and isinstance(thenp[0], dict):
                    target = get_state_name(thenp[0])
                    if target in states:
                        transitions.append({"source": current_state, "target": target, "condition": cond_str})
                if elsep and isinstance(elsep[0], dict):
                    target = get_state_name(elsep[0])
                    if target in states:
                        else_cond = cond_str[1:] if cond_str.startswith('!') else f"NOT {cond_str}"
                        transitions.append({"source": current_state, "target": target, "condition": else_cond})
            elif rhs_type in ["CONST", "VARREF"]:
                target = get_state_name(rhs_node)
                if target in states:
                    transitions.append({"source": current_state, "target": target, "condition": condition})

        traverse(ast)
        return {"states": states, "transitions": transitions}
    except Exception as e:
        return {"error": "Python Exception", "details": str(e)}

def generate_verilog_code(states, transitions):
    # تولید کد وریلاگ از روی دیاگرام
    inputs = set()
    for t in transitions:
        cond = t.get('condition', '')
        if cond not in ['always', 'expr'] and not cond.startswith('NOT '):
            inputs.add(cond)
            
    code = f"module fsm_generated(\n    input clk,\n    input rst_n"
    if inputs:
        code += ",\n    input " + ",\n    input ".join(inputs)
    code += "\n);\n\n"
    
    code += f"localparam [31:0] " + ",\n                 ".join([f"{s['data']['label']} = {i}" for i, s in enumerate(states)]) + ";\n\n"
    code += "reg [31:0] ps, ns;\n\n"
    
    code += "// Next state logic\nalways @(*) begin\n    case (ps)\n"
    for s in states:
        s_id = s['data']['id']
        s_label = s['data']['label']
        trans = [t for t in transitions if t['data']['source'] == s_id]
        if not trans:
            code += f"        {s_label}: ns = {s_label};\n"
        elif len(trans) == 1 and trans[0]['data']['label'] in ['always', 'expr']:
            tgt = next(x['data']['label'] for x in states if x['data']['id'] == trans[0]['data']['target'])
            code += f"        {s_label}: ns = {tgt};\n"
        else:
            code += f"        {s_label}: begin\n"
            for i, t in enumerate(trans):
                cond = t['data']['label']
                tgt = next(x['data']['label'] for x in states if x['data']['id'] == t['data']['target'])
                if cond in ['always', 'expr']:
                    code += f"            ns = {tgt};\n"
                else:
                    if i == 0:
                        code += f"            if ({cond}) ns = {tgt};\n"
                    else:
                        code += f"            else if ({cond}) ns = {tgt};\n"
            code += f"            else ns = {s_label};\n        end\n"
    code += "        default: ns = " + (states[0]['data']['label'] if states else "0") + ";\n"
    code += "    endcase\nend\n\n"
    
    code += "// State register\nalways @(posedge clk or negedge rst_n) begin\n    if (!rst_n)\n        ps <= " + (states[0]['data']['label'] if states else "0") + ";\n    else\n        ps <= ns;\nend\n\nendmodule\n"
    return code

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/parse', methods=['POST'])
def api_parse():
    result = parse_with_verilator(request.json.get('code', ''))
    return jsonify(result)

@app.route('/api/generate', methods=['POST'])
def api_generate():
    data = request.json
    code = generate_verilog_code(data.get('states', []), data.get('transitions', []))
    return jsonify({"code": code})

if __name__ == '__main__':
    app.run(debug=True)
