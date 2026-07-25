import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getRoundedPolygonString } from '../store/utils'
import type { UmlClassType } from '../store/types';
import { X, GripVertical, Star, Zap, Shield, CheckCircle, AlertTriangle, Info, Minus, Plus } from 'lucide-react';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface UmlClassProps {
  cls: UmlClassType;
}

export const UmlClass: React.FC<UmlClassProps> = ({ cls }) => {
  const {
    selectedIds, selectElement, deleteClass, updateClass,
    addItem, updateItem, deleteItem, startDrag, dragState, updateClassHeight, openContextMenu, zoom, editingPolygonId, setEditingPolygonId, commitHistory, alignKeyId, setAlignKeyId, settings
  } = useStore();

  const classRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedIds.includes(cls.id);
  const isDragging = dragState.targetId === cls.id && dragState.type === 'class';
  const isTextBox = cls.type === 'text';
  const isClassType = !cls.type || cls.type === 'class';
  const isComment = cls.type === 'comment';
  const isPolygon = cls.type === 'polygon';
  const isImage = cls.type === 'image';
  const isShape = cls.type === 'shape';
  const isDraggingVertex = dragState.targetId === cls.id && dragState.type === 'polygon-vertex';
  const isResizing = dragState.targetId === cls.id && dragState.type === 'class-resize';
  const isDrawingItem = dragState.targetId === cls.id && dragState.type === 'draw-item';
  const isRotating = dragState.targetId === cls.id && dragState.type === 'class-rotate';
  const isPanelSlider = dragState.targetId === cls.id && dragState.type === 'panel-slider';
  const isFsmState = cls.type === 'fsm_state';
  const [isEditingText, setIsEditingText] = useState(false);
  const isAlignKey = alignKeyId === cls.id && selectedIds.length > 1;

  useEffect(() => {
    if (classRef.current) {
      const actualHeight = classRef.current.offsetHeight;
      const actualWidth = classRef.current.offsetWidth;
      let needsUpdate = false;
      const updates: Partial<UmlClassType> = {};
      if (actualHeight !== cls.height) {
        updates.height = actualHeight;
        needsUpdate = true;
      }
      if (isComment && actualWidth !== cls.width) {
        updates.width = actualWidth;
        if (cls.textAlign === 'center') {
          updates.x = cls.x - (actualWidth - cls.width) / 2;
        } else if (cls.textAlign === 'right') {
          updates.x = cls.x - (actualWidth - cls.width);
        }
        needsUpdate = true;
      }
      if (needsUpdate && !isPolygon && !isImage && !isShape) {
        updateClass(cls.id, updates);
      }
    }
  }, [cls.items.length, cls.width, cls.height, cls.id, cls.content, cls.fontSize, isEditingText, updateClass, isComment, isPolygon, isImage, cls.textAlign, cls.x]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // نادیده گرفتن راست‌کلیک در هندلرهای کلیک چپ
    if (editingPolygonId && editingPolygonId !== cls.id) setEditingPolygonId(null);

    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.classList.contains('resize-handle')) return;

    if (e.detail === 2) {
      selectElement(cls.id, false, true);
    } else if (e.ctrlKey || e.metaKey) {
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') e.preventDefault(); // جلوگیری از فوکوس روی تکست‌باکس حین انتخاب گروهی
      selectElement(cls.id, true);
    } else {
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        const isExclusivelySelected = selectedIds.length === 1 && selectedIds[0] === cls.id;
        if (selectedIds.length > 1 && selectedIds.includes(cls.id)) {
          setAlignKeyId(cls.id);
        } else if (!isExclusivelySelected) {
          selectElement(cls.id, false);
        }
      } else if (!selectedIds.includes(cls.id)) {
        selectElement(cls.id, false);
      }
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    if (editingPolygonId && editingPolygonId !== cls.id) setEditingPolygonId(null);

    if (e.detail === 2) {
      selectElement(cls.id, false, true);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      selectElement(cls.id, true);
      return;
    }

    if (selectedIds.length > 1 && selectedIds.includes(cls.id)) {
      setAlignKeyId(cls.id);
    } else {
      const isExclusivelySelected = selectedIds.length === 1 && selectedIds[0] === cls.id;
      if (!isExclusivelySelected) {
        selectElement(cls.id, false);
      }
    }

    if (classRef.current) {
      const rect = classRef.current.getBoundingClientRect();
      startDrag({
        targetId: cls.id,
        type: 'class',
        offsetX: (e.clientX - rect.left) / zoom,
        offsetY: (e.clientY - rect.top) / zoom,
        startX: e.clientX,
        startY: e.clientY,
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(cls.id)) selectElement(cls.id, e.ctrlKey || e.metaKey);
    startDrag({
      targetId: cls.id,
      type: 'class-resize',
      startX: e.clientX,
      startY: e.clientY,
      offsetX: cls.width, // store initial width in offsetX for resizing
      offsetY: cls.height || 100,
    });
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(cls.id)) selectElement(cls.id, e.ctrlKey || e.metaKey);
    startDrag({
      targetId: cls.id,
      type: 'class-rotate',
      startX: e.clientX,
      startY: e.clientY
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(cls.id)) selectElement(cls.id, e.ctrlKey || e.metaKey);
    const canvas = document.getElementById('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (editingPolygonId === cls.id) {
        const classRect = classRef.current!.getBoundingClientRect();
        const localX = (e.clientX - classRect.left) / zoom;
        const localY = (e.clientY - classRect.top) / zoom;
        openContextMenu({
          type: 'polygon-edge',
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          targetId: cls.id,
          clickPos: { x: localX, y: localY }
        });
        return;
      }
      openContextMenu({
        type: 'class',
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        targetId: cls.id
      });
    }
  };

  // Color Themes
  const defaultColor = isTextBox ? 'yellow' : 'slate';
  const color = cls.color || defaultColor;

  const themeStyles: Record<string, { bg: string, header: string, border: string }> = {
    slate: { bg: 'bg-white dark:bg-slate-800', header: 'bg-slate-100 dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700' },
    yellow: { bg: 'bg-amber-100 dark:bg-yellow-500', header: 'bg-amber-200 dark:bg-yellow-600', border: 'border-amber-300 dark:border-yellow-500/70' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900', header: 'bg-blue-100 dark:bg-blue-800', border: 'border-blue-200 dark:border-blue-700' },
    green: { bg: 'bg-emerald-50 dark:bg-emerald-900', header: 'bg-emerald-100 dark:bg-emerald-800', border: 'border-emerald-200 dark:border-emerald-700' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900', header: 'bg-rose-100 dark:bg-rose-800', border: 'border-rose-200 dark:border-rose-700' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900', header: 'bg-purple-100 dark:bg-purple-800', border: 'border-purple-200 dark:border-purple-700' },
    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900', header: 'bg-cyan-100 dark:bg-cyan-800', border: 'border-cyan-200 dark:border-cyan-700' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900', header: 'bg-orange-100 dark:bg-orange-800', border: 'border-orange-200 dark:border-orange-700' },
  };

  const theme = themeStyles[color] || themeStyles.slate;

  const badgeThemes: Record<string, string> = {
    slate: 'bg-slate-200 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
    yellow: 'bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400',
    blue: 'bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400',
    green: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400',
    rose: 'bg-rose-200 text-rose-800 dark:bg-rose-900/50 dark:text-rose-400',
    purple: 'bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400',
  };

  const themeOpacityMap: Record<string, string> = {
    slate: '#64748b',
    yellow: '#eab308',
    blue: '#3b82f6',
    green: '#10b981',
    rose: '#f43f5e',
    purple: '#a855f7',
    cyan: '#06b6d4',
    orange: '#f97316',
  };

  const getRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const renderBadgeIcon = (icon: string) => {
    switch (icon) {
      case 'star': return <Star size={12} />;
      case 'zap': return <Zap size={12} />;
      case 'shield': return <Shield size={12} />;
      case 'check': return <CheckCircle size={12} />;
      case 'alert': return <AlertTriangle size={12} />;
      case 'info': return <Info size={12} />;
      default: return null;
    }
  };

  if (isFsmState) {
    const w = cls.width || 140;
    const isSigVisible = cls.signalsVisible !== false;
    const sigMode = cls.signalMode || 'issued';
    const colorHex = cls.color === 'yellow' ? '#eab308' : cls.color === 'green' ? '#10b981' : cls.color === 'rose' ? '#f43f5e' : '#3b82f6';

    return (
      <div
        ref={classRef}
        id={cls.id}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        className={`absolute flex flex-col items-center z-10 
          ${isAlignKey ? 'ring-4 ring-red-500/50 z-20' : (isSelected ? 'ring-4 ring-blue-500/50 z-20' : '')}
          ${isDragging ? 'cursor-grabbing opacity-80' : ''}
        `}
        style={{ left: cls.x, top: cls.y, width: w }}
        dir="ltr"
      >
        <div className="relative flex flex-col items-center w-full">
          {/* دایره اصلی استیت */}
          <div
            onMouseDown={handleDragStart}
            onDoubleClick={(e) => { if (e.detail === 2) selectElement(cls.id, false, true); }}
            className="w-full rounded-full flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing transition-all"
            style={{
              height: w,
              minHeight: 100,
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: `4px solid ${colorHex}`,
              boxShadow: `0 4px 14px 0 ${colorHex}33`
            }}
          >
            <input
              type="text"
              value={cls.name}
              onChange={(e) => updateClass(cls.id, { name: e.target.value })}
              onFocus={() => { if (!selectedIds.includes(cls.id)) selectElement(cls.id); }}
              onBlur={() => commitHistory()}
              className="bg-transparent text-center text-white font-bold text-sm outline-none w-4/5 focus:bg-white/10 rounded transition-colors px-2 py-1"
              placeholder="STATE_NAME"
            />
          </div>

          {/* دکمه مخفی کردن/نمایش سیگنال‌ها */}
          <button
            onClick={(e) => { e.stopPropagation(); updateClass(cls.id, { signalsVisible: !isSigVisible }); commitHistory(); }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-slate-800 border-2 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-colors z-20 shadow-md"
            style={{ borderColor: colorHex }}
            title={isSigVisible ? "Hide Signals" : "Show Signals"}
          >
            {isSigVisible ? <Minus size={12} /> : <Plus size={12} />}
          </button>

          {/* کارت سیگنال‌ها (حالت‌دار و شیشه‌ای) */}
          {isSigVisible && (
            <div className="w-full mt-5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg p-2 shadow-md backdrop-blur-sm flex flex-col gap-2">

              {/* سوییچر بین Issued و All Signals */}
              <div className="flex bg-slate-200 dark:bg-slate-900 rounded p-0.5 gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); updateClass(cls.id, { signalMode: 'issued' }); }}
                  className={`flex-1 text-[10px] py-1 rounded font-bold transition-colors ${sigMode === 'issued' ? 'bg-blue-500 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                >
                  Issued Signals
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updateClass(cls.id, { signalMode: 'all' }); }}
                  className={`flex-1 text-[10px] py-1 rounded font-bold transition-colors ${sigMode === 'all' ? 'bg-purple-500 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                >
                  All Signals (Adv)
                </button>
              </div>

              <textarea
                value={(sigMode === 'issued' ? cls.issuedSignals : cls.allSignals) || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (sigMode === 'issued') updateClass(cls.id, { issuedSignals: val });
                  else updateClass(cls.id, { allSignals: val });
                }}
                onFocus={() => { if (!selectedIds.includes(cls.id)) selectElement(cls.id); }}
                onBlur={() => commitHistory()}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-full bg-transparent text-[11px] font-mono outline-none resize-none min-h-[40px] ${sigMode === 'issued' ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}
                rows={3}
                placeholder={sigMode === 'issued' ? 'e.g. out_valid = 1' : 'e.g. counter = 0'}
              />
            </div>
          )}
        </div>

        {/* دستگیره تغییر سایز */}
        {isSelected && (
          <div
            onMouseDown={handleResizeStart}
            className="resize-handle absolute -right-2 bottom-0 w-4 h-4 cursor-nwse-resize z-20"
          >
            <div className="absolute right-1 bottom-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm shadow-sm"></div>
          </div>
        )}
      </div>
    );
  }

  if (isPolygon && cls.vertices) {
    const fillColor = themeOpacityMap[color] || themeOpacityMap.slate;

    return (
      <div
        ref={classRef}
        id={cls.id}
        className={`absolute pointer-events-none z-[-7] ${isSelected ? 'z-[-6]' : ''} ${isDragging ? 'cursor-grabbing opacity-80' : ''}`}
        style={{
          left: cls.x, top: cls.y, width: cls.width, height: cls.height, transform: `rotate(${cls.rotation || 0}deg)`
        }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        {isSelected && selectedIds.length === 1 && (
          <div onMouseDown={handleRotateStart} className="absolute left-1/2 -top-8 w-6 h-6 -translate-x-1/2 cursor-crosshair flex flex-col items-center justify-center z-20 pointer-events-auto group">
            <div className="w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
            <div className="w-[1.5px] h-4 bg-blue-500 mt-0.5 opacity-50"></div>
          </div>
        )}
        <svg className="w-full h-full overflow-visible pointer-events-none">
          <path
            d={getRoundedPolygonString(cls.vertices, cls.borderRadius || 0)}
            fill={fillColor}
            fillOpacity={cls.fillOpacity ?? 0.2}
            stroke={isAlignKey ? '#ef4444' : (cls.strokeStyle !== 'none' ? fillColor : 'none')}
            strokeWidth={isAlignKey ? 3 : 2}
            strokeDasharray={cls.strokeStyle === 'dashed' ? '8,8' : 'none'}
            className={`pointer-events-auto cursor-move ${isAlignKey ? 'stroke-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : (isSelected ? 'stroke-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'hover:drop-shadow-md')} ${isDragging ? 'drop-shadow-2xl' : ''}`}
            onMouseDown={handleDragStart}
            onContextMenu={handleContextMenu}
          />
          {editingPolygonId === cls.id && cls.vertices.map((v, i) => (
            <circle
              key={i}
              cx={v.x}
              cy={v.y}
              r={5 / zoom}
              className="fill-white stroke-blue-500 stroke-2 pointer-events-auto cursor-pointer hover:scale-150 transition-transform origin-center"
              style={{ transformOrigin: `${v.x}px ${v.y}px` }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startDrag({
                  targetId: cls.id,
                  type: 'polygon-vertex',
                  subTarget: i.toString(),
                  startX: e.clientX,
                  startY: e.clientY
                });
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const canvas = document.getElementById('canvas');
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  openContextMenu({
                    type: 'polygon-vertex',
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    targetId: cls.id,
                    subTarget: i.toString()
                  });
                }
              }}
            />
          ))}
        </svg>
      </div>
    );
  }

  if (isShape) {
    const fillColor = themeOpacityMap[color] || themeOpacityMap.slate;
    const fillOpacity = cls.fillOpacity ?? 0.2;
    const strokeStyle = isAlignKey ? '#ef4444' : (cls.strokeStyle !== 'none' ? fillColor : 'none');
    const strokeWidth = isAlignKey ? 3 : 2;
    const strokeDasharray = cls.strokeStyle === 'dashed' ? '8,8' : 'none';
    const rx = cls.borderRadius || 0;

    let shapeSvg = null;
    if (cls.shapeType === 'rectangle') {
      shapeSvg = <rect x={0} y={0} width={cls.width} height={cls.height} rx={rx} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeStyle} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} />;
    } else if (cls.shapeType === 'ellipse') {
      shapeSvg = <ellipse cx={cls.width / 2} cy={cls.height / 2} rx={Math.max(0.1, cls.width / 2 - 1)} ry={Math.max(0.1, cls.height / 2 - 1)} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeStyle} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} />;
    } else if (cls.shapeType === 'cloud') {
      shapeSvg = (
        <svg width={cls.width} height={cls.height} viewBox="8 30 80 47" preserveAspectRatio="none">
          <path d="M 25 75 A 15 15 0 0 1 25 45 A 25 25 0 0 1 65 40 A 15 15 0 0 1 85 55 A 15 15 0 0 1 75 75 Z"
            fill={fillColor} fillOpacity={fillOpacity} stroke={strokeStyle} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    } else if (cls.shapeType === 'regularPolygon') {
      const sides = cls.sides || 3;
      const cx = cls.width / 2;
      const cy = cls.height / 2;
      const r = Math.min(cls.width, cls.height) / 2 - 1;
      const pts = [];
      const startAngle = -Math.PI / 2;
      for (let i = 0; i < sides; i++) {
        const angle = startAngle + (i * 2 * Math.PI / sides);
        pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      shapeSvg = <path d={getRoundedPolygonString(pts, rx)} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeStyle} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} />;
    }

    return (
      <div
        ref={classRef}
        id={cls.id}
        className={`absolute pointer-events-none z-[-7] ${isSelected ? 'z-[-6]' : ''} ${isDragging ? 'cursor-grabbing opacity-80' : ''}`}
        style={{ left: cls.x, top: cls.y, width: cls.width, height: cls.height, transform: `rotate(${cls.rotation || 0}deg)` }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        {isSelected && selectedIds.length === 1 && (
          <div onMouseDown={handleRotateStart} className="absolute left-1/2 -top-8 w-6 h-6 -translate-x-1/2 cursor-crosshair flex flex-col items-center justify-center z-20 pointer-events-auto group">
            <div className="w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
            <div className="w-[1.5px] h-4 bg-blue-500 mt-0.5 opacity-50"></div>
          </div>
        )}
        <svg className="w-full h-full overflow-visible pointer-events-none">
          <g className={`pointer-events-auto cursor-move ${isAlignKey ? 'stroke-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : (isSelected ? 'stroke-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'hover:drop-shadow-md')} ${isDragging ? 'drop-shadow-2xl' : ''}`}
            onMouseDown={handleDragStart}
            onContextMenu={handleContextMenu}
          >
            {shapeSvg}
          </g>
        </svg>
        {isSelected && (
          <div
            onMouseDown={handleResizeStart}
            className="resize-handle absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize z-20 pointer-events-auto"
          >
            <div className="absolute right-1 bottom-1 w-2 h-2 border-r-2 border-b-2 border-slate-500 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"></div>
          </div>
        )}
      </div>
    );
  }

  if (isImage) {
    return (
      <div
        ref={classRef}
        id={cls.id}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        className={`absolute flex flex-col z-10
          ${isAlignKey ? 'ring-4 ring-red-500/50 z-20 border-2 border-red-500' : (isSelected ? 'ring-4 ring-blue-500/50 z-20' : 'shadow-md')}
          ${isDragging ? 'cursor-grabbing opacity-80 shadow-2xl' : ''}
        `}
        style={{
          left: cls.x,
          top: cls.y,
          width: cls.width,
          height: cls.height,
          borderRadius: cls.borderRadius || 0,
          backgroundImage: `url(${cls.imageUrl})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: `rotate(${cls.rotation || 0}deg)`
        }}
      >
        {isSelected && selectedIds.length === 1 && (
          <div onMouseDown={handleRotateStart} className="absolute left-1/2 -top-8 w-6 h-6 -translate-x-1/2 cursor-crosshair flex flex-col items-center justify-center z-20 pointer-events-auto group">
            <div className="w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
            <div className="w-[1.5px] h-4 bg-blue-500 mt-0.5 opacity-50"></div>
          </div>
        )}
        <div
          onMouseDown={handleDragStart}
          onDoubleClick={(e) => { if (e.detail === 2) selectElement(cls.id, false, true); }}
          className="w-full h-full absolute top-0 left-0 cursor-move rounded-[inherit]"
        />
        {isSelected && (
          <div
            onMouseDown={handleResizeStart}
            className="resize-handle absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize z-20"
          >
            <div className="absolute right-1 bottom-1 w-2 h-2 border-r-2 border-b-2 border-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"></div>
          </div>
        )}
      </div>
    );
  }

  const commentOpacity = cls.fillOpacity ?? 0;
  const commentColorHex = themeOpacityMap[color] || themeOpacityMap.slate;
  const commentBgColor = getRgba(commentColorHex, commentOpacity);
  const commentBorderStyle = cls.strokeStyle || 'none';

  return (
    <div
      ref={classRef}
      id={cls.id}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      className={`absolute flex flex-col rounded-lg transition-[box-shadow,border-color] duration-200 z-10 
        ${isComment
          ? `border ${isAlignKey ? 'border-red-500 ring-2 ring-red-500/30 z-20' : (isSelected ? 'border-blue-500 ring-2 ring-blue-500/30 z-20' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600')}`
          : `${theme.bg} ${isAlignKey ? 'border-2 border-red-500 ring-4 ring-red-500/30 z-20' : (isSelected ? 'border-2 border-blue-500 ring-4 ring-blue-500/30 z-20' : `border ${theme.border} shadow-md`)}`
        }
        ${isDragging ? 'cursor-grabbing opacity-80 shadow-2xl' : ''}
      `}
      style={{
        left: cls.x,
        top: cls.y,
        width: isComment ? 'max-content' : cls.width,
        minWidth: isComment ? 20 : 150,
        ...(isComment ? {
          backgroundColor: commentBgColor,
          borderStyle: commentBorderStyle === 'none' ? undefined : commentBorderStyle,
          borderWidth: commentBorderStyle === 'none' ? undefined : '2px',
          borderColor: commentBorderStyle === 'none' ? undefined : (isSelected ? '#3b82f6' : commentColorHex),
          borderRadius: cls.borderRadius !== undefined ? `${cls.borderRadius}px` : undefined,
        } : {
          borderRadius: cls.borderRadius !== undefined ? `${cls.borderRadius}px` : undefined,
        }),
        transform: `rotate(${cls.rotation || 0}deg)`
      }}
      dir={settings.isRTL ? 'rtl' : 'ltr'}
    >
      {isSelected && selectedIds.length === 1 && !isTextBox && !isClassType && (
        <div onMouseDown={handleRotateStart} className="absolute left-1/2 -top-8 w-6 h-6 -translate-x-1/2 cursor-crosshair flex flex-col items-center justify-center z-20 pointer-events-auto group">
          <div className="w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
          <div className="w-[1.5px] h-4 bg-blue-500 mt-0.5 opacity-50"></div>
        </div>
      )}
      {/* Header */}
      {!isComment && (
        <div className={`${theme.header} px-3 py-2 border-b ${theme.border} flex items-center gap-1.5 rounded-t-lg relative`}>
          <span
            onMouseDown={handleDragStart}
            className={`cursor-grab active:cursor-grabbing text-slate-500 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded transition-colors ${isSelected ? 'block' : 'hidden pointer-events-none'}`}
          >
            <GripVertical size={16} />
          </span>

          {cls.badge && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${badgeThemes[cls.badge.color] || badgeThemes.slate}`}>
              {renderBadgeIcon(cls.badge.icon)}
              <span className="max-w-[80px] truncate">{cls.badge.text}</span>
            </div>
          )}

          <input
            type="text"
            value={cls.name}
            onChange={(e) => updateClass(cls.id, { name: e.target.value })}
            onFocus={() => { if (!selectedIds.includes(cls.id)) selectElement(cls.id); }}
            onBlur={() => commitHistory()}
            className="font-semibold border border-transparent bg-transparent flex-grow text-sm outline-none text-start px-1 py-0.5 rounded text-slate-900 dark:text-slate-50 w-full box-border focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Body */}
      <div className={`flex flex-col gap-0 ${isTextBox || isComment ? 'bg-transparent' : theme.bg} ${!isComment ? 'rounded-b-lg' : 'rounded-lg'} relative`}
        style={{
          padding: `${isComment ? (cls.paddingY ?? 10) : 10}px ${isComment ? (cls.paddingX ?? 10) : 10}px`
        }}
        onMouseDown={(e) => {
          if ((isTextBox || isComment) && !isEditingText && e.detail >= 2) {
            e.preventDefault();
            e.stopPropagation();
            const isExclusivelySelected = selectedIds.length === 1 && selectedIds[0] === cls.id;
            if (cls.groupId && !isExclusivelySelected) {
              selectElement(cls.id, false, true);
            } else {
              setIsEditingText(true);
            }
          } else if (isComment && !isEditingText) {
            handleDragStart(e);
          }
        }}
      >
        {(isTextBox || isComment) ? (
          <div
            className={`w-full min-h-[20px] text-slate-800 dark:text-slate-200 cursor-text`}
            style={{
              fontSize: (isComment ? (cls.fontSize || 14) : 13.5) * (settings.fontFamily === 'NewCMLocal' ? 1.3 : 1),
              lineHeight: settings.fontFamily === 'NewCMLocal' ? '1.3' : '1.625',
              textAlign: cls.textAlign || (settings.isRTL ? 'right' : 'left')
            }}
          >
            {isEditingText ? (
              <textarea
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                    if (isComment) {
                      el.style.width = 'auto';
                      el.style.width = (el.scrollWidth + 10) + 'px';
                    }
                  }
                }}
                style={{ textAlign: cls.textAlign || (settings.isRTL ? 'right' : 'left'), lineHeight: 'inherit' }}
                className={`outline-none resize-none rounded overflow-hidden ${isComment ? 'whitespace-pre bg-transparent border-transparent focus:ring-0 p-0' : 'w-full bg-white dark:bg-slate-900 border border-blue-500 focus:ring-2 focus:ring-blue-500/20 p-1.5'}`}
                value={cls.content || ''}
                rows={1}
                autoFocus
                onFocus={() => { if (!selectedIds.includes(cls.id)) selectElement(cls.id); }}
                onChange={(e) => updateClass(cls.id, { content: e.target.value })}
                onBlur={() => { setIsEditingText(false); commitHistory(); }}
                onMouseDown={(e) => e.stopPropagation()} // Allow text selection
              />
            ) : (
              <div
                className={`w-full h-full text-black ${(color === 'yellow' && isTextBox) ? 'dark:text-black' : 'dark:text-white'} ${isComment ? '' : ''} ${!isComment ? 'p-1' : ''}`}
                style={{ textAlign: cls.textAlign || (settings.isRTL ? 'right' : 'left'), lineHeight: 'inherit' }}
              >
                {cls.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-2 mb-2 border-b border-black/10 dark:border-white/20 pb-1 w-full" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-2 mb-1 border-b border-black/10 dark:border-white/20 pb-1 w-full" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-1 w-full" {...props} />,
                      hr: ({ node, ...props }) => <hr className="my-2 p-0 m-0 border-black/20 dark:border-white/20" {...props} />,
                      a: ({ node, ...props }) => <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-1 min-h-[1rem]" {...props} />,
                      blockquote: ({ node, ...props }) => <blockquote className={`my-2 py-1 px-3 bg-black/5 dark:bg-white/5 italic ${settings.isRTL ? 'border-r-4 border-black/20 dark:border-white/20' : 'border-l-4 border-black/20 dark:border-white/20'}`} {...props} />,
                      ul: ({ node, ...props }) => <ul className={`list-disc mb-1 ${settings.isRTL ? 'pr-5' : 'pl-5'}`} {...props} />,
                      ol: ({ node, ...props }) => <ol className={`list-decimal mb-1 ${settings.isRTL ? 'pr-5' : 'pl-5'}`} {...props} />,
                      table: ({ node, ...props }) => <table className="border-collapse border border-black/20 dark:border-white/20 my-2 w-full text-sm" {...props} />,
                      th: ({ node, ...props }) => <th className="border border-black/20 dark:border-white/20 px-2 py-1 bg-black/5 dark:bg-white/5" {...props} />,
                      td: ({ node, ...props }) => <td className="border border-black/20 dark:border-white/20 px-2 py-1" {...props} />,
                      code: ({ node, className, children, ...props }: any) => {
                        const isInline = !className || !className.includes('language-');
                        return <code dir="ltr" style={{ unicodeBidi: 'isolate' }} className={`${isInline ? 'bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[0.9em]' : 'block bg-black/10 dark:bg-white/10 p-2 rounded font-mono whitespace-pre overflow-x-auto text-[0.9em] my-1 text-left'}`} {...props}>{children}</code>;
                      }
                    }}
                  >
                    {cls.content}
                  </ReactMarkdown>
                ) : (
                  <span className="text-slate-400 italic">Double click to edit...</span>
                )}
              </div>
            )}
          </div>
        ) : (
          cls.items.map(item => (
            <div key={item.id} className="flex items-center gap-2 relative group">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(cls.id, item.id, e.target.value)}
                onFocus={() => { if (!selectedIds.includes(cls.id)) selectElement(cls.id); }}
                onBlur={() => commitHistory()}
                className={`flex-grow border border-transparent rounded outline-none font-mono text-[13px] px-1.5 py-0.5 w-full box-border bg-transparent text-slate-900 ${color === 'yellow' ? 'dark:text-black dark:focus:text-white' : 'dark:text-white'} focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 transition-all`}
              />
              {isSelected && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteItem(cls.id, item.id); }}
                  className={`text-slate-500 ${color === 'yellow' ? 'text-slate-500' : 'text-slate-300'} hover:text-red-500 hover:bg-red-500/10 p-1 rounded font-bold h-6 w-6 flex items-center justify-center transition-colors`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        )}

        {/* Resize Handle */}
        {isSelected && !isComment && (
          <div
            onMouseDown={handleResizeStart}
            className="resize-handle absolute right-0 bottom-0 w-4 h-4 cursor-ew-resize z-20"
          >
            <div className="absolute right-1 bottom-1 w-1.5 h-1.5 border-r-2 border-b-2 border-slate-300 dark:border-slate-600"></div>
          </div>
        )}
      </div>

      {/* Add Button (Floated Outside so it doesn't affect actual height) */}
      {isSelected && !isTextBox && !isComment && (
        <button
          onClick={(e) => { e.stopPropagation(); addItem(cls.id); }}
          className="absolute top-full mt-2 left-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-sm border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 p-1.5 rounded-md cursor-pointer text-xs w-full hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-50 transition-all z-20"
        >
          + Add Property / Method
        </button>
      )}
    </div>
  );
};