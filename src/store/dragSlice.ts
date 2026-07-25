import type { StateCreator } from 'zustand';
import type { AppState, DragSlice, SnapLine, Point, UmlClassType, UmlArrowType } from './types';
import { getAttachedPos, getClassAnchors, getOffsetPos } from './utils';

export const createDragSlice: StateCreator<
    AppState,
    [],
    [],
    DragSlice
> = (set, get) => ({
    dragState: { targetId: null, type: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0, initialPositions: {}, subTarget: null },
    showAnchors: false,
    snapLines: [],
    selectionBox: null,

    startDrag: (updates) => set((state) => {
        const initialPositions: Record<string, any> = { ...(updates.initialPositions || {}) };
        if ((updates.type === 'class' || updates.type === 'class-resize' || updates.type === 'arrow-body' || updates.type === 'arrow-segment' || updates.type === 'selection-group') && updates.targetId) {
            const isMultiDrag = updates.type === 'selection-group' ||
                ((updates.type === 'class' || updates.type === 'arrow-body') &&
                    state.selectedIds.includes(updates.targetId) &&
                    state.selectedIds.length > 1);
            const idsToMove = isMultiDrag ? state.selectedIds : [updates.targetId];
            state.classes.forEach(c => {
                if (idsToMove.includes(c.id)) initialPositions[c.id] = { type: 'class', x: c.x, y: c.y };
            });
            state.arrows.forEach(a => {
                if (idsToMove.includes(a.id)) {
                    initialPositions[a.id] = { type: 'arrow-body', start: a.start, controlPoints: a.controlPoints || [], end: a.end };
                } else if (
                    (updates.type === 'class' || updates.type === 'selection-group') &&
                    ((a.start.attachedTo && idsToMove.includes(a.start.attachedTo)) ||
                        (a.end.attachedTo && idsToMove.includes(a.end.attachedTo)))
                ) {
                    initialPositions[a.id] = { type: 'attached-arrow', controlPoints: a.controlPoints || [] };
                }
            });
        } else if (updates.type === 'label') {
            initialPositions[updates.targetId!] = updates.initialPositions?.[updates.targetId!] || {};
        } else if (updates.type === 'polygon-vertex' && updates.targetId) {
            const cls = state.classes.find(c => c.id === updates.targetId);
            if (cls && cls.vertices) {
                initialPositions[cls.id] = { type: 'polygon-vertex', x: cls.x, y: cls.y, vertices: cls.vertices.map(v => ({ ...v })) };
            }
        } else if (updates.type === 'selection-group-rotate' && updates.targetId) {
            const idsToMove = state.selectedIds;
            state.classes.forEach(c => {
                if (idsToMove.includes(c.id)) {
                    initialPositions[c.id] = { type: 'class', x: c.x, y: c.y, rotation: c.rotation || 0, width: c.width, height: c.height || 100 };
                }
            });
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            state.classes.forEach(c => {
                if (idsToMove.includes(c.id)) {
                    const w = c.width;
                    const h = c.height || 100;
                    if (c.rotation) {
                        const cx = c.x + w / 2;
                        const cy = c.y + h / 2;
                        const rad = c.rotation * Math.PI / 180;
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        const pts = [{ x: c.x, y: c.y }, { x: c.x + w, y: c.y }, { x: c.x + w, y: c.y + h }, { x: c.x, y: c.y + h }];
                        pts.forEach(p => {
                            const rx = (p.x - cx) * cos - (p.y - cy) * sin + cx;
                            const ry = (p.x - cx) * sin + (p.y - cy) * cos + cy;
                            minX = Math.min(minX, rx); minY = Math.min(minY, ry); maxX = Math.max(maxX, rx); maxY = Math.max(maxY, ry);
                        });
                    } else {
                        minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x + w); maxY = Math.max(maxY, c.y + h);
                    }
                }
            });
            initialPositions['groupCenter'] = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        }
        return {
            dragState: { ...state.dragState, ...updates, initialPositions },
            showAnchors: ['start', 'end'].includes(updates.type as string) ? true : state.showAnchors,
        };
    }),

    onDrag: (mouseX, mouseY, deltaX, deltaY, canvasBounds, isShiftPressed) => set((state) => {
        const { targetId, type, offsetX, offsetY, startX, startY, initialPositions, subTarget } = state.dragState;
        if (!targetId || !type) return state;

        if (type === 'class' || type === 'arrow-body' || type === 'selection-group') {
            const isMultiDrag = type === 'selection-group' ||
                ((type === 'class' || type === 'arrow-body') &&
                    state.selectedIds.includes(targetId) &&
                    state.selectedIds.length > 1);
            const moveIds = isMultiDrag ? state.selectedIds : [targetId];

            let deltaXFinal = deltaX;
            let deltaYFinal = deltaY;
            const activeSnapLines: SnapLine[] = [];

            const selectedClasses = state.classes.filter(c => moveIds.includes(c.id));

            if (selectedClasses.length > 0 && (type === 'class' || type === 'selection-group')) {
                let minInitX = Infinity, minInitY = Infinity, maxInitX = -Infinity, maxInitY = -Infinity;
                selectedClasses.forEach(c => {
                    const initPos = initialPositions?.[c.id];
                    if (initPos && initPos.type === 'class') {
                        const w = c.width;
                        const h = c.height || (38 + 20 + 30 + (c.items.length * 30));
                        minInitX = Math.min(minInitX, initPos.x);
                        minInitY = Math.min(minInitY, initPos.y);
                        maxInitX = Math.max(maxInitX, initPos.x + w);
                        maxInitY = Math.max(maxInitY, initPos.y + h);
                    }
                });

                if (minInitX !== Infinity) {
                    const initBoxWidth = maxInitX - minInitX;
                    const initBoxHeight = maxInitY - minInitY;

                    let finalX = minInitX + deltaX;
                    let finalY = minInitY + deltaY;
                    const SNAP_DIST = 10;

                    if (state.settings.isSnappingEnabled) {
                        const otherClasses = state.classes.filter(c => !moveIds.includes(c.id));

                        let snappedX = false;
                        for (const other of otherClasses) {
                            const linesToTest = [other.x, other.x + other.width, other.x + (other.width / 2)];
                            const myLines = [finalX, finalX + initBoxWidth, finalX + (initBoxWidth / 2)];
                            for (let i = 0; i < myLines.length; i++) {
                                for (let j = 0; j < linesToTest.length; j++) {
                                    if (Math.abs(myLines[i] - linesToTest[j]) < SNAP_DIST) {
                                        finalX = finalX + (linesToTest[j] - myLines[i]);
                                        activeSnapLines.push({ type: 'vertical', position: linesToTest[j] });
                                        snappedX = true;
                                        break;
                                    }
                                }
                                if (snappedX) break;
                            }
                            if (snappedX) break;
                        }

                        let snappedY = false;
                        for (const other of otherClasses) {
                            const estimatedHeightFallback = (c: UmlClassType) => 38 + 20 + 30 + (c.items.length * 30);
                            const estimatedOtherHeight = other.height || estimatedHeightFallback(other);
                            const linesToTest = [other.y, other.y + estimatedOtherHeight, other.y + (estimatedOtherHeight / 2)];
                            const myLines = [finalY, finalY + initBoxHeight, finalY + (initBoxHeight / 2)];
                            for (let i = 0; i < myLines.length; i++) {
                                for (let j = 0; j < linesToTest.length; j++) {
                                    if (Math.abs(myLines[i] - linesToTest[j]) < SNAP_DIST) {
                                        finalY = finalY + (linesToTest[j] - myLines[i]);
                                        activeSnapLines.push({ type: 'horizontal', position: linesToTest[j] });
                                        snappedY = true;
                                        break;
                                    }
                                }
                                if (snappedY) break;
                            }
                            if (snappedY) break;
                        }

                        deltaXFinal = finalX - minInitX;
                        deltaYFinal = finalY - minInitY;
                    }
                }
            }

            return {
                classes: state.classes.map(c => {
                    if (moveIds.includes(c.id) && initialPositions?.[c.id]?.type === 'class') {
                        return { ...c, x: initialPositions[c.id].x + deltaXFinal, y: initialPositions[c.id].y + deltaYFinal };
                    }
                    return c;
                }),
                arrows: state.arrows.map(a => {
                    if (moveIds.includes(a.id) && initialPositions?.[a.id]?.type === 'arrow-body') {
                        const initPos = initialPositions[a.id];
                        const hasControlPoints = initPos.controlPoints && initPos.controlPoints.length > 0;
                        // فقط اگر بدون کنترل پوینت بود و از هر دو سر وصل بود، ثابت می‌ماند
                        if (!hasControlPoints && initPos.start.attachedTo && initPos.end.attachedTo) return a;

                        return {
                            ...a,
                            start: initPos.start.attachedTo ? { ...initPos.start } : { ...initPos.start, x: initPos.start.x + deltaXFinal, y: initPos.start.y + deltaYFinal, attachedTo: null, anchorIndex: -1 },
                            controlPoints: (initPos.controlPoints || []).map((cp: Point) => ({ x: cp.x + deltaXFinal, y: cp.y + deltaYFinal })),
                            end: initPos.end.attachedTo ? { ...initPos.end } : { ...initPos.end, x: initPos.end.x + deltaXFinal, y: initPos.end.y + deltaYFinal, attachedTo: null, anchorIndex: -1 }
                        };
                    }

                    if (initialPositions?.[a.id]?.type === 'attached-arrow') {
                        const initPos = initialPositions[a.id];
                        if (initPos.controlPoints && initPos.controlPoints.length >= 2) {
                            const startMoving = a.start.attachedTo && moveIds.includes(a.start.attachedTo);
                            const endMoving = a.end.attachedTo && moveIds.includes(a.end.attachedTo);

                            let newCps = initPos.controlPoints.map((cp: Point) => ({ ...cp }));
                            let changed = false;

                            if (startMoving) {
                                newCps[0].x = initPos.controlPoints[0].x + deltaXFinal;
                                newCps[0].y = initPos.controlPoints[0].y + deltaYFinal;
                                changed = true;
                            }
                            if (endMoving) {
                                const lastIdx = newCps.length - 1;
                                newCps[lastIdx].x = initPos.controlPoints[lastIdx].x + deltaXFinal;
                                newCps[lastIdx].y = initPos.controlPoints[lastIdx].y + deltaYFinal;
                                changed = true;
                            }

                            if (changed) {
                                return { ...a, controlPoints: newCps };
                            }
                        }
                    }

                    return a;
                }),
                snapLines: activeSnapLines
            };
        } else if (type === 'arrow-segment') {
            const segIdx = parseInt(subTarget || '0', 10);
            return {
                arrows: state.arrows.map(a => {
                    if (a.id === targetId && initialPositions?.[a.id]?.type === 'arrow-body') {
                        const initPos = initialPositions[a.id];
                        const moveStart = segIdx === 0 && !initPos.start.attachedTo;
                        const moveEnd = segIdx + 1 === (initPos.controlPoints.length + 1) && !initPos.end.attachedTo;

                        let newStart = { ...initPos.start };
                        let newEnd = { ...initPos.end };
                        let newCps = initPos.controlPoints.map((cp: Point) => ({ ...cp }));

                        if (segIdx === 0) {
                            if (moveStart) { newStart.x = initPos.start.x + deltaX; newStart.y = initPos.start.y + deltaY; }
                        } else {
                            newCps[segIdx - 1].x = initPos.controlPoints[segIdx - 1].x + deltaX;
                            newCps[segIdx - 1].y = initPos.controlPoints[segIdx - 1].y + deltaY;
                        }

                        if (segIdx + 1 === initPos.controlPoints.length + 1) {
                            if (moveEnd) { newEnd.x = initPos.end.x + deltaX; newEnd.y = initPos.end.y + deltaY; }
                        } else {
                            newCps[segIdx].x = initPos.controlPoints[segIdx].x + deltaX;
                            newCps[segIdx].y = initPos.controlPoints[segIdx].y + deltaY;
                        }

                        return {
                            ...a,
                            start: newStart,
                            end: newEnd,
                            controlPoints: newCps
                        };
                    }
                    return a;
                })
            };
        } else if (type === 'class-rotate') {
            const cls = state.classes.find(c => c.id === targetId);
            if (cls) {
                const cx = cls.x + cls.width / 2;
                const cy = cls.y + (cls.height || 100) / 2;
                let angle = Math.atan2(mouseY - cy, mouseX - cx) * (180 / Math.PI) + 90;
                angle = Math.round(angle);
                if (angle < 0) angle += 360;
                if (angle >= 360) angle -= 360;

                if (isShiftPressed) {
                    angle = Math.round(angle / 15) * 15;
                    if (angle === 360) angle = 0;
                }

                return { classes: state.classes.map(c => c.id === targetId ? { ...c, rotation: angle } : c) };
            }
        } else if (type === 'selection-group-rotate') {
            const groupCenter = initialPositions?.groupCenter;
            if (!groupCenter) return state;
            const cx = groupCenter.x;
            const cy = groupCenter.y;

            let deltaAngle = Math.atan2(mouseY - cy, mouseX - cx) * (180 / Math.PI) + 90;
            deltaAngle = isShiftPressed ? Math.round(deltaAngle / 15) * 15 : Math.round(deltaAngle);

            const rad = deltaAngle * (Math.PI / 180);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            return {
                classes: state.classes.map(c => {
                    const initPos = initialPositions?.[c.id];
                    if (initPos && initPos.type === 'class') {
                        const ox = initPos.x + initPos.width / 2;
                        const oy = initPos.y + initPos.height / 2;

                        const nx = (ox - cx) * cos - (oy - cy) * sin + cx;
                        const ny = (ox - cx) * sin + (oy - cy) * cos + cy;

                        let newRot = initPos.rotation + deltaAngle;
                        if (newRot < 0) newRot = 360 + (newRot % 360);

                        return { ...c, x: nx - initPos.width / 2, y: ny - initPos.height / 2, rotation: newRot % 360 };
                    }
                    return c;
                })
            };
        } else if (type === 'class-resize') {
            const cls = state.classes.find(c => c.id === targetId);
            if (cls) {
                let localDeltaX = deltaX;
                let localDeltaY = deltaY;
                if (cls.rotation) {
                    const rad = cls.rotation * (Math.PI / 180);
                    localDeltaX = deltaX * Math.cos(rad) + deltaY * Math.sin(rad);
                    localDeltaY = -deltaX * Math.sin(rad) + deltaY * Math.cos(rad);
                }

                const minW = cls.type === 'image' ? 20 : (cls.type === 'shape' || cls.type === 'fsm_state' ? 20 : 150);
                let newWidth = Math.max(minW, offsetX + localDeltaX);
                let newHeight = Math.max(20, (offsetY || 100) + localDeltaY);
                const activeSnapLines: SnapLine[] = [];
                const SNAP_DIST = 10;
                const otherClasses = state.classes.filter(c => c.id !== targetId);

                if (state.settings.isSnappingEnabled) {
                    let snapped = false;
                    for (const other of otherClasses) {
                        const linesToTest = [other.x, other.x + other.width, other.x + (other.width / 2)];

                        for (const line of linesToTest) {
                            // بررسی تراز شدن لبه‌ی راست کلاس
                            if (Math.abs((cls.x + newWidth) - line) < SNAP_DIST) {
                                const potentialWidth = line - cls.x;
                                if (potentialWidth >= minW) {
                                    newWidth = potentialWidth;
                                    activeSnapLines.push({ type: 'vertical', position: line });
                                    snapped = true;
                                    break;
                                }
                            }
                            // بررسی تراز شدن وسط کلاس
                            if (Math.abs((cls.x + newWidth / 2) - line) < SNAP_DIST) {
                                const potentialWidth = (line - cls.x) * 2;
                                if (potentialWidth >= minW) {
                                    newWidth = potentialWidth;
                                    activeSnapLines.push({ type: 'vertical', position: line });
                                    snapped = true;
                                    break;
                                }
                            }
                        }
                        if (snapped) break;
                    }

                    let snappedY = false;
                    for (const other of otherClasses) {
                        const otherH = other.height || (38 + 20 + 30 + (other.items.length * 30));
                        const linesToTest = [other.y, other.y + otherH, other.y + (otherH / 2)];

                        for (const line of linesToTest) {
                            // بررسی تراز شدن لبه‌ی پایین کلاس
                            if (Math.abs((cls.y + newHeight) - line) < SNAP_DIST) {
                                const potentialHeight = line - cls.y;
                                if (potentialHeight >= 20) {
                                    newHeight = potentialHeight;
                                    activeSnapLines.push({ type: 'horizontal', position: line });
                                    snappedY = true;
                                    break;
                                }
                            }
                            // بررسی تراز شدن وسط کلاس
                            if (Math.abs((cls.y + newHeight / 2) - line) < SNAP_DIST) {
                                const potentialHeight = (line - cls.y) * 2;
                                if (potentialHeight >= 20) {
                                    newHeight = potentialHeight;
                                    activeSnapLines.push({ type: 'horizontal', position: line });
                                    snappedY = true;
                                    break;
                                }
                            }
                        }
                        if (snappedY) break;
                    }
                }

                if (cls.type === 'image' && cls.aspectRatio) {
                    const newHeight = newWidth * cls.aspectRatio;
                    return {
                        classes: state.classes.map(c => c.id === targetId ? { ...c, width: newWidth, height: newHeight } : c),
                        snapLines: activeSnapLines
                    };
                } else if (cls.type === 'shape') {
                    if (cls.shapeType === 'regularPolygon' || cls.aspectRatioLocked) {
                        const size = Math.max(newWidth, newHeight);
                        newWidth = size;
                        newHeight = size;
                    } else if (isShiftPressed) {
                        const initialAspectRatio = (offsetY || 100) / Math.max(1, offsetX);
                        newHeight = newWidth * initialAspectRatio;
                    } else if (state.settings.isSnappingEnabled && Math.abs(newWidth - newHeight) <= 10) {
                        const size = Math.max(newWidth, newHeight);
                        newWidth = size;
                        newHeight = size;
                    }
                    return {
                        classes: state.classes.map(c => c.id === targetId ? { ...c, width: newWidth, height: newHeight } : c),
                        snapLines: activeSnapLines
                    };
                }

                return {
                    classes: state.classes.map(c => c.id === targetId ? { ...c, width: newWidth } : c),
                    snapLines: activeSnapLines
                };
            }
        } else if (type === 'polygon-vertex' && subTarget !== null) {
            const vIdx = parseInt(subTarget, 10);
            const initPos = initialPositions?.[targetId];
            const cls = state.classes.find(c => c.id === targetId);

            let localDeltaX = deltaX;
            let localDeltaY = deltaY;
            if (cls && cls.rotation) {
                const rad = cls.rotation * (Math.PI / 180);
                localDeltaX = deltaX * Math.cos(rad) + deltaY * Math.sin(rad);
                localDeltaY = -deltaX * Math.sin(rad) + deltaY * Math.cos(rad);
            }

            let deltaXFinal = localDeltaX;
            let deltaYFinal = localDeltaY;
            const activeSnapLines: SnapLine[] = [];

            if (initPos && initPos.vertices && state.settings.isSnappingEnabled) {
                const originalVertex = initPos.vertices[vIdx];
                let finalAbsX = initPos.x + originalVertex.x + localDeltaX;
                let finalAbsY = initPos.y + originalVertex.y + localDeltaY;
                const SNAP_DIST = 5;

                const linesX: number[] = [];
                const linesY: number[] = [];

                // دریافت نقاطِ دیگرِ همین چندضلعی برای تراز شدن با آن‌ها
                initPos.vertices.forEach((v: Point, i: number) => {
                    if (i !== vIdx) {
                        linesX.push(initPos.x + v.x);
                        linesY.push(initPos.y + v.y);
                    }
                });

                // دریافت خطوطِ سایر کلاس‌های روی صفحه
                state.classes.forEach(c => {
                    if (c.id !== targetId) {
                        linesX.push(c.x, c.x + c.width / 2, c.x + c.width);
                        const h = c.height || (38 + 20 + 30 + (c.items.length * 30));
                        linesY.push(c.y, c.y + h / 2, c.y + h);
                    }
                });

                // بررسی و اعمال اسنپ روی محور X
                for (const lx of linesX) {
                    if (Math.abs(finalAbsX - lx) < SNAP_DIST) {
                        finalAbsX = lx;
                        activeSnapLines.push({ type: 'vertical', position: lx });
                        break;
                    }
                }
                // بررسی و اعمال اسنپ روی محور Y
                for (const ly of linesY) {
                    if (Math.abs(finalAbsY - ly) < SNAP_DIST) {
                        finalAbsY = ly;
                        activeSnapLines.push({ type: 'horizontal', position: ly });
                        break;
                    }
                }

                deltaXFinal = finalAbsX - (initPos.x + originalVertex.x);
                deltaYFinal = finalAbsY - (initPos.y + originalVertex.y);
            }


            return {
                classes: state.classes.map(c => {
                    if (c.id === targetId && c.vertices) {
                        const initPos = initialPositions?.[c.id];
                        if (!initPos || !initPos.vertices) return c;

                        const newVertices = initPos.vertices.map((v: Point) => ({ ...v }));
                        newVertices[vIdx] = { x: initPos.vertices[vIdx].x + deltaXFinal, y: initPos.vertices[vIdx].y + deltaYFinal };

                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        newVertices.forEach((v: Point) => {
                            minX = Math.min(minX, v.x);
                            minY = Math.min(minY, v.y);
                            maxX = Math.max(maxX, v.x);
                            maxY = Math.max(maxY, v.y);
                        });

                        const dx = minX;
                        const dy = minY;
                        const finalVertices = newVertices.map((v: Point) => ({ x: v.x - dx, y: v.y - dy }));

                        return {
                            ...c,
                            x: initPos.x + dx,
                            y: initPos.y + dy,
                            width: maxX - minX,
                            height: Math.max(1, maxY - minY),
                            vertices: finalVertices
                        };
                    }
                    return c;
                }),
                snapLines: activeSnapLines
            };
        } else if (type === 'label' && subTarget) {
            const activeSnapLines: SnapLine[] = [];
            const otherLabelPoints: Point[] = [];
            let myBaseX = 0, myBaseY = 0;
            let initOffsetX = 0, initOffsetY = 0;

            if (initialPositions?.[targetId]) {
                initOffsetX = initialPositions[targetId].offsetX || 0;
                initOffsetY = initialPositions[targetId].offsetY || 0;
            }

            state.arrows.forEach(arr => {
                const startPt = getAttachedPos(state.classes, arr.start.attachedTo, arr.start.anchorIndex, arr.start);
                const endPt = getAttachedPos(state.classes, arr.end.attachedTo, arr.end.anchorIndex, arr.end);
                const cps = arr.controlPoints || [];

                const sBase = cps.length > 0 ? getOffsetPos(startPt, cps[0], 30) : getOffsetPos(startPt, endPt, 30);
                const eBase = cps.length > 0 ? getOffsetPos(endPt, cps[cps.length - 1], 40) : getOffsetPos(endPt, startPt, 40);

                let mBaseX, mBaseY;
                if (cps.length === 0) {
                    mBaseX = (startPt.x + endPt.x) / 2;
                    mBaseY = (startPt.y + endPt.y) / 2;
                } else {
                    const midIndex = Math.floor((cps.length - 1) / 2);
                    if (cps.length % 2 === 1) {
                        mBaseX = cps[midIndex].x;
                        mBaseY = cps[midIndex].y;
                    } else {
                        mBaseX = (cps[midIndex].x + cps[midIndex + 1].x) / 2;
                        mBaseY = (cps[midIndex].y + cps[midIndex + 1].y) / 2;
                    }
                }

                const labels = [
                    { key: 'startLabel', x: sBase.x + arr.startLabelOffset.x, y: sBase.y + 15 + arr.startLabelOffset.y, baseX: sBase.x, baseY: sBase.y + 15 },
                    { key: 'middleLabel', x: mBaseX + arr.middleLabelOffset.x, y: mBaseY + 15 + arr.middleLabelOffset.y, baseX: mBaseX, baseY: mBaseY + 15 },
                    { key: 'endLabel', x: eBase.x + arr.endLabelOffset.x, y: eBase.y + 15 + arr.endLabelOffset.y, baseX: eBase.x, baseY: eBase.y + 15 },
                ];

                labels.forEach(lbl => {
                    if (arr.id === targetId && lbl.key === subTarget) {
                        myBaseX = lbl.baseX;
                        myBaseY = lbl.baseY;
                    } else {
                        otherLabelPoints.push({ x: lbl.x, y: lbl.y });
                    }
                });
            });

            let finalX = myBaseX + initOffsetX + deltaX;
            let finalY = myBaseY + initOffsetY + deltaY;
            const SNAP_DIST = 5;

            if (state.settings.isSnappingEnabled) {
                for (const pt of otherLabelPoints) {
                    if (Math.abs(finalX - pt.x) < SNAP_DIST) {
                        finalX = pt.x;
                        activeSnapLines.push({ type: 'vertical', position: pt.x });
                        break;
                    }
                }
                for (const pt of otherLabelPoints) {
                    if (Math.abs(finalY - pt.y) < SNAP_DIST) {
                        finalY = pt.y;
                        activeSnapLines.push({ type: 'horizontal', position: pt.y });
                        break;
                    }
                }
            }

            return {
                arrows: state.arrows.map(a => {
                    if (a.id === targetId) {
                        const labelOffsetKey = (subTarget + 'Offset') as keyof UmlArrowType;
                        return {
                            ...a,
                            [labelOffsetKey]: {
                                x: finalX - myBaseX,
                                y: finalY - myBaseY
                            }
                        };
                    }
                    return a;
                }),
                snapLines: activeSnapLines
            };
        } else if (['start', 'end', 'cp'].includes(type)) {
            let finalX = mouseX;
            let finalY = mouseY;
            const activeSnapLines: SnapLine[] = [];

            const otherPoints: Point[] = [];

            // دریافت تمام نقاط از فلش فعلی (بجز نقطه‌ی در حال درگ) و همچنین تمام نقاطِ سایر فلش‌ها
            state.arrows.forEach(arr => {
                if (arr.id === targetId) {
                    if (type !== 'start') otherPoints.push(getAttachedPos(state.classes, arr.start.attachedTo, arr.start.anchorIndex, arr.start));
                    if (type !== 'end') otherPoints.push(getAttachedPos(state.classes, arr.end.attachedTo, arr.end.anchorIndex, arr.end));
                    (arr.controlPoints || []).forEach((cp, idx) => {
                        if (!(type === 'cp' && subTarget !== null && parseInt(subTarget, 10) === idx)) {
                            otherPoints.push(cp);
                        }
                    });
                } else {
                    otherPoints.push(getAttachedPos(state.classes, arr.start.attachedTo, arr.start.anchorIndex, arr.start));
                    otherPoints.push(getAttachedPos(state.classes, arr.end.attachedTo, arr.end.anchorIndex, arr.end));
                    (arr.controlPoints || []).forEach(cp => otherPoints.push(cp));
                }
            });

            const SNAP_DIST = 5;

            if (state.settings.isSnappingEnabled) {
                // بررسی تراز شدن محور X
                for (const pt of otherPoints) {
                    if (Math.abs(finalX - pt.x) < SNAP_DIST) {
                        finalX = pt.x;
                        activeSnapLines.push({ type: 'vertical', position: pt.x });
                        break;
                    }
                }

                // بررسی تراز شدن محور Y
                for (const pt of otherPoints) {
                    if (Math.abs(finalY - pt.y) < SNAP_DIST) {
                        finalY = pt.y;
                        activeSnapLines.push({ type: 'horizontal', position: pt.y });
                        break;
                    }
                }
            }

            return {
                arrows: state.arrows.map(a => {
                    if (a.id === targetId) {
                        let updatedArrow = { ...a };
                        if (type === 'start' || type === 'end') {
                            // Snapping Logic to Classes
                            let closestDist = 25;
                            let attachedTo: string | null = null;
                            let anchorIndex = -1;

                            if (state.settings.isSnappingEnabled) {
                                state.classes.forEach(cls => {
                                    const estimatedHeight = cls.height || (38 + 20 + 30 + (cls.items.length * 30));
                                    const points = getClassAnchors(cls, estimatedHeight);
                                    points.forEach((pt, idx) => {
                                        const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY); // استفاده از موس برای پیدا کردن کلاس نزدیک‌تر
                                        if (dist < closestDist) {
                                            closestDist = dist;
                                            attachedTo = cls.id;
                                            anchorIndex = idx;
                                        }
                                    });
                                });
                            }

                            updatedArrow[type] = {
                                ...updatedArrow[type],
                                x: finalX,
                                y: finalY,
                                attachedTo,
                                anchorIndex
                            };
                        } else if (type === 'cp' && subTarget !== null) {
                            const cpIndex = parseInt(subTarget, 10);
                            updatedArrow.controlPoints = [...(updatedArrow.controlPoints || [])];
                            updatedArrow.controlPoints[cpIndex] = { x: finalX, y: finalY };
                        }
                        return updatedArrow;
                    }
                    return a;
                }),
                snapLines: activeSnapLines
            };
        } else if (type === 'selection-box') {
            const minX = Math.min(startX, mouseX);
            const minY = Math.min(startY, mouseY);
            const width = Math.abs(mouseX - startX);
            const height = Math.abs(mouseY - startY);

            const previouslySelected = Object.keys(initialPositions || {});
            const newSelected = state.classes
                .filter(c => c.x < minX + width && c.x + c.width > minX && c.y < minY + height && c.y + (c.height || 100) > minY)
                .map(c => c.id);
            const newSelectedArrows = state.arrows
                .filter(a => {
                    const startPt = getAttachedPos(state.classes, a.start.attachedTo, a.start.anchorIndex, a.start);
                    const endPt = getAttachedPos(state.classes, a.end.attachedTo, a.end.anchorIndex, a.end);
                    const pts = [startPt, ...(a.controlPoints || []), endPt];
                    return pts.some(p => p.x < minX + width && p.x > minX && p.y < minY + height && p.y > minY);
                }).map(a => a.id);

            const combined = new Set([...previouslySelected, ...newSelected, ...newSelectedArrows]);
            combined.forEach(id => {
                const cls = state.classes.find(c => c.id === id);
                const arr = state.arrows.find(a => a.id === id);
                const gid = cls?.groupId || arr?.groupId;
                if (gid) {
                    state.classes.filter(c => c.groupId === gid).forEach(c => combined.add(c.id));
                    state.arrows.filter(a => a.groupId === gid).forEach(a => combined.add(a.id));
                }
            });
            return { selectionBox: { x: minX, y: minY, width, height }, selectedIds: Array.from(combined) };
        } else if (type === 'draw-item') {
            let finalMouseX = mouseX;
            let finalMouseY = mouseY;
            const activeSnapLines: SnapLine[] = [];
            const SNAP_DIST = 5;

            if (state.settings.isSnappingEnabled) {
                const otherClasses = state.classes.filter(c => c.id !== targetId);

                let snappedX = false;
                for (const other of otherClasses) {
                    const linesToTest = [other.x, other.x + other.width, other.x + (other.width / 2)];
                    for (const line of linesToTest) {
                        if (Math.abs(finalMouseX - line) < SNAP_DIST) {
                            finalMouseX = line;
                            activeSnapLines.push({ type: 'vertical', position: line });
                            snappedX = true;
                            break;
                        }
                    }
                    if (snappedX) break;
                }

                let snappedY = false;
                for (const other of otherClasses) {
                    const otherH = other.height || (38 + 20 + 30 + (other.items.length * 30));
                    const linesToTest = [other.y, other.y + otherH, other.y + (otherH / 2)];
                    for (const line of linesToTest) {
                        if (Math.abs(finalMouseY - line) < SNAP_DIST) {
                            finalMouseY = line;
                            activeSnapLines.push({ type: 'horizontal', position: line });
                            snappedY = true;
                            break;
                        }
                    }
                    if (snappedY) break;
                }
            }

            const dx = Math.abs(finalMouseX - startX);
            const dy = Math.abs(finalMouseY - startY);

            let minX = Math.min(startX, finalMouseX);
            let minY = Math.min(startY, finalMouseY);
            let width = dx;
            let height = dy;

            const targetCls = state.classes.find(c => c.id === targetId);

            if (targetCls?.type === 'image' && targetCls.aspectRatio) {
                height = width * targetCls.aspectRatio;
                if (finalMouseX < startX) minX = startX - width;
                if (finalMouseY < startY) minY = startY - height;
            } else if (isShiftPressed || targetCls?.shapeType === 'regularPolygon') {
                const size = Math.max(width, height);
                width = size;
                height = size;
                if (finalMouseX < startX) minX = startX - size;
                if (finalMouseY < startY) minY = startY - size;
            }
            return {
                classes: state.classes.map(c => c.id === targetId ? { ...c, x: minX, y: minY, width, height } : c),
                snapLines: activeSnapLines
            };
        }

        return state;
    }),

    endDrag: () => {
        set((state) => {
            let updatedClasses = state.classes;
            const { type, targetId, initialPositions } = state.dragState;

            if (type === 'draw-item' && targetId) {
                const target = state.classes.find(c => c.id === targetId);
                if (target && target.width < 10 && (target.height || 0) < 10) {
                    let defW = initialPositions?.defaults?.w || 240;
                    let defH = initialPositions?.defaults?.h || 100;

                    if (target.type === 'shape') {
                        if (target.shapeType === 'cloud') {
                            defW = 200;
                            defH = 150;
                        } else {
                            defW = 200;
                            defH = 200;
                        }
                    }

                    updatedClasses = state.classes.map(c => c.id === targetId ? { ...c, width: defW, height: defH } : c);
                }
            }

            return {
                classes: updatedClasses,
                dragState: { targetId: null, type: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0, initialPositions: {}, subTarget: null },
                showAnchors: false,
                snapLines: [],
                selectionBox: null,
            };
        });
        get().commitHistory();
    },
});