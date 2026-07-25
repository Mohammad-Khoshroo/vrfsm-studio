let cy = cytoscape({
    container: document.getElementById('cy'),
    elements: [],
    style: [
        { selector: 'node', style: { 'label': 'data(label)', 'text-valign': 'center', 'color': '#fff', 'background-color': '#4299e1', 'border-width': 2, 'border-color': '#2b6cb0', 'width': 120, 'height': 50, 'font-size': '14px', 'shape': 'roundrectangle' } },
        { selector: 'edge', style: { 'label': 'data(label)', 'curve-style': 'bezier', 'control-point-step-size': 40, 'target-arrow-shape': 'triangle', 'target-arrow-color': '#a0aec0', 'line-color': '#a0aec0', 'width': 2, 'text-background-color': '#0f1419', 'text-background-opacity': 0.9, 'text-background-padding': '3px', 'font-size': '12px', 'color': '#fff', 'text-rotation': 'autorotate' } },
        { selector: 'node:selected', style: { 'border-color': '#fbd38d', 'border-width': 4 } },
        { selector: 'edge:selected', style: { 'line-color': '#fbd38d', 'target-arrow-color': '#fbd38d', 'width': 4 } }
    ]
});

let connectMode = false;
let connectSource = null;

// History Management
let history = [];
let historyIndex = -1;

function saveHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(cy.json());
    historyIndex++;
    if (history.length > 50) { history.shift(); historyIndex--; }
}

function undo() { if (historyIndex > 0) { historyIndex--; cy.json(history[historyIndex]); } }
function redo() { if (historyIndex < history.length - 1) { historyIndex++; cy.json(history[historyIndex]); } }

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
});

// Cytoscape Events
cy.on('tap', 'node', function(evt) {
    if (connectMode) {
        if (!connectSource) { connectSource = evt.target.id(); alert("Source selected. Select the target node."); }
        else { cy.add({ data: { id: 'e_'+Date.now(), source: connectSource, target: evt.target.id(), label: 'condition' } }); connectSource = null; toggleConnect(); saveHistory(); }
    } else { showProperties(evt.target); }
});
cy.on('tap', 'edge', function(evt) { if (!connectMode) showProperties(evt.target); });
cy.on('tap', function(event) { if (event.target === cy && !connectMode) document.getElementById('props-panel').innerHTML = '<p class="prop-empty">Click on an element to edit properties.</p>'; });
cy.on('dragfree', 'node', saveHistory);

// API Calls
function parseCode() {
    fetch('/api/parse', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code: document.getElementById('verilog-input').value}) })
    .then(res => res.json()).then(data => {
        if(data.error) { alert("Error:\n" + data.details); return; }
        cy.elements().remove();
        data.states.forEach(s => cy.add({ data: { id: s, label: s } }));
        data.transitions.forEach(t => cy.add({ data: { id: 'e_'+Math.random(), source: t.source, target: t.target, label: t.condition } }));
        runLayout('cose');
        saveHistory();
    });
}

function generateCode() {
    const data = cy.json().elements;
    fetch('/api/generate', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) })
    .then(res => res.json()).then(res => {
        document.getElementById('generated-code').innerText = res.code;
        document.getElementById('modal').classList.remove('hidden');
    });
}

// UI Functions
function runLayout(name) { cy.layout({ name: name, animate: true, padding: 50 }).run(); saveHistory(); }
function addState() { cy.add({ data: { id: 's_'+Date.now(), label: 'NEW_STATE' }, position: { x: 200, y: 200 } }); saveHistory(); }
function toggleConnect() { connectMode = !connectMode; document.getElementById('btn-connect').style.background = connectMode ? '#e53e3e' : ''; }
function exportPNG() { let a = document.createElement('a'); a.href = cy.png({ full: true, scale: 3, bg: '#0f1419' }); a.download = 'fsm.png'; a.click(); }
function exportSVG() { let svg = cy.svg({ full: true, scale: 2, bg: '#0f1419' }); let blob = new Blob([svg], {type: 'image/svg+xml'}); let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fsm.svg'; a.click(); }
function copyCode() { navigator.clipboard.writeText(document.getElementById('generated-code').innerText); alert('Copied to clipboard!'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function showProperties(ele) {
    const panel = document.getElementById('props-panel');
    const isNode = ele.isNode();
    let html = `<label class="prop-label">${isNode ? 'State Name' : 'Condition (Label)'}</label>
                <input class="prop-input" type="text" value="${ele.data('label')}" oninput="cy.getElementById('${ele.id()}').data('label', this.value)">`;
    
    if (isNode) {
        html += `<label class="prop-label">Color</label>
                 <input class="prop-input" type="color" value="${ele.style('background-color')}" oninput="cy.getElementById('${ele.id()}').style('background-color', this.value)">
                 <label class="prop-label">Shape</label>
                 <select class="prop-input" onchange="cy.getElementById('${ele.id()}').style('shape', this.value)">
                     <option value="roundrectangle" ${ele.style('shape')=='roundrectangle'?'selected':''}>Round Rectangle</option>
                     <option value="rectangle" ${ele.style('shape')=='rectangle'?'selected':''}>Rectangle</option>
                     <option value="ellipse" ${ele.style('shape')=='ellipse'?'selected':''}>Ellipse</option>
                     <option value="diamond" ${ele.style('shape')=='diamond'?'selected':''}>Diamond</option>
                 </select>`;
    } else {
        html += `<label class="prop-label">Line Color</label>
                 <input class="prop-input" type="color" value="${ele.style('line-color')}" oninput="cy.getElementById('${ele.id()}').style({'line-color': this.value, 'target-arrow-color': this.value})">
                 <label class="prop-label">Line Style</label>
                 <select class="prop-input" onchange="cy.getElementById('${ele.id()}').style('line-style', this.value)">
                     <option value="solid" ${ele.style('line-style')=='solid'?'selected':''}>Solid</option>
                     <option value="dashed" ${ele.style('line-style')=='dashed'?'selected':''}>Dashed</option>
                     <option value="dotted" ${ele.style('line-style')=='dotted'?'selected':''}>Dotted</option>
                 </select>
                 <label class="prop-label">Curvature</label>
                 <input class="prop-input" type="range" min="0" max="150" value="${ele.style('control-point-step-size')||40}" oninput="cy.getElementById('${ele.id()}').style('control-point-step-size', this.value)">`;
    }
    html += `<button class="btn" style="background: #e53e3e; color: white; margin-top: 15px;" onclick="cy.getElementById('${ele.id()}').remove(); document.getElementById('props-panel').innerHTML='<p class=\'prop-empty\'>Element deleted.</p>'; saveHistory();">Delete Element</button>`;
    panel.innerHTML = html;
}
