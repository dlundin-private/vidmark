import type { Tile } from '../iso/types';

/** What pathfinding needs to know about the map. */
export interface WalkGrid {
  readonly width: number;
  readonly height: number;
  isBlocked(x: number, y: number): boolean;
}

export function inBounds(grid: WalkGrid, t: Tile): boolean {
  return t.x >= 0 && t.y >= 0 && t.x < grid.width && t.y < grid.height;
}

export function isWalkable(grid: WalkGrid, t: Tile): boolean {
  return inBounds(grid, t) && !grid.isBlocked(t.x, t.y);
}

/** Movement is along the two iso axes only: no diagonal steps, so no corner cutting. */
export const NEIGHBOUR_OFFSETS: readonly Tile[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/**
 * Shortest path with A* (Manhattan heuristic, 4-neighbourhood).
 * Returns the tiles to walk through, excluding `start` and including `goal`;
 * an empty array if start === goal; null if the goal is blocked, outside the map
 * or unreachable.
 */
export function findPath(grid: WalkGrid, start: Tile, goal: Tile): Tile[] | null {
  if (!isWalkable(grid, goal) || !inBounds(grid, start)) return null;
  if (start.x === goal.x && start.y === goal.y) return [];

  const w = grid.width;
  const size = w * grid.height;
  const index = (x: number, y: number) => y * w + x;
  const gScore = new Float64Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const heuristic = (x: number, y: number) => Math.abs(x - goal.x) + Math.abs(y - goal.y);

  const open = new MinHeap();
  const startIdx = index(start.x, start.y);
  const goalIdx = index(goal.x, goal.y);
  gScore[startIdx] = 0;
  open.push(startIdx, heuristic(start.x, start.y), 0);

  while (open.size > 0) {
    const current = open.pop();
    if (current === goalIdx) return reconstruct(cameFrom, current, startIdx, w);
    if (closed[current]) continue;
    closed[current] = 1;

    const cx = current % w;
    const cy = (current - cx) / w;
    for (const o of NEIGHBOUR_OFFSETS) {
      const nx = cx + o.x;
      const ny = cy + o.y;
      if (!isWalkable(grid, { x: nx, y: ny })) continue;
      const n = index(nx, ny);
      if (closed[n]) continue;
      const g = gScore[current]! + 1;
      if (g < gScore[n]!) {
        gScore[n] = g;
        cameFrom[n] = current;
        open.push(n, g + heuristic(nx, ny), g);
      }
    }
  }
  return null;
}

function reconstruct(cameFrom: Int32Array, end: number, startIdx: number, width: number): Tile[] {
  const path: Tile[] = [];
  for (let i = end; i !== startIdx; i = cameFrom[i]!) {
    const x = i % width;
    path.push({ x, y: (i - x) / width });
  }
  return path.reverse();
}

/**
 * Binary min-heap on f, breaking ties toward larger g (closer to the goal),
 * then insertion order, so paths are deterministic.
 */
class MinHeap {
  private items: { id: number; f: number; g: number; seq: number }[] = [];
  private seq = 0;

  get size(): number {
    return this.items.length;
  }

  push(id: number, f: number, g: number): void {
    this.items.push({ id, f, g, seq: this.seq++ });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.less(l, m)) m = l;
        if (r < this.items.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top.id;
  }

  private less(a: number, b: number): boolean {
    const x = this.items[a]!;
    const y = this.items[b]!;
    return x.f !== y.f ? x.f < y.f : x.g !== y.g ? x.g > y.g : x.seq < y.seq;
  }

  private swap(a: number, b: number): void {
    const t = this.items[a]!;
    this.items[a] = this.items[b]!;
    this.items[b] = t;
  }
}
