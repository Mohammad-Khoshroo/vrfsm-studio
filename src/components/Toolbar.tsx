import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PlusSquare, FileText, ArrowRight, ArrowRightFromLine, MoreHorizontal, Layers, GripHorizontal, Camera, PanelLeft, PanelRight, Download, Upload, Minus, Type, Hexagon, Image as ImageIcon, Shapes, Square, Circle, Triangle, PenTool, Cloud, HelpCircle, LayoutGrid, Disc } from 'lucide-react';
import { domToPng } from 'modern-screenshot'
import { HelpModal } from './HelpModal';
import { VerilogModal } from './VerilogModal';
import { Cpu } from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { addClass, addTextBox, addComment, startDrawingPolygon, isDrawingPolygon, setPendingArrowType, pendingArrowType, settings, selectElement, toggleLeftPanel, isLeftPanelOpen, toggleRightPanel, isRightPanelOpen, classes, arrows, loadProject, addImage, pendingItemType, setPendingItemType, setPendingImageData, pendingShapeType, setPendingShapeType, showAlert, autoLayout, addFsmState } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const [isVerilogOpen, setIsVerilogOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setIsShapeMenuOpen(false);
      }
    };
    if (isShapeMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShapeMenuOpen]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setIsLayoutMenuOpen(false);
      }
    };
    if (isLayoutMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLayoutMenuOpen]);

  const handleExport = () => {
    selectElement(null);
    setTimeout(() => {
      const canvasEl = document.getElementById('canvas') as HTMLElement;
      if (canvasEl) {
        const originalBgImage = canvasEl.style.backgroundImage;
        if (settings.exportTransparent) {
          canvasEl.style.setProperty('background-image', 'none', 'important');
        }
        domToPng(canvasEl, {
          backgroundColor: settings.exportTransparent ? 'transparent' : (settings.isDarkMode ? '#0f172a' : '#f8fafc'),
          scale: settings.exportScale || 4,
          style: settings.exportTransparent ? { backgroundImage: 'none' } : undefined
        }).then(canvas => {
          const link = document.createElement('a');
          link.download = 'UML-Diagram.png';
          link.href = canvas;
          link.click();
        }).catch(err => {
          console.error('Export failed:', err);
          showAlert('An error occurred during export.', 'error');
        }).finally(() => {
          if (settings.exportTransparent) {
            canvasEl.style.backgroundImage = originalBgImage;
          }
        });
      }
    }, 100);
  };

  const handleSaveProject = async () => {
    const projectClasses = await Promise.all(classes.map(async (c) => {
      if (c.type === 'image' && c.imageUrl?.startsWith('blob:')) {
        try {
          const res = await fetch(c.imageUrl);
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          return { ...c, imageUrl: base64 };
        } catch (err) {
          return c;
        }
      }
      return c;
    }));

    const projectData = { classes: projectClasses, arrows };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'UML-Project.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) loadProject(content);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      const maxW = 400;
      if (w > maxW) { h = (maxW / w) * h; w = maxW; }
      setPendingItemType('image');
      setPendingImageData({ url: objectUrl, width: w, height: h });
    };
    img.src = objectUrl;
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const btnClass = "flex items-center gap-2 px-3 py-2 cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md font-medium text-[13px] transition-all hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm text-slate-900 dark:text-slate-50";

  return (
    <div id="toolbar" className="bg-white dark:bg-slate-800 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex gap-3 flex-wrap shadow-sm relative z-[100]">
      <button onClick={toggleLeftPanel} className={`${btnClass} ${isLeftPanelOpen ? 'bg-slate-100 dark:bg-slate-700' : ''}`} title="Toggle Explorer">
        <PanelLeft size={16} />
      </button>

      <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

      <button onClick={() => setPendingItemType('class')} className={`flex items-center gap-2 px-4 py-2 cursor-pointer border rounded-md font-medium text-[13px] transition-all shadow-sm ${pendingItemType === 'class' ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600 hover:border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 dark:hover:bg-blue-500/20'}`}>
        <PlusSquare size={16} /> Class
      </button>
      <button
        onClick={() => addFsmState(300, 200)}
        className="flex items-center gap-2 px-4 py-2 cursor-pointer border rounded-md font-medium text-[13px] transition-all shadow-sm bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30 dark:hover:bg-indigo-500/20"
      >
        <Disc size={16} /> FSM State
      </button>

      <button onClick={() => setPendingItemType('text')} className={`flex items-center gap-2 px-4 py-2 cursor-pointer border rounded-md font-medium text-[13px] transition-all shadow-sm ${pendingItemType === 'text' ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:border-amber-600' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/20'}`}>
        <FileText size={16} /> Note
      </button>

      <button onClick={() => setPendingItemType('comment')} className={`flex items-center gap-2 px-4 py-2 cursor-pointer border rounded-md font-medium text-[13px] transition-all shadow-sm ${pendingItemType === 'comment' ? 'bg-purple-500 text-white border-purple-500 hover:bg-purple-600 hover:border-purple-600' : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30 dark:hover:bg-purple-500/20'}`}>
        <Type size={16} /> Text
      </button>

      <div className="relative flex" ref={shapeMenuRef}>
        <button onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)} className={`flex items-center gap-2 px-4 py-2 cursor-pointer border rounded-md font-medium text-[13px] transition-all shadow-sm ${((pendingItemType === 'shape' || isDrawingPolygon) && !isShapeMenuOpen) ? 'bg-pink-500 text-white border-pink-500 hover:bg-pink-600 hover:border-pink-600' : 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/30 dark:hover:bg-pink-500/20'}`}>
          <Shapes size={16} /> Shape
        </button>

        {isShapeMenuOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[200] flex flex-col overflow-hidden py-1">
            {[
              { id: 'cloud', icon: <Cloud size={14} />, label: 'Cloud' },
              { id: 'rectangle', icon: <Square size={14} />, label: 'Rectangle' },
              { id: 'ellipse', icon: <Circle size={14} />, label: 'Ellipse / Circle' },
              { id: 'regularPolygon', icon: <Triangle size={14} />, label: 'Polygon (Regular)' },
              { id: 'freeform', icon: <PenTool size={14} />, label: 'Freeform (Custom)' },
            ].map(shape => (
              <button key={shape.id} onClick={() => {
                if (shape.id === 'freeform') { startDrawingPolygon(); }
                else { setPendingItemType('shape'); setPendingShapeType(shape.id as any); }
                setIsShapeMenuOpen(false);
              }}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${((pendingShapeType === shape.id && pendingItemType === 'shape') || (isDrawingPolygon && shape.id === 'freeform')) ? 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {shape.icon} <span className="flex-1 text-left">{shape.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageUpload} />
      <button onClick={() => {
        if (pendingItemType === 'image') {
          setPendingItemType(null);
          setPendingImageData(null);
        } else {
          imageInputRef.current?.click();
        }
      }}
        className={`flex items-center gap-2 px-4 py-2 cursor-pointer border rounded-md font-medium text-[13px] transition-all shadow-sm ${pendingItemType === 'image' ? 'bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600 hover:border-cyan-600' : 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30 dark:hover:bg-cyan-500/20'}`}>
        <ImageIcon size={16} /> Image
      </button>

      <div className="relative flex" ref={layoutMenuRef}>
        <button
          onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
          className={`flex items-center gap-2 px-4 py-2 cursor-pointer border rounded-md font-medium text-[13px] transition-all shadow-sm ${isLayoutMenuOpen ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30'}`}
        >
          <LayoutGrid size={16} /> Auto Layout
        </button>

        {isLayoutMenuOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[200] flex flex-col overflow-hidden py-1">
            {[
              { id: 'tree', label: 'Tree (FSM)' },
              { id: 'circle', label: 'Circle (Cyclic)' },
              { id: 'grid', label: 'Grid (Table)' },
            ].map(layout => (
              <button
                key={layout.id}
                onClick={() => {
                  autoLayout(layout.id as any);
                  setIsLayoutMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span className="flex-1 text-left">{layout.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

      {(() => {
        const getArrowBtnClass = (type: string) => `p-2 transition-colors ${pendingArrowType === type ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-md' : 'hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm'}`;
        return (
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden text-slate-600 dark:text-slate-300 px-0.5">
            <button onClick={() => setPendingArrowType('association')} className={getArrowBtnClass('association')} title="Association"><ArrowRight size={16} /></button>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
            <button onClick={() => setPendingArrowType('inheritance')} className={getArrowBtnClass('inheritance')} title="Inheritance"><ArrowRightFromLine size={16} /></button>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
            <button onClick={() => setPendingArrowType('realization')} className={getArrowBtnClass('realization')} title="Realization"><MoreHorizontal size={16} /></button>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
            <button onClick={() => setPendingArrowType('composition')} className={getArrowBtnClass('composition')} title="Composition"><Layers size={16} /></button>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
            <button onClick={() => setPendingArrowType('aggregation')} className={getArrowBtnClass('aggregation')} title="Aggregation"><GripHorizontal size={16} /></button>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
            <button onClick={() => setPendingArrowType('line')} className={getArrowBtnClass('line')} title="Simple Line"><Minus size={16} /></button>
          </div>
        );
      })()}

      <div className="flex-grow"></div>

      <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleLoadProject} />
      <button onClick={() => fileInputRef.current?.click()} className={btnClass} title="Load Project">
        <Upload size={16} /> Load
      </button>
      <button onClick={handleSaveProject} className={btnClass} title="Save Project">
        <Download size={16} /> Save Local
      </button>

      <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

      <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 cursor-pointer border rounded-md font-medium text-[13px] transition-all shadow-sm bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 hover:border-emerald-600 ml-auto">
        <Camera size={16} /> Export Image
      </button>

      <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

      <button onClick={() => setIsHelpOpen(true)} className={btnClass} title="Help & Shortcuts">
        <HelpCircle size={16} />
      </button>

      <button onClick={() => setIsVerilogOpen(true)} className={btnClass} title="FSM Verilog Studio">
        <Cpu size={16} /> FSM Studio
      </button>

      <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

      <button onClick={toggleRightPanel} className={`${btnClass} ${isRightPanelOpen ? 'bg-slate-100 dark:bg-slate-700' : ''}`} title="Toggle Properties Panel">
        <PanelRight size={16} />
      </button>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <VerilogModal isOpen={isVerilogOpen} onClose={() => setIsVerilogOpen(false)} />
    </div>
  );
};