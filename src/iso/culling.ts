import type { IsoProjection } from './projection';
import type { Tile } from './types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Every map tile whose diamond overlaps a world-space rectangle (the camera
 * view), so only those need drawing. Checks the tiles inside the rectangle's
 * bounding box in tile space, then each tile's own image rectangle.
 */
export function tilesInView(proj: IsoProjection, view: Rect, mapWidth: number, mapHeight: number): Tile[] {
  const corners = [
    proj.toTileFloat({ x: view.x, y: view.y }),
    proj.toTileFloat({ x: view.x + view.width, y: view.y }),
    proj.toTileFloat({ x: view.x, y: view.y + view.height }),
    proj.toTileFloat({ x: view.x + view.width, y: view.y + view.height }),
  ];
  const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.x))) - 1);
  const maxX = Math.min(mapWidth - 1, Math.ceil(Math.max(...corners.map((c) => c.x))));
  const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.y))) - 1);
  const maxY = Math.min(mapHeight - 1, Math.ceil(Math.max(...corners.map((c) => c.y))));

  const tiles: Tile[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const top = proj.toWorld(x, y);
      const tileRect = { x: top.x - proj.halfW, y: top.y, width: proj.tileWidth, height: proj.tileHeight };
      if (rectsOverlap(tileRect, view)) tiles.push({ x, y });
    }
  }
  return tiles;
}
