import { describe, expect, it } from 'vitest';
import { IsoProjection } from './projection';

describe('IsoProjection', () => {
  const proj = new IsoProjection(32, 16, 100, 50);

  it('puts tile top vertices on the 2:1 iso grid', () => {
    expect(proj.toWorld(0, 0)).toEqual({ x: 100, y: 50 });
    expect(proj.toWorld(1, 0)).toEqual({ x: 116, y: 58 });
    expect(proj.toWorld(0, 1)).toEqual({ x: 84, y: 58 });
    expect(proj.toWorld(3, 2)).toEqual({ x: 116, y: 90 });
  });

  it('gives tile centres half a tile below the top vertex', () => {
    expect(proj.tileCenter({ x: 0, y: 0 })).toEqual({ x: 100, y: 58 });
    expect(proj.tileCenter({ x: 2, y: 5 })).toEqual({ x: 52, y: 114 });
  });

  it('round-trips tile -> world -> tile for whole and fractional tiles', () => {
    for (const [x, y] of [[0, 0], [5, 3], [23, 0], [0, 23], [7.25, 1.5]] as const) {
      const f = proj.toTileFloat(proj.toWorld(x, y));
      expect(f.x).toBeCloseTo(x);
      expect(f.y).toBeCloseTo(y);
    }
  });

  describe('pick', () => {
    it('returns the tile under its centre', () => {
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 6; x++) {
          expect(proj.pick(proj.tileCenter({ x, y }))).toEqual({ x, y });
        }
      }
    });

    it('respects the diamond shape, not the bounding box', () => {
      const top = proj.toWorld(2, 2);
      // Just inside the top vertex belongs to the tile itself...
      expect(proj.pick({ x: top.x, y: top.y + 1 })).toEqual({ x: 2, y: 2 });
      // ...but the bounding box's upper corners belong to the neighbours.
      expect(proj.pick({ x: top.x - 15, y: top.y + 1 })).toEqual({ x: 1, y: 2 });
      expect(proj.pick({ x: top.x + 15, y: top.y + 1 })).toEqual({ x: 2, y: 1 });
    });

    it('picks every pixel of the 32x16 tile image consistently with the diamond', () => {
      const top = proj.toWorld(4, 4);
      let inside = 0;
      for (let py = 0; py < 16; py++) {
        for (let px = 0; px < 32; px++) {
          const p = { x: top.x - 16 + px + 0.5, y: top.y + py + 0.5 };
          const t = proj.pick(p);
          const inDiamond = Math.abs(px + 0.5 - 16) / 16 + Math.abs(py + 0.5 - 8) / 8 <= 1;
          expect(t.x === 4 && t.y === 4).toBe(inDiamond);
          if (inDiamond) inside++;
        }
      }
      // Half the bounding box: the diamonds tile the plane exactly.
      expect(inside).toBe(32 * 16 / 2);
    });

    it('can return tiles outside the map; callers bounds-check', () => {
      expect(proj.pick({ x: 100, y: 40 })).toEqual({ x: -1, y: -1 });
    });
  });

  describe('forMap', () => {
    it('keeps the whole map at non-negative world x with a top margin', () => {
      const p = IsoProjection.forMap(20, 32, 16, 64);
      expect(p.toWorld(0, 20).x).toBe(0); // left corner
      expect(p.toWorld(0, 0).y).toBe(64); // top corner
      expect(p.worldSize(24, 20)).toEqual({ width: 44 * 16, height: 64 + 44 * 8 });
      expect(p.toWorld(24, 0).x).toBe(44 * 16); // right corner
    });
  });

  describe('footprints', () => {
    it('anchors at the bottom vertex of the front-most tile', () => {
      expect(proj.footprintBottom({ x: 2, y: 3, w: 3, h: 2 })).toEqual(proj.toWorld(5, 5));
    });

    it('gives a sprite origin that lines the image up with the footprint diamond', () => {
      expect(IsoProjection.footprintOrigin({ w: 1, h: 1 })).toEqual({ x: 0.5, y: 1 });
      expect(IsoProjection.footprintOrigin({ w: 3, h: 2 })).toEqual({ x: 0.6, y: 1 });
      // A 3x2 sprite is 80 px wide; its left edge must meet the footprint's left vertex.
      const fp = { x: 2, y: 3, w: 3, h: 2 };
      const left = proj.footprintBottom(fp).x - 0.6 * 80;
      expect(left).toBe(proj.toWorld(2, 5).x);
    });
  });
});
