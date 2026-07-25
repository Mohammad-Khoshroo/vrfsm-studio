import React, { useState } from 'react';
import { Modal } from './Modal';
import { useStore } from '../store/useStore';
import { Loader2, Upload, Download, Copy } from 'lucide-react';
import { calculateLayout } from '../store/utils';

export const VerilogModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { classes, arrows, loadProject, showAlert } = useStore();
    const [verilogInput, setVerilogInput] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleParse = async () => {
        setIsParsing(true);
        try {
            const res = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: verilogInput })
            });
            const data = await res.json();

            if (data.error) {
                showAlert(`Error: ${data.error}\n${data.details || ''}`, 'error');
            } else {
                const newClasses = data.states.map((s: string, i: number) => ({
                    id: s,
                    type: 'fsm_state',
                    name: s,
                    items: [],
                    x: 0, y: 0,
                    width: 140,
                    height: 140,
                    issuedSignals: '',
                    color: 'blue'
                }));
                const newArrows = data.transitions.map((t: any) => ({
                    id: 'arrow-' + Date.now() + Math.random(),
                    type: 'association',
                    start: { x: 0, y: 0, attachedTo: t.source, anchorIndex: 0 },
                    end: { x: 0, y: 0, attachedTo: t.target, anchorIndex: 0 },
                    controlPoints: [],
                    startLabel: ' ',
                    middleLabel: t.condition,
                    endLabel: ' ',
                    startLabelOffset: { x: 0, y: 0 },
                    middleLabelOffset: { x: 0, y: 0 },
                    endLabelOffset: { x: 0, y: 0 },
                    startLabelRotation: 0,
                    middleLabelRotation: 0,
                    endLabelRotation: 0,
                    startLabelFontSize: 14,
                    middleLabelFontSize: 14,
                    endLabelFontSize: 14
                }));

                // اعمال چیدمان درختی روی استیت‌ها
                const layoutUpdates = calculateLayout(newClasses, newArrows, 'tree');
                const layoutedClasses = newClasses.map((c: any) =>
                    layoutUpdates[c.id] ? { ...c, ...layoutUpdates[c.id] } : c
                );

                loadProject(JSON.stringify({ classes: layoutedClasses, arrows: newArrows }));
                showAlert('FSM diagram imported successfully!', 'success');
                onClose();
            }
        } catch (err) {
            showAlert('Failed to parse Verilog code.', 'error');
        } finally {
            setIsParsing(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const states = classes.map(c => ({ id: c.id, label: c.name }));
            const transitions = arrows.map(a => ({
                source: a.start.attachedTo,
                target: a.end.attachedTo,
                condition: a.middleLabel
            })).filter(t => t.source && t.target);

            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ states, transitions })
            });
            const data = await res.json();
            setGeneratedCode(data.code || 'Error generating code.');
        } catch (err) {
            showAlert('Failed to generate Verilog code.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="FSM Studio (Verilog)" maxWidth="max-w-3xl">
            <div className="p-5 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">1. Import Verilog Code (Parse & Draw)</label>
                    <textarea
                        className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                        value={verilogInput}
                        onChange={(e) => setVerilogInput(e.target.value)}
                        placeholder="Paste your Verilog FSM code here..."
                    />
                    <button
                        onClick={handleParse}
                        disabled={isParsing}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        Parse & Draw Diagram
                    </button>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">2. Generate Verilog Code from Canvas</label>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Generate from Canvas
                    </button>
                    <pre className="w-full h-40 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-auto whitespace-pre-wrap">
                        {generatedCode || 'Generated code will appear here...'}
                    </pre>
                    {generatedCode && (
                        <button
                            onClick={() => { navigator.clipboard.writeText(generatedCode); showAlert('Copied to clipboard!', 'success'); }}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                        >
                            <Copy size={16} /> Copy Code
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};