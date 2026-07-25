import React from 'react';
import { useStore } from '../store/useStore';
import { getAttachedPos, getOffsetPos } from '../store/utils';
import type { UmlArrowType, Point } from '../store/types';
import { X } from 'lucide-react';

const getRoundedPathString = (pts: Point[], radius: number): string => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    let p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    let d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    let d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    let r = Math.min(radius, d1 / 2, d2 / 2);

    if (r > 0) {
      let pA = { x: p1.x + (p0.x - p1.x) * r / d1, y: p1.y + (p0.y - p1.y) * r / d1 };
      let pB = { x: p1.x + (p2.x - p1.x) * r / d2, y: p1.y + (p2.y - p1.y) * r / d2 };
      d += ` L ${pA.x} ${pA.y} Q ${p1.x} ${p1.y} ${pB.x} ${pB.y}`;
    } else {
      d += ` L ${p1.x} ${p1.y}`;
    }
  }
  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
};

const THEME_COLORS = [
  { name: 'slate', fill: 'fill-slate-500 dark:fill-slate-400', stroke: 'stroke-slate-500 dark:stroke-slate-400' },
  { name: 'yellow', fill: 'fill-amber-500 dark:fill-amber-400', stroke: 'stroke-amber-500 dark:stroke-amber-400' },
  { name: 'blue', fill: 'fill-blue-500 dark:fill-blue-400', stroke: 'stroke-blue-500 dark:stroke-blue-400' },
  { name: 'green', fill: 'fill-emerald-500 dark:fill-emerald-400', stroke: 'stroke-emerald-500 dark:stroke-emerald-400' },
  { name: 'rose', fill: 'fill-rose-500 dark:fill-rose-400', stroke: 'stroke-rose-500 dark:stroke-rose-400' },
  { name: 'purple', fill: 'fill-purple-500 dark:fill-purple-400', stroke: 'stroke-purple-500 dark:stroke-purple-400' },
];

