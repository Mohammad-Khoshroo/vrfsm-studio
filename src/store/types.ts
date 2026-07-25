export interface Point {
  x: number;
  y: number;
}

export interface AttachedPoint extends Point {
  attachedTo: string | null;
  anchorIndex: number;
}

export interface UmlItem {
  id: string;
  name: string;
}

export type ClassColor = 'slate' | 'yellow' | 'blue' | 'green' | 'rose' | 'purple' | 'cyan';

export interface BadgeData {
  text: string;
  color: ClassColor;
  icon: string;
}

export interface UmlClassType {
  aspectRatio?: number;
  id: string;
    type?: 'class' | 'text' | 'comment' | 'polygon' | 'image' | 'shape' | 'fsm_state';
  issuedSignals?: string;
  shapeType?: 'rectangle' | 'ellipse' | 'cloud' | 'regularPolygon';
  color?: ClassColor;
  name: string;
  items: UmlItem[];
  content?: string;
  fontSize?: number;
  vertices?: Point[];
  fillOpacity?: number;
  badge?: BadgeData;
  strokeStyle?: 'none' | 'solid' | 'dashed';
  borderRadius?: number;
  textAlign?: 'left' | 'center' | 'right';
  sides?: number; 
  aspectRatioLocked?: boolean; 
  rotation?: number;
  paddingX?: number;
  paddingY?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  groupId?: string;
}

export const ARROW_TYPES = ['association', 'inheritance', 'realization', 'composition', 'aggregation', 'line'] as const;
export type ArrowType = typeof ARROW_TYPES[number];

export type ShapeType = 'rectangle' | 'ellipse' | 'cloud' | 'regularPolygon';

export type PendingItemType = 'class' | 'text' | 'comment' | 'image' | 'shape' | null;

export interface UmlArrowType {
  id: string;
  type: ArrowType;
  color?: ClassColor;
  start: AttachedPoint;
  controlPoints: Point[];
  end: AttachedPoint;
  startLabel: string;
  middleLabel: string;
  endLabel: string;
  startLabelOffset: Point;
  middleLabelOffset: Point;
  endLabelOffset: Point;
  startLabelRotation?: number;
  middleLabelRotation?: number;
  endLabelRotation?: number;
  startLabelFontSize?: number;
  middleLabelFontSize?: number;
  endLabelFontSize?: number;
  groupId?: string;
  issuedSignals?: string;
  allSignals?: string;
  signalsVisible?: boolean;
  signalMode?: 'issued' | 'all';
}

export type DragType = 'class' | 'class-rotate' | 'class-resize' | 'arrow-body' | 'arrow-segment' | 'label' | 'start' | 'end' | 'cp' | 'selection-box' | 'selection-group' | 'selection-group-rotate' | 'polygon-vertex' | 'draw-item' | 'panel-slider' | null;

export interface DragState {
  targetId: string | null;
  type: DragType;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  initialPositions?: Record<string, any>;
  subTarget: string | null;
}

export interface SnapLine {
  type: 'vertical' | 'horizontal';
  position: number;
}

export type ToolType = 'selection' | 'hand' | 'zoom';

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContextMenuState {
  type: 'class' | 'arrow' | 'canvas' | 'anchor' | 'label' | 'polygon-vertex' | 'polygon-edge';
  x: number;
  y: number;
  targetId: string | null;
  subTarget?: string;
  clickPos?: Point;
}

export interface Settings {
  isDarkMode: boolean;
  isSnappingEnabled: boolean;
  isRTL: boolean;
  groupAlignmentMode: 'separate' | 'together';
  gridType: 'dot' | 'grid' | 'none';
  exportScale: number;
  exportTransparent: boolean;
  fontFamily: string;
  customFonts: { name: string, url: string }[];
}

export interface AlertState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

export interface HistorySnapshot {
  classes: UmlClassType[];
  arrows: UmlArrowType[];
}

