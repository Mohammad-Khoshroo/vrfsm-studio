import type { Point, UmlClassType } from "./useStore";


export const getOffsetPos = (p1: Point, p2: Point, dist: number): Point => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: p1.x + (dx / len) * dist,
    y: p1.y + (dy / len) * dist
  };
};

export const getRawClassAnchors = (cls: UmlClassType, estimatedH?: number): Point[] => {
  const x = cls.x;
  const y = cls.y;
  const w = cls.width;
  const h = estimatedH || cls.height || 100;
  const clsType = cls.type;

  if (clsType === 'polygon' && cls.vertices) {
    const pts: Point[] = [];
    const len = cls.vertices.length;
    for (let i = 0; i < len; i++) {
      const p1 = cls.vertices[i];
      const p2 = cls.vertices[(i + 1) % len];
      pts.push({ x: x + p1.x, y: y + p1.y });
      for (let j = 1; j <= 3; j++) {
        pts.push({
          x: x + p1.x + (p2.x - p1.x) * (j / 4),
          y: y + p1.y + (p2.y - p1.y) * (j / 4)
        });
      }
    }
    return pts;
  }

  if (clsType === 'shape') {
    if (cls.shapeType === 'ellipse') {
      const pts: Point[] = [];
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.max(0.1, w / 2 - 1);
      const ry = Math.max(0.1, h / 2 - 1);
      const startAngle = -Math.PI / 2;
      for (let i = 0; i < 16; i++) {
        const angle = startAngle + (i * 2 * Math.PI) / 16;
        pts.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
      }
      return pts;
    } else if (cls.shapeType === 'regularPolygon') {
      const sides = cls.sides || 3;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - 1;
      const startAngle = -Math.PI / 2;
      const localPts: Point[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = startAngle + (i * 2 * Math.PI / sides);
        localPts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      
      const pts: Point[] = [];
      for (let i = 0; i < sides; i++) {
        const p1 = localPts[i];
        const p2 = localPts[(i + 1) % sides];
        pts.push({ x: x + p1.x, y: y + p1.y });
        for (let j = 1; j <= 3; j++) {
          pts.push({
            x: x + p1.x + (p2.x - p1.x) * (j / 4),
            y: y + p1.y + (p2.y - p1.y) * (j / 4)
          });
        }
      }
      return pts;
    } else if (cls.shapeType === 'cloud') {
      const cloudNormPts = [
        {nx: 0.21, ny: 0.96}, {nx: 0.09, ny: 0.87}, {nx: 0.00, ny: 0.64}, {nx: 0.09, ny: 0.40},
        {nx: 0.21, ny: 0.32}, {nx: 0.34, ny: 0.08}, {nx: 0.46, ny: 0.00}, {nx: 0.59, ny: 0.06},
        {nx: 0.71, ny: 0.21}, {nx: 0.85, ny: 0.25}, {nx: 0.96, ny: 0.36}, {nx: 1.00, ny: 0.53},
        {nx: 0.96, ny: 0.70}, {nx: 0.91, ny: 0.87}, {nx: 0.84, ny: 0.96}, {nx: 0.63, ny: 0.96},
        {nx: 0.42, ny: 0.96}
      ];
      return cloudNormPts.map(p => ({ x: x + p.nx * w, y: y + p.ny * h }));
    } else if (cls.shapeType === 'rectangle') {
      const localPts = [
        {x: 0, y: 0}, {x: w, y: 0}, {x: w, y: h}, {x: 0, y: h}
      ];
      const pts: Point[] = [];
      for (let i = 0; i < 4; i++) {
        const p1 = localPts[i];
        const p2 = localPts[(i + 1) % 4];
        pts.push({ x: x + p1.x, y: y + p1.y });
        for (let j = 1; j <= 3; j++) {
          pts.push({
            x: x + p1.x + (p2.x - p1.x) * (j / 4),
            y: y + p1.y + (p2.y - p1.y) * (j / 4)
          });
        }
      }
      return pts;
    }
  }

  const points: Point[] = [];
  const segmentsx = 6;
  const segmentsy = 8;

  // Top edge (Left to Right)
  for (let i = 0; i < segmentsy; i++) points.push({ x: x + (w * i) / segmentsy, y: y });
  // Right edge (Top to Bottom)
  for (let i = 0; i < segmentsx; i++) points.push({ x: x + w, y: y + (h * i) / segmentsx });
  // Bottom edge (Right to Left)
  for (let i = 0; i < segmentsy; i++) points.push({ x: x + w - (w * i) / segmentsy, y: y + h });
  // Left edge (Bottom to Top)
  for (let i = 0; i < segmentsx; i++) points.push({ x: x, y: y + h - (h * i) / segmentsx });

  return points;
};

export const getClassAnchors = (cls: UmlClassType, estimatedH?: number): Point[] => {
  const rawPts = getRawClassAnchors(cls, estimatedH);
  if (!cls.rotation) return rawPts;
  
  const w = cls.width;
  const h = estimatedH || cls.height || 100;
  const cx = cls.x + w / 2;
  const cy = cls.y + h / 2;
  const rad = cls.rotation * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  return rawPts.map(p => ({
    x: (p.x - cx) * cos - (p.y - cy) * sin + cx,
    y: (p.x - cx) * sin + (p.y - cy) * cos + cy
  }));
};

export const getRoundedPolygonString = (pts: Point[], radius: number): string => {
  if (pts.length < 3) return '';
  let d = '';
  const len = pts.length;
  for (let i = 0; i < len; i++) {
    let p0 = pts[(i - 1 + len) % len];
    let p1 = pts[i];
    let p2 = pts[(i + 1) % len];

    let d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    let d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    let r = Math.min(radius, d1 / 2, d2 / 2);

    if (r > 0) {
      let pA = { x: p1.x + (p0.x - p1.x) * r / d1, y: p1.y + (p0.y - p1.y) * r / d1 };
      let pB = { x: p1.x + (p2.x - p1.x) * r / d2, y: p1.y + (p2.y - p1.y) * r / d2 };
      if (i === 0) {
        d += `M ${pA.x} ${pA.y} Q ${p1.x} ${p1.y} ${pB.x} ${pB.y}`;
      } else {
        d += ` L ${pA.x} ${pA.y} Q ${p1.x} ${p1.y} ${pB.x} ${pB.y}`;
      }
    } else {
      if (i === 0) d += `M ${p1.x} ${p1.y}`;
      else d += ` L ${p1.x} ${p1.y}`;
    }
  }
  d += ' Z';
  return d;
};

export const getAttachedPos = (classes: UmlClassType[], attachedTo: string | null, anchorIndex: number, fallback: Point): Point => {
  if (!attachedTo) return fallback;
  const cls = classes.find(c => c.id === attachedTo);
  if (!cls) return fallback;
  const h = cls.height || (38 + 20 + 30 + (cls.items.length * 30));
  const points = getClassAnchors(cls, h);
  return points[anchorIndex] || fallback;
};

export const base64ToBlobUrl = (base64: string) => {
  if (!base64.startsWith('data:')) return base64;
  try {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
     return base64;
  }
};

export const calculateLayout = (classes: any[], arrows: any[], type: 'circle' | 'grid' | 'tree' = 'tree') => {
    const updates: Record<string, { x: number, y: number }> = {};
    const n = classes.length;
    if (n === 0) return updates;

    if (type === 'circle') {
        const radius = Math.max(200, n * 60);
        const cx = 500, cy = 400;
        classes.forEach((c, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            updates[c.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
        });
    } else if (type === 'grid') {
        const cols = Math.ceil(Math.sqrt(n));
        const dx = 250, dy = 150;
        const startX = 100, startY = 100;
        classes.forEach((c, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            updates[c.id] = { x: startX + col * dx, y: startY + row * dy };
        });
    } else if (type === 'tree') {
        const incoming: Record<string, number> = {};
        const adj: Record<string, string[]> = {};
        classes.forEach(c => { incoming[c.id] = 0; adj[c.id] = []; });
        arrows.forEach(a => {
            if (a.start.attachedTo && a.end.attachedTo && a.start.attachedTo !== a.end.attachedTo) {
                incoming[a.end.attachedTo] = (incoming[a.end.attachedTo] || 0) + 1;
                adj[a.start.attachedTo].push(a.end.attachedTo);
            }
        });
        const roots = classes.filter(c => incoming[c.id] === 0).map(c => c.id);
        if (roots.length === 0 && classes.length > 0) roots.push(classes[0].id);

        const levels: Record<number, string[]> = {};
        const queue = roots.map(id => ({ id, level: 0 }));
        const visited = new Set(roots);
        let maxLevel = 0;

        while (queue.length > 0) {
            const { id, level } = queue.shift()!;
            if (!levels[level]) levels[level] = [];
            levels[level].push(id);
            maxLevel = Math.max(maxLevel, level);
            
            adj[id].forEach(neighbor => {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ id: neighbor, level: level + 1 });
                }
            });
        }
        
        let nextLevel = maxLevel + 1;
        classes.forEach(c => {
            if (!visited.has(c.id)) {
                if (!levels[nextLevel]) levels[nextLevel] = [];
                levels[nextLevel].push(c.id);
            }
        });

        const dx = 280, dy = 200;
        const startY = 100;
        Object.keys(levels).forEach((lvlStr) => {
            const lvl = parseInt(lvlStr);
            const nodes = levels[lvlStr];
            nodes.forEach((id, i) => {
                const x = 500 + (i - (nodes.length - 1) / 2) * dx;
                const y = startY + lvl * dy;
                updates[id] = { x, y };
            });
        });
    }
    return updates;
};