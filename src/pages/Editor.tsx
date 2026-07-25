import React, { useEffect, useRef } from 'react';
import { Toolbar } from '../components/Toolbar';
import { Canvas } from '../components/Canvas';
import { LeftPanel } from '../components/LeftPanel';
import { RightPanel } from '../components/RightPanel';
import { BottomToolbar } from '../components/BottomToolbar';
import { useStore } from '../store/useStore';
import type { ToolType } from '../store/types';

export const Editor: React.FC = () => {
  const { settings, setTool, deleteSelected, undo, redo } = useStore();
  const prevToolRef = useRef<ToolType>('selection');
  const isSpacePanningRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        const currentTool = useStore.getState().tool;
        if (currentTool !== 'hand') {
          prevToolRef.current = currentTool;
          isSpacePanningRef.current = true;
          setTool('hand');
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) { redo(); } else { undo(); }
          e.preventDefault(); return;
        }
        if (e.key.toLowerCase() === 'y') { redo(); e.preventDefault(); return; }
        if (e.key.toLowerCase() === 'c') { useStore.getState().copySelected(); e.preventDefault(); return; }
        if (e.key.toLowerCase() === 'v') {
          const state = useStore.getState();
          const canvasEl = document.getElementById('canvas');
          if (canvasEl) {
            const bounds = canvasEl.getBoundingClientRect();
            const localX = (bounds.width / 2 - state.pan.x) / state.zoom;
            const localY = (bounds.height / 2 - state.pan.y) / state.zoom;
            state.pasteFromClipboard(localX, localY);
          }
          e.preventDefault(); return;
        }
        if (e.key.toLowerCase() === 'd') { useStore.getState().duplicateSelected(); e.preventDefault(); return; }
        if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          const state = useStore.getState();
          if (state.selectedIds.length === 0) return;
          const selectedGroupIds = new Set<string>();
          let hasUngroupedItems = false;
          state.selectedIds.forEach(id => {
              const c = state.classes.find(x => x.id === id);
              const a = state.arrows.find(x => x.id === id);
              const groupId = c?.groupId || a?.groupId;
              if (groupId) selectedGroupIds.add(groupId);
              else hasUngroupedItems = true;
          });
          let isFullGroupSelected = true;
          if (selectedGroupIds.size > 0) {
              selectedGroupIds.forEach(groupId => {
                  const itemsInGroup = [...state.classes.filter(c => c.groupId === groupId).map(c => c.id), ...state.arrows.filter(a => a.groupId === groupId).map(a => a.id)];
                  if (!itemsInGroup.every(id => state.selectedIds.includes(id))) isFullGroupSelected = false;
              });
          } else { isFullGroupSelected = false; }
          const isAllSameGroup = selectedGroupIds.size === 1 && !hasUngroupedItems;
          if (isAllSameGroup && isFullGroupSelected) state.ungroupSelected();
          else if (state.selectedIds.length > 1) state.groupSelected();
          return;
        }
      }

      if (e.key.toLowerCase() === 'v') setTool('selection');
      if (e.key.toLowerCase() === 'h') setTool('hand');
      if (e.key.toLowerCase() === 'z') setTool('zoom');
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (isSpacePanningRef.current) {
          isSpacePanningRef.current = false;
          setTool(prevToolRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setTool, deleteSelected, undo, redo, settings.customFonts]);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50 relative selection:bg-blue-500/20">
      <Toolbar />
      <LeftPanel />
      <RightPanel />
      <Canvas />
      <BottomToolbar />
    </div>
  );
};