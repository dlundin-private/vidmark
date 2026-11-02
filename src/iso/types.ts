/** A whole tile on the grid. +x runs down-right on screen, +y runs down-left. */
export interface Tile {
  x: number;
  y: number;
}

/** A point in world pixels (before the camera). */
export interface Point {
  x: number;
  y: number;
}

/** A rectangle of tiles: x..x+w-1 by y..y+h-1. */
export interface Footprint {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function tileKey(t: Tile): string {
  return `${t.x},${t.y}`;
}

export function sameTile(a: Tile, b: Tile): boolean {
  return a.x === b.x && a.y === b.y;
}
