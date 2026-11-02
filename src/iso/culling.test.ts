import { describe, expect, it } from 'vitest';
import { rectsOverlap, tilesInView } from './culling';
import { IsoProjection } from './projection';

const proj = IsoProjection.forMap(64, 32, 16);
const MAP = 64;

describe('tilesInView', () => {
  it('includes every tile that overlaps the view, and nothing that does not', () => {
    const view = { x: 700, y: 200, width: 480, height: 270 };
    const found = new Set(tilesInView(proj, view, MAP, MAP).map((t) => `${t.x},${t.y}`));
    // Brute force over the whole map as the reference.
    for (let y = 0; y < MAP; y++) {
      for (let x = 0; x < MAP; x++) {
        const top = proj.toWorld(x, y);
        const overlaps = rectsOverlap({ x: top.x - 16, y: top.y, width: 32, height: 16 }, view);
        expect(found.has(`${x},${y}`)).toBe(overlaps);
      }
    }
  });

  it('is a few hundred tiles for one screen, not the whole map', () => {
    const n = tilesInView(proj, { x: 700, y: 200, width: 480, height: 270 }, MAP, MAP).length;
    expect(n).toBeGreaterThan(400);
    expect(n).toBeLessThan(700);
  });

  it('clamps to the map at its edges', () => {
    for (const t of tilesInView(proj, { x: -500, y: -500, width: 900, height: 700 }, MAP, MAP)) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
    }
  });
});
