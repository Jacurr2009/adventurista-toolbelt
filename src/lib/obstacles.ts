// Obstacle types and persistence for map tools

export interface ObstacleLine {
  id: string;
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  blocksVision: boolean;
  blocksMovement: boolean;
  isOpening?: boolean; // reverse block — carves through walls
}

export interface ObstacleRect {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  blocksVision: boolean;
  blocksMovement: boolean;
  isOpening?: boolean; // reverse block — carves through walls
}

export type Obstacle = ObstacleLine | ObstacleRect;

export function loadObstacles(mapId: string): Obstacle[] {
  const data = localStorage.getItem(`map-obstacles-${mapId}`);
  return data ? JSON.parse(data) : [];
}

export function saveObstacles(mapId: string, obstacles: Obstacle[]) {
  localStorage.setItem(`map-obstacles-${mapId}`, JSON.stringify(obstacles));
}

export function makeId(): string {
  return `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Get all line segments from an obstacle (rects produce 4 edges) */
export function getObstacleSegments(obs: Obstacle): [number, number, number, number][] {
  if (obs.type === 'line') {
    return [[obs.x1, obs.y1, obs.x2, obs.y2]];
  }
  const { x, y, w, h } = obs;
  return [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ];
}

/** Test if a point lies inside any opening rect/line bounding box (inclusive). */
export function pointInOpening(px: number, py: number, openings: Obstacle[]): boolean {
  for (const op of openings) {
    if (op.type === 'rect') {
      if (px >= op.x && px <= op.x + op.w && py >= op.y && py <= op.y + op.h) return true;
    } else {
      // Treat line opening as a thin band
      const tol = 6;
      const dx = op.x2 - op.x1, dy = op.y2 - op.y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let t = ((px - op.x1) * dx + (py - op.y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = op.x1 + t * dx, projY = op.y1 + t * dy;
      const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
      if (d <= tol) return true;
    }
  }
  return false;
}
