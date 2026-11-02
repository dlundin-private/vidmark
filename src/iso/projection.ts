import type { Footprint, Point, Tile } from './types';

/**
 * Converts between tile coordinates and world pixels for one isometric map.
 *
 * Tile (x, y) is a diamond whose top vertex is at
 *   (originX + (x - y) * tileWidth/2,  originY + (x + y) * tileHeight/2).
 * Fractional tile coordinates are allowed; whole numbers land on the top vertex,
 * x + 0.5 / y + 0.5 on the centre.
 */
export class IsoProjection {
  readonly halfW: number;
  readonly halfH: number;

  constructor(
    readonly tileWidth: number,
    readonly tileHeight: number,
    readonly originX = 0,
    readonly originY = 0,
  ) {
    this.halfW = tileWidth / 2;
    this.halfH = tileHeight / 2;
  }

  /**
   * Projection whose world space starts at (0, topMargin) and fits a
   * map with mapHeight rows exactly (the left corner sits at x = 0), so no world pixel is negative.
   */
  static forMap(mapHeight: number, tileWidth: number, tileHeight: number, topMargin = 0): IsoProjection {
    return new IsoProjection(tileWidth, tileHeight, (mapHeight * tileWidth) / 2, topMargin);
  }

  /** World size of the map's bounding box, including the top margin. */
  worldSize(mapWidth: number, mapHeight: number): { width: number; height: number } {
    return {
      width: (mapWidth + mapHeight) * this.halfW,
      height: this.originY + (mapWidth + mapHeight) * this.halfH,
    };
  }

  /** World point for (possibly fractional) tile coordinates; integers give the top vertex. */
  toWorld(x: number, y: number): Point {
    return {
      x: this.originX + (x - y) * this.halfW,
      y: this.originY + (x + y) * this.halfH,
    };
  }

  /** World point at the centre of a tile, where characters stand. */
  tileCenter(t: Tile): Point {
    return this.toWorld(t.x + 0.5, t.y + 0.5);
  }

  /** Fractional tile coordinates under a world point. */
  toTileFloat(p: Point): { x: number; y: number } {
    const a = (p.x - this.originX) / this.halfW; // x - y
    const b = (p.y - this.originY) / this.halfH; // x + y
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  /**
   * Picking: the tile whose diamond contains the world point. Points exactly on
   * a shared edge belong to the tile further down/right. May return tiles outside the map.
   */
  pick(p: Point): Tile {
    const f = this.toTileFloat(p);
    return { x: Math.floor(f.x), y: Math.floor(f.y) };
  }

  /**
   * World point of a footprint's bottom vertex: the bottom corner of its
   * front-most tile. Object sprites are anchored here (see footprintOrigin).
   */
  footprintBottom(fp: Footprint): Point {
    return this.toWorld(fp.x + fp.w, fp.y + fp.h);
  }

  /**
   * Normalised sprite origin that puts a footprint's bottom vertex on the
   * sprite's bottom edge, for images exactly as wide as the footprint diamond.
   */
  static footprintOrigin(fp: Pick<Footprint, 'w' | 'h'>): { x: number; y: number } {
    return { x: fp.w / (fp.w + fp.h), y: 1 };
  }
}

export function roundPoint(p: Point): Point {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}
