import type { StateCreator } from 'zustand';
import type { AppState, ElementSlice, UmlClassType, Point } from './types';
import { calculateLayout } from './utils';

export const createElementSlice: StateCreator<
  AppState,
  [],
  [],
  ElementSlice
> = (set, get) => ({
  isDrawingPolygon: false,
  pendingPolygonVertices: [],
  editingPolygonId: null,
  pendingItemType: null,
  pendingShapeType: null,
  pendingImageData: null,

  setPendingItemType: (type) => set(state => ({ pendingItemType: state.pendingItemType === type ? null : type, pendingArrowType: null, isDrawingPolygon: false, pendingShapeType: null })),
  setPendingShapeType: (type) => set({ pendingShapeType: type }),
  setPendingImageData: (data) => set({ pendingImageData: data }),

  addClass: (x = 150, y = 100, w = 240, h = 100) => {
    const id = 'class-' + Date.now();
    set((state) => ({
      classes: [...state.classes, { id, name: 'ClassName', items: [], x, y, width: w, height: h }],
      selectedIds: [id]
    }));
    get().commitHistory();
    return id;
  },

  addImage: (dataUrl, width, height, x = 150, y = 100, startZero = false) => {
    const id = 'image-' + Date.now();
    set((state) => ({
      classes: [...state.classes, {
        id,
        type: 'image',
        name: 'Image',
        items: [],
        x,
        y,
        width: startZero ? 0 : width,
        height: startZero ? 0 : height,
        imageUrl: dataUrl,
        aspectRatio: height / width,
        borderRadius: 8
      }],
      selectedIds: [id]
    }));
    get().commitHistory();
    return id;
  },

  autoLayout: (type) => {
    set((state) => {
      const updates = calculateLayout(state.classes, state.arrows, type);
      return {
        classes: state.classes.map(c => updates[c.id] ? { ...c, ...updates[c.id] } : c)
      };
    });
    get().commitHistory();
  },
  
  addShape: (shapeType, x = 150, y = 100, w?: number, h?: number) => {
    const id = 'shape-' + Date.now();
    set((state) => ({
      classes: [...state.classes, {
        id,
        type: 'shape',
        shapeType,
        name: 'Shape',
        items: [],
        x, y,
        width: w !== undefined ? w : 120, height: h !== undefined ? h : (shapeType === 'cloud' ? 80 : 120),
        sides: shapeType === 'regularPolygon' ? 3 : undefined,
        color: 'slate', fillOpacity: 0.2, strokeStyle: 'solid',
        borderRadius: shapeType === 'rectangle' || shapeType === 'regularPolygon' ? 10 : 0
      }],
      selectedIds: [id]
    }));
    get().commitHistory();
    return id;
  },

  addTextBox: (x = 150, y = 100, w = 240, h = 100) => {
    const id = 'text-' + Date.now();
    set((state) => ({
      classes: [...state.classes, { id, type: 'text', name: 'Note Title', content: 'Double click to edit...\nSupports **bold**, *italic*, and `code`', items: [], x, y, width: w, height: h }],
      selectedIds: [id]
    }));
    get().commitHistory();
    return id;
  },

  addComment: (x = 150, y = 100, w = 120, h = 40) => {
    const id = 'comment-' + Date.now();
    set((state) => ({
      classes: [...state.classes, { id, type: 'comment', name: 'Text', content: 'Double click to edit', items: [], x, y, width: w, height: h, fontSize: 14, borderRadius: 8, textAlign: 'left', paddingX: 10, paddingY: 10 }],
      selectedIds: [id]
    }));
    get().commitHistory();
    return id;
  },

  startDrawingPolygon: () => set(state => {
    if (state.isDrawingPolygon) {
      return { isDrawingPolygon: false, pendingPolygonVertices: [] };
    }
    return { isDrawingPolygon: true, pendingPolygonVertices: [], selectedIds: [], pendingArrowType: null, pendingItemType: null };
  }),

  addPolygonVertex: (x, y) => set(state => ({
    pendingPolygonVertices: [...state.pendingPolygonVertices, { x, y }]
  })),

  finishDrawingPolygon: () => {
    set(state => {
      if (state.pendingPolygonVertices.length < 3) {
        return { isDrawingPolygon: false, pendingPolygonVertices: [] };
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      state.pendingPolygonVertices.forEach(v => {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
      });

      const width = maxX - minX;
      const height = maxY - minY;
      const localVertices = state.pendingPolygonVertices.map(v => ({ x: v.x - minX, y: v.y - minY }));

      const newPolygon: UmlClassType = {
        id: 'polygon-' + Date.now(),
        type: 'polygon',
        name: 'Polygon',
        items: [],
        x: minX,
        y: minY,
        width,
        height,
        vertices: localVertices,
        color: 'slate',
        fillOpacity: 0.2,
        strokeStyle: 'solid',
        borderRadius: 0
      };

      return {
        classes: [...state.classes, newPolygon],
        isDrawingPolygon: false,
        pendingPolygonVertices: [],
        selectedIds: [newPolygon.id]
      };
    });
    get().commitHistory();
  },

  deletePolygonVertex: (classId, vertexIndex) => {
    set((state) => ({
      classes: state.classes.map(c => {
        if (c.id === classId && c.type === 'polygon' && c.vertices && c.vertices.length > 3) {
          const newVertices = [...c.vertices];
          newVertices.splice(vertexIndex, 1);
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          newVertices.forEach(v => {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
          });
          const dx = minX;
          const dy = minY;
          const finalVertices = newVertices.map(v => ({ x: v.x - dx, y: v.y - dy }));
          return { ...c, x: c.x + dx, y: c.y + dy, width: maxX - minX, height: Math.max(1, maxY - minY), vertices: finalVertices };
        }
        return c;
      })
    }));
    get().commitHistory();
  },

  addPolygonVertexToEdge: (classId, localX, localY) => {
    set((state) => ({
      classes: state.classes.map(c => {
        if (c.id === classId && c.type === 'polygon' && c.vertices) {
          let minSegmentDist = Infinity;
          let insertIndex = -1;
          const pts = c.vertices;
          for (let i = 0; i < pts.length; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % pts.length];

            const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
            let t = ((localX - p1.x) * (p2.x - p1.x) + (localY - p1.y) * (p2.y - p1.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);
            const dist = Math.hypot(localX - projX, localY - projY);

            if (dist < minSegmentDist) {
              minSegmentDist = dist;
              insertIndex = i + 1;
            }
          }

          if (insertIndex !== -1) {
            const newVertices = [...pts];
            newVertices.splice(insertIndex, 0, { x: localX, y: localY });

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            newVertices.forEach(v => { minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y); });
            const dx = minX; const dy = minY;
            const finalVertices = newVertices.map(v => ({ x: v.x - dx, y: v.y - dy }));
            return { ...c, x: c.x + dx, y: c.y + dy, width: maxX - minX, height: Math.max(1, maxY - minY), vertices: finalVertices };
          }
        }
        return c;
      })
    }));
    get().commitHistory();
  },

  deleteClass: (id) => {
    set((state) => ({
      classes: state.classes.filter(c => c.id !== id),
      arrows: state.arrows.map(a => ({
        ...a,
        start: a.start.attachedTo === id ? { ...a.start, attachedTo: null } : a.start,
        end: a.end.attachedTo === id ? { ...a.end, attachedTo: null } : a.end,
      })),
      selectedIds: state.selectedIds.filter(sid => sid !== id),
      editingPolygonId: state.editingPolygonId === id ? null : state.editingPolygonId,
    }));
    get().commitHistory();
  },

  updateClass: (id, updates) => set((state) => ({
    classes: state.classes.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  updateClassHeight: (classId, height) => set((state) => ({
    classes: state.classes.map(c => c.id === classId ? { ...c, height } : c)
  })),

  setEditingPolygonId: (id) => set({ editingPolygonId: id }),

  addItem: (classId) => {
    set((state) => ({ classes: state.classes.map(c => c.id === classId ? { ...c, items: [...c.items, { id: 'item-' + Date.now(), name: '+ property: type' }] } : c) }));
    get().commitHistory();
  },
  updateItem: (classId, itemId, name) => set((state) => ({ classes: state.classes.map(c => c.id === classId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, name } : i) } : c) })),
  deleteItem: (classId, itemId) => {
    set((state) => ({ classes: state.classes.map(c => c.id === classId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c) }));
    get().commitHistory();
  },
});