export const SvgLayer: React.FC = () => {
  const { arrows, selectedIds, selectElement, startDrag, deleteArrow, updateArrow, classes, openContextMenu, commitHistory, settings } = useStore();

  const handleDragSegment = (e: React.MouseEvent, arrow: UmlArrowType, segmentIndex: number) => {
    if (e.button !== 0) return;

    e.preventDefault();

    if (e.detail === 2) {
      selectElement(arrow.id, false, true);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      selectElement(arrow.id, true);
    } else {
      const isExclusivelySelected = selectedIds.length === 1 && selectedIds[0] === arrow.id;
      if (!isExclusivelySelected) {
        selectElement(arrow.id, false);
      }
    }

    startDrag({
      targetId: arrow.id,
      type: 'arrow-segment',
      subTarget: segmentIndex.toString(),
      startX: e.clientX,
      startY: e.clientY
    });
  };

  const handleDragPoint = (e: React.MouseEvent, arrowId: string, pointType: 'start' | 'end' | 'cp', index?: number) => {
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.detail === 2) {
      selectElement(arrowId, false, true);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      selectElement(arrowId, true);
    } else {
      const isExclusivelySelected = selectedIds.length === 1 && selectedIds[0] === arrowId;
      if (!isExclusivelySelected) {
        selectElement(arrowId, false);
      }
    }

    startDrag({
      targetId: arrowId,
      type: pointType,
      subTarget: index !== undefined ? index.toString() : null
    });
  };

  const handleDragLabel = (e: React.MouseEvent, arrow: UmlArrowType, labelKey: 'startLabel' | 'middleLabel' | 'endLabel') => {
    // If it's editable and focused, don't drag
    if ((e.target as HTMLElement).isContentEditable) {
      e.stopPropagation();
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();

    if (e.detail === 2) return;

    if (e.ctrlKey || e.metaKey) {
      selectElement(arrow.id, true);
    } else {
      const isExclusivelySelected = selectedIds.length === 1 && selectedIds[0] === arrow.id;
      if (!isExclusivelySelected) {
        selectElement(arrow.id, false);
      }
    }

    startDrag({
      targetId: arrow.id,
      type: 'label',
      subTarget: labelKey,
      startX: e.clientX,
      startY: e.clientY,
      initialPositions: {
        [arrow.id]: {
          offsetX: arrow[`${labelKey}Offset`].x,
          offsetY: arrow[`${labelKey}Offset`].y
        }
      }
    });
  };

  const handleContextMenu = (e: React.MouseEvent, arrow: UmlArrowType, segmentIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(arrow.id)) selectElement(arrow.id, e.ctrlKey || e.metaKey);
    const canvas = document.getElementById('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      openContextMenu({
        type: 'arrow',
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        targetId: arrow.id,
        subTarget: segmentIndex !== undefined ? segmentIndex.toString() : undefined
      });
    }
  };

  return (
    <>
      <svg id="svg-layer" width="100%" height="100%" style={{ overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg" className="w-full h-full absolute top-0 left-0 pointer-events-none z-[1]">
        <defs>
          {THEME_COLORS.map(theme => (
            <React.Fragment key={theme.name}>
              <marker id={`arrow-${theme.name}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className={theme.fill} />
              </marker>
              <marker id={`inheritance-${theme.name}`} viewBox="0 0 14 14" refX="14" refY="7" markerWidth="10" markerHeight="10" orient="auto">
                <path d="M 1 1 L 13 7 L 1 13 z" className={`fill-white dark:fill-slate-800 ${theme.stroke} stroke-[1.5px]`} />
              </marker>
              <marker id={`composition-${theme.name}`} viewBox="0 0 20 10" refX="20" refY="5" markerWidth="12" markerHeight="12" orient="auto">
                <path d="M 10 0 L 20 5 L 10 10 L 0 5 z" className={theme.fill} />
              </marker>
              <marker id={`aggregation-${theme.name}`} viewBox="0 0 20 10" refX="20" refY="5" markerWidth="12" markerHeight="12" orient="auto">
                <path d="M 10 1 L 19 5 L 10 9 L 1 5 z" className={`fill-white dark:fill-slate-800 ${theme.stroke} stroke-[1.5px]`} />
              </marker>
            </React.Fragment>
          ))}
        </defs>

        {arrows.map(arr => {
          const isSelected = selectedIds.includes(arr.id);

          const startPt = getAttachedPos(classes, arr.start.attachedTo, arr.start.anchorIndex, arr.start);
          const endPt = getAttachedPos(classes, arr.end.attachedTo, arr.end.anchorIndex, arr.end);
          const controlPoints = arr.controlPoints || [];

          let pts = [startPt, ...controlPoints, endPt];

          if (arr.start.attachedTo === arr.end.attachedTo && controlPoints.length === 0) {
            const cls = classes.find(c => c.id === arr.start.attachedTo);
            if (cls) {
              const cx = cls.x + cls.width / 2;
              const cy = cls.y + (cls.height || 100) / 2;
              const dx = startPt.x - cx;
              const dy = startPt.y - cy;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len, uy = dy / len;
              const px = -uy, py = ux;

              const offset = Math.max(40, cls.width * 0.4);
              const cp1 = { x: startPt.x + ux * offset + px * offset, y: startPt.y + uy * offset + py * offset };
              const cp2 = { x: endPt.x + ux * offset - px * offset, y: endPt.y + uy * offset - py * offset };

              pts = [startPt, cp1, cp2, endPt];
            }
          }
          const pathData = getRoundedPathString(pts, 25);

          const arrowColor = arr.color || 'slate';
          const themeClass = THEME_COLORS.find(t => t.name === arrowColor)?.stroke || 'stroke-slate-500 dark:stroke-slate-400';

          let markerEnd = '';
          let strokeDasharray = '';
          if (arr.type === 'inheritance') markerEnd = `url(#inheritance-${arrowColor})`;
          if (arr.type === 'realization') { markerEnd = `url(#inheritance-${arrowColor})`; strokeDasharray = '6,6'; }
          if (arr.type === 'composition') markerEnd = `url(#composition-${arrowColor})`;
          if (arr.type === 'aggregation') markerEnd = `url(#aggregation-${arrowColor})`;
          if (arr.type === 'association') markerEnd = `url(#arrow-${arrowColor})`;

          return (
            <g key={arr.id}>
              {/* Hit Area (Broken into segments for independent dragging) */}
              {Array.from({ length: pts.length - 1 }).map((_, i) => (
                <line
                  key={`hit-${i}`}
                  x1={pts[i].x}
                  y1={pts[i].y}
                  x2={pts[i + 1].x}
                  y2={pts[i + 1].y}
                  stroke="transparent"
                  strokeWidth="25"
                  className="pointer-events-auto cursor-move"
                  onMouseDown={(e) => handleDragSegment(e, arr, i)}
                  onContextMenu={(e) => handleContextMenu(e, arr, i)}
                />
              ))}
              {/* Visible Line */}
              <path
                d={pathData}
                fill="none"
                strokeWidth="2"
                markerEnd={markerEnd}
                strokeDasharray={strokeDasharray}
                className={`transition-colors pointer-events-none ${isSelected ? 'stroke-blue-500 drop-shadow-[0_0_3px_rgba(59,130,246,0.8)]' : themeClass}`}
              />
            </g>
          );
        })}
      </svg>

      {/* HTML Overlay for Handles and Labels (Z-index above SVG) */}
      {arrows.map(arr => {
        const isSelected = selectedIds.includes(arr.id);

        const startPt = getAttachedPos(classes, arr.start.attachedTo, arr.start.anchorIndex, arr.start);
        const endPt = getAttachedPos(classes, arr.end.attachedTo, arr.end.anchorIndex, arr.end);
        const controlPoints = arr.controlPoints || [];

        const startPos = controlPoints.length > 0 ? getOffsetPos(startPt, controlPoints[0], 30) : getOffsetPos(startPt, endPt, 30);
        const endPos = controlPoints.length > 0 ? getOffsetPos(endPt, controlPoints[controlPoints.length - 1], 40) : getOffsetPos(endPt, startPt, 40);

        let midX, midY;
        if (arr.start.attachedTo === arr.end.attachedTo && controlPoints.length === 0 && pts.length === 4) {
          midX = (pts[1].x + pts[2].x) / 2;
          midY = (pts[1].y + pts[2].y) / 2;
        } else if (controlPoints.length === 0) {
          midX = (startPt.x + endPt.x) / 2;
          midY = (startPt.y + endPt.y) / 2;
        } else {
          const midIndex = Math.floor((controlPoints.length - 1) / 2);
          if (controlPoints.length % 2 === 1) { // 1, 3
            midX = controlPoints[midIndex].x;
            midY = controlPoints[midIndex].y;
          } else { // 2, 4
            midX = (controlPoints[midIndex].x + controlPoints[midIndex + 1].x) / 2;
            midY = (controlPoints[midIndex].y + controlPoints[midIndex + 1].y) / 2;
          }
        }

        const renderLabel = (x: number, y: number, labelKey: 'startLabel' | 'middleLabel' | 'endLabel', italic = false) => {
          const val = arr[labelKey as keyof UmlArrowType] as string;
          const offset = arr[`${labelKey}Offset` as keyof UmlArrowType] as Point;
          const rotation = (arr[`${labelKey}Rotation` as keyof UmlArrowType] as number) || 0;
          const fontSize = (arr[`${labelKey}FontSize` as keyof UmlArrowType] as number) || 14;
          if (!val && !isSelected && labelKey === 'middleLabel') return null;

          return (
            <div
              onMouseDown={(e) => handleDragLabel(e, arr, labelKey)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                const isExclusivelySelected = selectedIds.length === 1 && selectedIds[0] === arr.id;
                if (arr.groupId && !isExclusivelySelected) {
                  selectElement(arr.id, false, true);
                  return;
                }
                const target = e.target as HTMLElement;
                target.contentEditable = 'true';

                // استفاده از روش استاندارد برای انتخاب کل متن
                setTimeout(() => {
                  target.focus();
                  const range = document.createRange();
                  range.selectNodeContents(target);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }, 0);
              }}
              onBlur={(e) => {
                const target = e.target as HTMLElement;
                target.contentEditable = 'false';
                let text = target.innerText;
                if (text === '[text]') text = '';
                updateArrow(arr.id, { [labelKey]: text });
                commitHistory();
                window.getSelection()?.removeAllRanges();
              }}
              suppressContentEditableWarning={true}
              className={`absolute z-[3] px-1.5 py-0.5 border border-transparent rounded font-semibold select-none whitespace-pre-wrap text-center
                        ${italic ? 'italic font-normal text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-50'}
                        ${isSelected ? 'bg-white/95 dark:bg-slate-800/95 shadow-sm border-slate-300 dark:border-slate-600 cursor-move z-10' : 'bg-transparent cursor-pointer'}
                        [&[contenteditable="true"]]:cursor-text [&[contenteditable="true"]]:select-text
                    `}
              style={{
                left: x + offset.x,
                top: y + offset.y,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                fontSize: `${fontSize}px`
              }}
              dir={settings.isRTL ? 'rtl' : 'ltr'}
            >
              {(val === '' && isSelected && labelKey === 'middleLabel') ? '[text]' : val}
            </div>
          )
        };

        return (
          <React.Fragment key={arr.id}>
            {renderLabel(startPos.x, startPos.y + 15, 'startLabel')}
            {renderLabel(midX, midY + 15, 'middleLabel', true)}
            {renderLabel(endPos.x, endPos.y + 15, 'endLabel')}

            {isSelected && (
              <>
                <div onMouseDown={(e) => handleDragPoint(e, arr.id, 'start')} className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer z-[5] shadow-md hover:scale-125 transition-transform" style={{ left: startPt.x, top: startPt.y }}></div>

                {controlPoints.map((cp, idx) => (
                  <div
                    key={`cp-${idx}`}
                    onMouseDown={(e) => handleDragPoint(e, arr.id, 'cp', idx)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!selectedIds.includes(arr.id)) selectElement(arr.id, e.ctrlKey || e.metaKey);
                      const canvas = document.getElementById('canvas');
                      if (canvas) {
                        const rect = canvas.getBoundingClientRect();
                        openContextMenu({
                          type: 'anchor',
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          targetId: arr.id,
                          subTarget: idx.toString()
                        });
                      }
                    }}
                    className="absolute w-3 h-3 bg-amber-500 border-2 border-white rounded-[3px] -translate-x-1/2 -translate-y-1/2 cursor-pointer z-[4] shadow-md hover:scale-125 transition-transform"
                    style={{ left: cp.x, top: cp.y }}
                  ></div>
                ))}

                <div onMouseDown={(e) => handleDragPoint(e, arr.id, 'end')} className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer z-[5] shadow-md hover:scale-125 transition-transform" style={{ left: endPt.x, top: endPt.y }}></div>
              </>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};