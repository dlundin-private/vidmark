import type { Tile } from '../iso/types';
import { NEIGHBOUR_OFFSETS, findPath, type WalkGrid } from './pathfinding';

/** True if two tiles touch along an iso axis (talking range). */
export function isBeside(a: Tile, b: Tile): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/**
 * The shortest route to any free tile beside `target`, or null if none is
 * reachable. An empty route means Signe is already beside it.
 */
export function pathToBeside(grid: WalkGrid, from: Tile, target: Tile): Tile[] | null {
  if (isBeside(from, target)) return [];
  let best: Tile[] | null = null;
  for (const o of NEIGHBOUR_OFFSETS) {
    const path = findPath(grid, from, { x: target.x + o.x, y: target.y + o.y });
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}