export interface ClipboardData {
  type: 'mixed';
  data: {
    classes: UmlClassType[];
    arrows: UmlArrowType[];
  };
}

export interface HistorySlice {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export interface CanvasSlice {
  tool: ToolType;
  zoom: number;
  pan: Point;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  settings: Settings;
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: Point | ((prev: Point) => Point)) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setSettings: (updates: Partial<Settings>) => void;
  addCustomFont: (name: string, url: string) => void;
}

export interface ElementSlice {
  isDrawingPolygon: boolean;
  pendingPolygonVertices: Point[];
  editingPolygonId: string | null;
  pendingItemType: PendingItemType;
  pendingShapeType: ShapeType | null;
  pendingImageData: { url: string, width: number, height: number } | null;
  
  setPendingItemType: (type: PendingItemType) => void;
  setPendingShapeType: (type: ShapeType | null) => void;
  setPendingImageData: (data: { url: string, width: number, height: number } | null) => void;
  
  addFsmState: (x?: number, y?: number) => string;
  addClass: (x?: number, y?: number, w?: number, h?: number) => string;
  addImage: (dataUrl: string, width: number, height: number, x?: number, y?: number, startZero?: boolean) => string;
  addShape: (shapeType: ShapeType, x?: number, y?: number, w?: number, h?: number) => string;
  addTextBox: (x?: number, y?: number, w?: number, h?: number) => string;
  addComment: (x?: number, y?: number, w?: number, h?: number) => string;
  autoLayout: (type: 'circle' | 'grid' | 'tree') => void;
  startDrawingPolygon: () => void;
  addPolygonVertex: (x: number, y: number) => void;
  finishDrawingPolygon: () => void;
  deletePolygonVertex: (classId: string, vertexIndex: number) => void;
  addPolygonVertexToEdge: (classId: string, localX: number, localY: number) => void;
  deleteClass: (id: string) => void;
  updateClass: (id: string, updates: Partial<UmlClassType>) => void;
  updateClassHeight: (classId: string, height: number) => void;
  setEditingPolygonId: (id: string | null) => void;

  addItem: (classId: string) => void;
  updateItem: (classId: string, itemId: string, name: string) => void;
  deleteItem: (classId: string, itemId: string) => void;
}

export interface ArrowSlice {
  pendingArrowType: ArrowType | null;
  setPendingArrowType: (type: ArrowType | null) => void;
  startDrawingArrow: (type: ArrowType, localX: number, localY: number, screenX: number, screenY: number) => void;
  deleteArrow: (id: string) => void;
  updateArrow: (id: string, updates: Partial<UmlArrowType>) => void;
  updateAttachedArrows: () => void;
}

export interface SelectionSlice {
  groupSelected: () => void;
  ungroupSelected: () => void;
  removeFromGroup: () => void;
  selectElement: (id: string | null, multi?: boolean, subSelect?: boolean) => void;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  copySelected: () => void;
  pasteFromClipboard: (x: number, y: number) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  setAlignKeyId: (id: string | null) => void;
  alignSelected: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
}

export interface DragSlice {
  dragState: DragState;  
  showAnchors: boolean;
  snapLines: SnapLine[];
  selectionBox: SelectionBox | null;
  startDrag: (state: Partial<DragState>) => void;
  onDrag: (mouseX: number, mouseY: number, deltaX: number, deltaY: number, canvasBounds: DOMRect, isShiftPressed?: boolean) => void;
  endDrag: () => void;
}

export interface AppState extends HistorySlice, CanvasSlice, ElementSlice, ArrowSlice, SelectionSlice, DragSlice {
  classes: UmlClassType[];
  arrows: UmlArrowType[];
  selectedIds: string[];
  contextMenu: ContextMenuState | null;
  clipboard: ClipboardData | null;
  alignKeyId: string | null;
  
  alert: AlertState | null;
  showAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideAlert: () => void;

  loadProject: (data: string) => void;
}