import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

function parseWithVerilator(verilogCode: string) {
    try {
        fs.writeFileSync("build/temp_fsm.v", verilogCode);
        const objDir = path.join(process.cwd(), 'obj_dir');
        if (fs.existsSync(objDir)) fs.rmSync(objDir, { recursive: true });

        try {
            execSync('verilator --json-only --Wno-fatal --bbox-sys build/temp_fsm.v', { stdio: 'pipe' });
        } catch (err: any) {
            return { error: "Verilator Error", details: err.stderr.toString() };
        }

        const files = fs.readdirSync(objDir).filter(f => f.startsWith('V') && f.endsWith('.tree.json'));
        if (files.length === 0) return { error: "JSON not found" };

        const ast = JSON.parse(fs.readFileSync(path.join(objDir, files[0]), 'utf-8'));
        let states: string[] = [];
        let transitions: any[] = [];

        function getStateName(node: any): string | null {
            if (node && typeof node === 'object') return node.origParamName || node.name;
            return null;
        }

        function traverse(node: any, currentState: string | null = null, condition = "always") {
            if (Array.isArray(node)) {
                node.forEach(item => traverse(item, currentState, condition));
            } else if (node && typeof node === 'object') {
                const nodeType = node.type || "";
                if (nodeType === "VAR" && [true, "true", 1].includes(node.isParam)) {
                    const stateName = node.name;
                    if (stateName && !states.includes(stateName)) states.push(stateName);
                } else if (nodeType === "CASEITEM") {
                    const conds = node.condsp || [];
                    if (conds.length > 0 && typeof conds[0] === 'object') {
                        const csName = getStateName(conds[0]);
                        if (states.includes(csName || '')) {
                            currentState = csName;
                            (node.stmtsp || []).forEach((stmt: any) => traverse(stmt, currentState, "always"));
                        }
                    }
                    return;
                } else if (nodeType === "IF") {
                    if (currentState) {
                        const condp = node.condp || [];
                        let condStr = "expr";
                        if (condp.length > 0 && typeof condp[0] === 'object' && condp[0].type === "VARREF") {
                            condStr = condp[0].name;
                        }
                        if ((node.thenp || []).length > 0) traverse(node.thenp, currentState, condStr);
                        if ((node.elsep || []).length > 0) {
                            let elseCond = condStr.startsWith('!') ? condStr.substring(1) : `NOT ${condStr}`;
                            traverse(node.elsep, currentState, elseCond);
                        }
                    }
                    return;
                } else if (nodeType === "ASSIGN") {
                    const lhs = node.lhsp || [];
                    const rhs = node.rhsp || [];
                    if (lhs.length > 0 && rhs.length > 0 && typeof lhs[0] === 'object' && typeof rhs[0] === 'object') {
                        const lhsName = lhs[0].name;
                        if (lhsName === "ns" || lhsName === "next_state") {
                            processRhs(rhs[0], currentState, condition);
                        }
                    }
                    return;
                }
                for (const key in node) {
                    if (["modulesp", "stmtsp", "itemsp", "thenp", "elsep"].includes(key)) {
                        traverse(node[key], currentState, condition);
                    }
                }
            }
        }

        function processRhs(rhsNode: any, currentState: string | null, condition: string) {
            if (!rhsNode || typeof rhsNode !== 'object' || !currentState) return;
            const rhsType = rhsNode.type || "";
            if (rhsType === "COND") {
                const condp = rhsNode.condp || [];
                let condStr = "expr";
                if (condp.length > 0 && typeof condp[0] === 'object' && condp[0].type === "VARREF") {
                    condStr = condp[0].name;
                }
                const thenp = rhsNode.thenp || [];
                const elsep = rhsNode.elsep || [];
                if (thenp.length > 0 && typeof thenp[0] === 'object') {
                    const target = getStateName(thenp[0]);
                    if (target && states.includes(target)) transitions.push({ source: currentState, target, condition: condStr });
                }
                if (elsep.length > 0 && typeof elsep[0] === 'object') {
                    const target = getStateName(elsep[0]);
                    if (target && states.includes(target)) {
                        let elseCond = condStr.startsWith('!') ? condStr.substring(1) : `NOT ${condStr}`;
                        transitions.push({ source: currentState, target, condition: elseCond });
                    }
                }
            } else if (rhsType === "CONST" || rhsType === "VARREF") {
                const target = getStateName(rhsNode);
                if (target && states.includes(target)) {
                    transitions.push({ source: currentState, target, condition });
                }
            }
        }

        traverse(ast);
        return { states, transitions };
    } catch (e: any) {
        return { error: "Node Exception", details: e.message };
    }
}

function generateVerilogCode(states: any[], transitions: any[]) {
    let inputs = new Set<string>();
    transitions.forEach(t => {
        const cond = t.condition || '';
        if (cond !== 'always' && cond !== 'expr' && !cond.startsWith('NOT ')) {
            inputs.add(cond);
        }
    });

    let code = `module fsm_generated(\n    input clk,\n    input rst_n`;
    if (inputs.size > 0) {
        code += `,\n    input ${Array.from(inputs).join(',\n    input ')}`;
    }
    code += `\n);\n\n`;

    if (states.length > 0) {
        code += `localparam [31:0] ${states.map((s, i) => `${s.label} = ${i}`).join(',\n                 ')};\n\n`;
    }
    code += `reg [31:0] ps, ns;\n\n`;

    code += `// Next state logic\nalways @(*) begin\n    case (ps)\n`;
    states.forEach(s => {
        const trans = transitions.filter(t => t.source === s.id);
        if (trans.length === 0) {
            code += `        ${s.label}: ns = ${s.label};\n`;
        } else if (trans.length === 1 && (trans[0].condition === 'always' || trans[0].condition === 'expr')) {
            code += `        ${s.label}: ns = ${states.find(x => x.id === trans[0].target)?.label};\n`;
        } else {
            code += `        ${s.label}: begin\n`;
            trans.forEach((t, i) => {
                const tgtLabel = states.find(x => x.id === t.target)?.label;
                if (t.condition === 'always' || t.condition === 'expr') {
                    code += `            ns = ${tgtLabel};\n`;
                } else {
                    if (i === 0) code += `            if (${t.condition}) ns = ${tgtLabel};\n`;
                    else code += `            else if (${t.condition}) ns = ${tgtLabel};\n`;
                }
            });
            code += `            else ns = ${s.label};\n        end\n`;
        }
    });
    if (states.length > 0) code += `        default: ns = ${states[0].label};\n`;
    code += `    endcase\nend\n\n`;

    code += `// State register\nalways @(posedge clk or negedge rst_n) begin\n    if (!rst_n)\n        ps <= ${states.length > 0 ? states[0].label : 0};\n    else\n        ps <= ns;\nend\n\nendmodule\n`;
    return code;
}

function fsmApiPlugin() {
  return {
    name: 'fsm-api',
    configureServer(server: any) {
      server.middlewares.use('/api/parse', (req: any, res: any) => {
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            const { code } = JSON.parse(body || '{}');
            const result = parseWithVerilator(code || '');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch(e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({error: e.message}));
          }
        });
      });
      server.middlewares.use('/api/generate', (req: any, res: any) => {
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const code = generateVerilogCode(data.states || [], data.transitions || []);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code }));
          } catch(e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({error: e.message}));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), fsmApiPlugin()],
})