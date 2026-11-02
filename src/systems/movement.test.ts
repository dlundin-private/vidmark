import { describe, expect, it } from 'vitest';
import { TileWalker } from './movement';

describe('TileWalker', () => {
  const MS = 200;
  const STEPS = 8;

  it('stands still on a whole tile without a path', () => {
    const w = new TileWalker({ x: 2, y: 3 }, MS, STEPS);
    expect(w.isMoving).toBe(false);
    expect(w.update(1000)).toEqual([]);
    expect(w.visual).toEqual({ x: 2, y: 3 });
  });

  it('keeps the logical tile whole until a step completes', () => {
    const w = new TileWalker({ x: 0, y: 0 }, MS, STEPS);
    w.setPath([{ x: 1, y: 0 }, { x: 2, y: 0 }]);
    w.update(MS / 2);
    expect(w.tile).toEqual({ x: 0, y: 0 });
    expect(w.visual).toEqual({ x: 0.5, y: 0 });
    expect(w.update(MS / 2)).toEqual([{ x: 1, y: 0 }]);
    expect(w.tile).toEqual({ x: 1, y: 0 });
  });

  it('quantises the visual position to whole steps', () => {
    const w = new TileWalker({ x: 0, y: 0 }, MS, STEPS);
    w.setPath([{ x: 0, y: 1 }]);
    w.update(MS / STEPS - 1);
    expect(w.visual).toEqual({ x: 0, y: 0 });
    w.update(1);
    expect(w.visual).toEqual({ x: 0, y: 1 / STEPS });
  });

  it('walks a whole path, entering several tiles in one long update', () => {
    const w = new TileWalker({ x: 0, y: 0 }, MS, STEPS);
    w.setPath([{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }]);
    expect(w.destination).toEqual({ x: 1, y: 2 });
    expect(w.update(MS * 2.5)).toEqual([{ x: 1, y: 0 }, { x: 1, y: 1 }]);
    expect(w.update(MS)).toEqual([{ x: 1, y: 2 }]);
    expect(w.isMoving).toBe(false);
    expect(w.visual).toEqual({ x: 1, y: 2 });
  });

  it('finishes the current step before following a new path', () => {
    const w = new TileWalker({ x: 0, y: 0 }, MS, STEPS);
    w.setPath([{ x: 1, y: 0 }, { x: 2, y: 0 }]);
    w.update(MS / 2);
    expect(w.planningTile).toEqual({ x: 1, y: 0 });
    w.setPath([{ x: 1, y: 1 }]); // planned from (1,0)
    expect(w.update(MS / 2)).toEqual([{ x: 1, y: 0 }]);
    expect(w.update(MS)).toEqual([{ x: 1, y: 1 }]);
  });

  it('reports a footprint covering both tiles mid-step', () => {
    const w = new TileWalker({ x: 4, y: 4 }, MS, STEPS);
    expect(w.footprint).toEqual({ x: 4, y: 4, w: 1, h: 1 });
    w.setPath([{ x: 4, y: 3 }]);
    w.update(1);
    expect(w.footprint).toEqual({ x: 4, y: 3, w: 1, h: 2 });
  });
});
