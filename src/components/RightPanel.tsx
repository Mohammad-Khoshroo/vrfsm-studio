import React from 'react';
import { useStore } from '../store/useStore';
import type { UmlArrowType } from '../store/types'
import { ARROW_TYPES } from '../store/types'
import { Palette, Type as TypeIcon, GripHorizontal, GripVertical, Minus, Plus, ArrowRight, ArrowLeftRight, Settings2, Tag, X, Star, Zap, Shield, CheckCircle, AlertTriangle, Info, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Slider } from './Slider';

export const RightPanel: React.FC = () => {
  const { isRightPanelOpen, selectedIds, classes, arrows, updateClass, updateArrow, setEditingPolygonId, commitHistory, alignSelected, startDrag, endDrag } = useStore();

  if (!isRightPanelOpen) return null;

  const selectedClasses = classes.filter(c => selectedIds.includes(c.id));
  const selectedArrows = arrows.filter(a => selectedIds.includes(a.id));
  const totalSelected = selectedClasses.length + selectedArrows.length;

  const hasNormalOrPolygon = selectedClasses.some(c => c.type === 'class' || c.type === 'text' || !c.type || c.type === 'polygon' || c.type === 'comment' || c.type === 'shape');
  const hasComment = selectedClasses.some(c => c.type === 'comment');
  const hasPolygon = selectedClasses.some(c => c.type === 'polygon');
  const hasImage = selectedClasses.some(c => c.type === 'image');
  const hasFsmState = selectedClasses.some(c => c.type === 'fsm_state');
  const hasArrow = selectedArrows.length > 0;
  
  const singleClass = selectedClasses.length === 1 ? selectedClasses[0] : null;
  const singleArrow = selectedArrows.length === 1 ? selectedArrows[0] : null;

  return (
    <div className="absolute top-[65px] right-0 bottom-0 w-64 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col z-[80] shadow-[-4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300 overflow-y-auto">
      <div className="border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur z-10 p-3 flex items-center gap-2">
        <Settings2 size={16} className="text-slate-500" />
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Properties</h2>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {totalSelected === 0 ? (
          <div className="text-xs text-slate-400 text-center mt-4">No item selected.</div>
        ) : (
          <>
            {singleClass && singleClass.type !== 'text' && singleClass.type !== 'class' && singleClass.type !== undefined && singleClass.type !== 'fsm_state' && (
              <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  Rotation
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-grow">
                    <Slider 
                      min={0} max={359} step={1} 
                      value={singleClass.rotation || 0} 
                      onChange={(e) => updateClass(singleClass.id, { rotation: parseInt(e.target.value) })} 
                      onPointerDown={() => startDrag({ targetId: singleClass.id, type: 'panel-slider' })}
                      onPointerUp={() => { endDrag(); commitHistory(); }}
                    />
                  </div>
                  <div className="flex items-center gap-1 w-[52px] justify-end">
                    <input 
                      type="number" 
                      min={0} 
                      max={359} 
                      value={singleClass.rotation || 0} 
                      onChange={(e) => {
                        let val = parseInt(e.target.value);
                        if (isNaN(val)) val = 0;
                        if (val < 0) val = 360 + (val % 360); // هندل کردن اعداد منفی
                        updateClass(singleClass.id, { rotation: val % 360 });
                      }}
                      onBlur={() => commitHistory()}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs font-mono text-slate-500">°</span>
                  </div>
                </div>
              </div>
            )}

            {hasNormalOrPolygon && (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={14} /> Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'slate', bg: 'bg-slate-300 dark:bg-slate-600' },
                    { name: 'yellow', bg: 'bg-amber-400' },
                    { name: 'blue', bg: 'bg-blue-400' },
                    { name: 'green', bg: 'bg-emerald-400' },
                    { name: 'rose', bg: 'bg-rose-400' },
                    { name: 'purple', bg: 'bg-purple-400' },
                    { name: 'cyan', bg: 'bg-cyan-400' },
                    { name: 'orange', bg: 'bg-orange-400' },
                  ].map(color => (
                    <button 
                      key={color.name}
                      onClick={() => {
                        selectedClasses.forEach(c => updateClass(c.id, { color: color.name as any }));
                        commitHistory();
                      }}
                      className={`w-6 h-6 rounded-full ${color.bg} border border-black/10 dark:border-white/10 hover:scale-110 transition-transform ${totalSelected === 1 && (singleClass?.color === color.name || (!singleClass?.color && color.name === (singleClass?.type === 'text' ? 'yellow' : 'slate'))) ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''}`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {selectedClasses.length > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  Alignment & Distribution
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 gap-1">
                    <button onClick={() => { alignSelected('left'); commitHistory(); }} className="flex-1 p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-300" title="Align Left"><AlignLeft size={16} className="mx-auto" /></button>
                    <button onClick={() => { alignSelected('center'); commitHistory(); }} className="flex-1 p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-300" title="Align Center"><AlignCenter size={16} className="mx-auto" /></button>
                    <button onClick={() => { alignSelected('right'); commitHistory(); }} className="flex-1 p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-300" title="Align Right"><AlignRight size={16} className="mx-auto" /></button>
                    <div className="w-[1px] bg-slate-200 dark:bg-slate-600 mx-1"></div>
                    <button onClick={() => { alignSelected('top'); commitHistory(); }} className="flex-1 p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-300" title="Align Top"><AlignLeft size={16} className="mx-auto rotate-90" /></button>
                    <button onClick={() => { alignSelected('middle'); commitHistory(); }} className="flex-1 p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-300" title="Align Middle"><AlignCenter size={16} className="mx-auto rotate-90" /></button>
                    <button onClick={() => { alignSelected('bottom'); commitHistory(); }} className="flex-1 p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-300" title="Align Bottom"><AlignRight size={16} className="mx-auto rotate-90" /></button>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 gap-1">
                    <button onClick={() => { alignSelected('distribute-h'); commitHistory(); }} className="flex-1 flex items-center justify-center gap-1.5 p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors text-[11px] font-medium text-slate-600 dark:text-slate-300" title="Distribute Horizontally"><GripHorizontal size={14}/> Distribute H</button>
                    <button onClick={() => { alignSelected('distribute-v'); commitHistory(); }} className="flex-1 flex items-center justify-center gap-1.5 p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors text-[11px] font-medium text-slate-600 dark:text-slate-300" title="Distribute Vertically"><GripVertical size={14}/> Distribute V</button>
                  </div>
                </div>
              </div>
            )}

            {singleClass && (!singleClass.type || singleClass.type === 'class' || singleClass.type === 'text') && (
                <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between" >
                    <div className="flex items-center gap-1.5"><Tag size={14} /> Badge</div>
                    {singleClass.badge && (
                      <button onClick={() => { updateClass(singleClass.id, { badge: undefined }); commitHistory(); }} className="text-red-500 hover:text-red-600 transition-colors" title="Remove Badge"><X size={14} /></button>
                    )}
                  </div>
                  
                  {!singleClass.badge ? (
                    <button 
                      onClick={() => {
                        updateClass(singleClass.id, { badge: { text: 'New', color: 'blue', icon: 'star' } });
                        commitHistory();
                      }}
                      className="w-full px-3 py-2 text-[13px] font-medium flex justify-center items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                    >
                      <Plus size={14} /> Add Badge
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={singleClass.badge.text} 
                        onChange={(e) => { updateClass(singleClass.id, { badge: { ...singleClass.badge!, text: e.target.value } }); }}
                        onBlur={() => commitHistory()}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                        placeholder="Badge text..."
                      />
                      
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Theme</span>
                        <div className="flex flex-wrap gap-2">
                          {[ { name: 'slate', bg: 'bg-slate-400' }, { name: 'yellow', bg: 'bg-amber-400' }, { name: 'blue', bg: 'bg-blue-400' }, { name: 'green', bg: 'bg-emerald-400' }, { name: 'rose', bg: 'bg-rose-400' }, { name: 'purple', bg: 'bg-purple-400' } ].map(color => (
                            <button key={color.name} onClick={() => { updateClass(singleClass.id, { badge: { ...singleClass.badge!, color: color.name as any } }); commitHistory(); }} className={`w-5 h-5 rounded-full ${color.bg} border border-black/10 dark:border-white/10 transition-transform ${singleClass.badge?.color === color.name ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800 scale-110' : 'hover:scale-110'}`} title={color.name} />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Icon</span>
                        <div className="flex flex-wrap gap-1">
                          {[ { id: 'star', icon: <Star size={14} /> }, { id: 'zap', icon: <Zap size={14} /> }, { id: 'shield', icon: <Shield size={14} /> }, { id: 'check', icon: <CheckCircle size={14} /> }, { id: 'alert', icon: <AlertTriangle size={14} /> }, { id: 'info', icon: <Info size={14} /> } ].map(iconObj => (
                            <button key={iconObj.id} onClick={() => { updateClass(singleClass.id, { badge: { ...singleClass.badge!, icon: iconObj.id } }); commitHistory(); }} className={`p-1.5 rounded transition-colors ${singleClass.badge?.icon === iconObj.id ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`} title={iconObj.id} >{iconObj.icon}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {hasComment && (
              <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TypeIcon size={14} /> Font Size
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => { selectedClasses.filter(c => c.type === 'comment').forEach(c => updateClass(c.id, { fontSize: Math.max(8, (c.fontSize || 14) - 2) })); commitHistory(); }} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Minus size={14} /></button>
                  <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{singleClass?.fontSize || 14}px</span>
                  <button onClick={() => { selectedClasses.filter(c => c.type === 'comment').forEach(c => updateClass(c.id, { fontSize: Math.min(72, (c.fontSize || 14) + 2) })); commitHistory(); }} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Plus size={14} /></button>
                </div>
                
                <div className="flex flex-col gap-2 mt-1">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Text Align</div>
                  <div className="flex gap-1">
                    {[
                      { align: 'left', icon: <AlignLeft size={14} /> },
                      { align: 'center', icon: <AlignCenter size={14} /> },
                      { align: 'right', icon: <AlignRight size={14} /> }
                    ].map(opt => (
                      <button 
                        key={opt.align}
                        onClick={() => { selectedClasses.filter(c => c.type === 'comment').forEach(c => updateClass(c.id, { textAlign: opt.align as any })); commitHistory(); }}
                        className={`flex-1 flex justify-center items-center py-1.5 rounded transition-colors ${singleClass?.textAlign === opt.align || (!singleClass?.textAlign && opt.align === 'left') ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'}`}
                        title={opt.align}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Padding X</div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => { selectedClasses.filter(c => c.type === 'comment').forEach(c => updateClass(c.id, { paddingX: Math.max(0, (c.paddingX ?? 10) - 2) })); commitHistory(); }} className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Minus size={12} /></button>
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{singleClass?.paddingX ?? 10}px</span>
                      <button onClick={() => { selectedClasses.filter(c => c.type === 'comment').forEach(c => updateClass(c.id, { paddingX: Math.min(100, (c.paddingX ?? 10) + 2) })); commitHistory(); }} className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Plus size={12} /></button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Padding Y</div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => { selectedClasses.filter(c => c.type === 'comment').forEach(c => updateClass(c.id, { paddingY: Math.max(0, (c.paddingY ?? 10) - 2) })); commitHistory(); }} className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Minus size={12} /></button>
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{singleClass?.paddingY ?? 10}px</span>
                      <button onClick={() => { selectedClasses.filter(c => c.type === 'comment').forEach(c => updateClass(c.id, { paddingY: Math.min(100, (c.paddingY ?? 10) + 2) })); commitHistory(); }} className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Plus size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(singleClass?.type === 'polygon' || singleClass?.type === 'comment' || singleClass?.type === 'shape') && (
              <div className="flex flex-col gap-5 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                {singleClass.shapeType === 'regularPolygon' && (
                  <div className="flex flex-col gap-2">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Number of Sides</div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => { updateClass(singleClass.id, { sides: Math.max(3, (singleClass.sides || 3) - 1) }); commitHistory(); }} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Minus size={14} /></button>
                      <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{singleClass.sides || 3}</span>
                      <button onClick={() => { updateClass(singleClass.id, { sides: Math.min(20, (singleClass.sides || 3) + 1) }); commitHistory(); }} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Plus size={14} /></button>
                    </div>
                  </div>
                )}

                {singleClass.type === 'polygon' && (
                  <button className="w-full px-3 py-2 text-[13px] font-bold flex justify-center items-center gap-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30" onClick={() => setEditingPolygonId(singleClass.id)}>
                    <GripHorizontal size={16} /> Edit Points
                  </button>
                )}

                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Opacity</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-grow">
                      <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        value={singleClass.fillOpacity ?? (singleClass.type === 'comment' ? 0 : 0.2)}
                        onChange={(e) => updateClass(singleClass.id, { fillOpacity: parseFloat(e.target.value) })}
                        onPointerDown={() => startDrag({ targetId: singleClass.id, type: 'panel-slider' })}
                        onPointerUp={() => { endDrag(); commitHistory(); }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300 w-8 text-right">{Math.round((singleClass.fillOpacity ?? (singleClass.type === 'comment' ? 0 : 0.2)) * 100)}%</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Border Style</div>
                  <div className="flex gap-1">
                    {['none', 'solid', 'dashed'].map(st => (
                      <button 
                        key={st}
                        onClick={() => { updateClass(singleClass.id, { strokeStyle: st as any }); commitHistory(); }}
                        className={`flex-1 py-1.5 text-xs rounded border capitalize transition-colors font-medium ${(singleClass.strokeStyle || 'none') === st ? 'bg-slate-200 border-slate-400 text-slate-800 dark:bg-slate-600 dark:text-white dark:border-slate-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                      >{st}</button>
                    ))}
                  </div>
                </div>

                {!(singleClass.type === 'shape' && (singleClass.shapeType === 'ellipse' || singleClass.shapeType === 'cloud')) && (
                  <div className="flex flex-col gap-2">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Border Radius</div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => { updateClass(singleClass.id, { borderRadius: Math.max(0, (singleClass.borderRadius || 0) - 5) }); commitHistory(); }} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Minus size={14} /></button>
                      <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{singleClass.borderRadius || 0}px</span>
                      <button onClick={() => { updateClass(singleClass.id, { borderRadius: Math.min(100, (singleClass.borderRadius || 0) + 5) }); commitHistory(); }} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Plus size={14} /></button>
                    </div>
                  </div>
                )}

                {singleClass.type === 'shape' && (singleClass.shapeType === 'rectangle' || singleClass.shapeType === 'ellipse') && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">1:1 Ratio (Square/Circle)</div>
                    <button
                      onClick={() => {
                        const isLocked = !singleClass.aspectRatioLocked;
                        const updates: Partial<UmlClassType> = { aspectRatioLocked: isLocked };
                        if (isLocked) {
                          const size = Math.max(singleClass.width, singleClass.height || 100);
                          updates.width = size;
                          updates.height = size;
                        }
                        updateClass(singleClass.id, updates);
                        commitHistory();
                      }}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${singleClass.aspectRatioLocked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${singleClass.aspectRatioLocked ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {hasImage && singleClass?.type === 'image' && (
              <div className="flex flex-col gap-5 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Border Radius</div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => { updateClass(singleClass.id, { borderRadius: Math.max(0, (singleClass.borderRadius || 0) - 5) }); commitHistory(); }} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Minus size={14} /></button>
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{singleClass.borderRadius || 0}px</span>
                    <button onClick={() => { updateClass(singleClass.id, { borderRadius: Math.min(100, (singleClass.borderRadius || 0) + 5) }); commitHistory(); }} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Plus size={14} /></button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const objectUrl = URL.createObjectURL(file);
                      const img = new Image();
                      img.onload = () => {
                        const newAspectRatio = img.height / img.width;
                        const newHeight = singleClass.width * newAspectRatio;
                        updateClass(singleClass.id, { 
                          imageUrl: objectUrl, 
                          aspectRatio: newAspectRatio,
                          height: newHeight
                        });
                        commitHistory();
                      };
                      img.src = objectUrl;
                    };
                    input.click();
                  }}
                  className="w-full px-3 py-2 text-[13px] font-medium flex justify-center items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                >
                  Change Image
                </button>
              </div>
            )}

            {hasFsmState && (
              <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  FSM State Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'blue', bg: 'bg-blue-500' },
                    { name: 'green', bg: 'bg-emerald-500' },
                    { name: 'yellow', bg: 'bg-amber-500' },
                    { name: 'rose', bg: 'bg-rose-500' },
                  ].map(color => (
                    <button 
                      key={color.name}
                      onClick={() => {
                        selectedClasses.filter(c => c.type === 'fsm_state').forEach(c => updateClass(c.id, { color: color.name as any }));
                        commitHistory();
                      }}
                      className={`w-6 h-6 rounded-full ${color.bg} border border-black/10 dark:border-white/10 hover:scale-110 transition-transform ${singleClass?.color === color.name ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''}`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {hasArrow && (
              <div className="flex flex-col gap-5 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">Arrow Settings</div>

                <div className="flex flex-col gap-3">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette size={14} /> Color
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'slate', bg: 'bg-slate-300 dark:bg-slate-600' },
                      { name: 'yellow', bg: 'bg-amber-400' },
                      { name: 'blue', bg: 'bg-blue-400' },
                      { name: 'green', bg: 'bg-emerald-400' },
                      { name: 'rose', bg: 'bg-rose-400' },
                      { name: 'purple', bg: 'bg-purple-400' }
                    ].map(color => (
                      <button 
                        key={color.name}
                        onClick={() => {
                          selectedArrows.forEach(a => updateArrow(a.id, { color: color.name as any }));
                          commitHistory();
                        }}
                        className={`w-6 h-6 rounded-full ${color.bg} border border-black/10 dark:border-white/10 hover:scale-110 transition-transform ${totalSelected === 1 && (singleArrow?.color === color.name || (!singleArrow?.color && color.name === 'slate')) ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''}`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {ARROW_TYPES.map(arrType => (
                    <button
                      key={arrType}
                      onClick={() => {
                        selectedArrows.forEach(a => updateArrow(a.id, { type: arrType }));
                        commitHistory();
                      }}
                      className={`py-2 text-xs rounded border capitalize transition-colors flex items-center justify-center gap-1.5 font-medium ${singleArrow?.type === arrType ? 'bg-slate-200 border-slate-400 text-slate-800 dark:bg-slate-600 dark:text-white dark:border-slate-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                    >
                      {arrType === 'line' ? <Minus size={14} /> : <ArrowRight size={14} />} {arrType}
                    </button>
                  ))}
                </div>

                <button
                  className="w-full px-3 py-2 text-[13px] font-medium flex justify-center items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                  onClick={() => {
                    selectedArrows.forEach(arrow => {
                      updateArrow(arrow.id, {
                        start: arrow.end,
                        end: arrow.start,
                        startLabel: arrow.endLabel,
                        endLabel: arrow.startLabel,
                        startLabelOffset: arrow.endLabelOffset,
                        endLabelOffset: arrow.startLabelOffset,
                        controlPoints: arrow.controlPoints ? [...arrow.controlPoints].reverse() : []
                      });
                    });
                    commitHistory();
                  }}
                >
                  <ArrowLeftRight size={14} /> Reverse Direction
                </button>

                {singleArrow && (
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Label Settings</div>
                    {(['start', 'middle', 'end'] as const).map(pos => {
                      const val = singleArrow[`${pos}Label`];
                      if (!val || val.trim() === '') return null; // Show only if label is active
                      
                      const currentFontSize = (singleArrow[`${pos}LabelFontSize` as keyof UmlArrowType] as number) || 14;
                      
                      return (
                        <div key={pos} className="flex flex-col gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0 last:pb-0">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{pos} Label</span>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Size</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { updateArrow(singleArrow.id, { [`${pos}LabelFontSize`]: Math.max(8, currentFontSize - 2) } as Partial<UmlArrowType>); commitHistory(); }} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Minus size={12} /></button>
                              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 w-6 text-center">{currentFontSize}</span>
                              <button onClick={() => { updateArrow(singleArrow.id, { [`${pos}LabelFontSize`]: Math.min(72, currentFontSize + 2) } as Partial<UmlArrowType>); commitHistory(); }} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200"><Plus size={12} /></button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Orientation</span>
                            <div className="flex gap-1">
                            {[
                              { angle: 0, icon: <TypeIcon size={14} />, label: 'Horizontal' },
                              { angle: 90, icon: <TypeIcon size={14} className="rotate-90" />, label: 'Down' },
                              { angle: -90, icon: <TypeIcon size={14} className="-rotate-90" />, label: 'Up' },
                            ].map(opt => {
                              const currentAngle = singleArrow[`${pos}LabelRotation` as keyof UmlArrowType] || 0;
                              return (
                                <button key={opt.angle} onClick={() => { updateArrow(singleArrow.id, { [`${pos}LabelRotation`]: opt.angle } as Partial<UmlArrowType>); commitHistory(); }} className={`flex-1 flex justify-center items-center py-2 rounded transition-colors ${currentAngle === opt.angle ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'}`} title={opt.label}>{opt.icon}</button>
                              );
                            })}
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};