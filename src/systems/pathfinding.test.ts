import { describe, expect, it } from 'vitest';
import { findPath, type WalkGrid } from './pathfinding';
import type { Tile } from '../iso/types';

/** Builds a grid from rows of '.' (free) and '#' (blocked). */
function grid(...rows: string[]): WalkGrid {
  return {
    width: rows[0]!.length,
    height: rows.length,
    isBlocked: (x, y) => rows[y]![x] === '#',
  };
}

function expectValidPath(g: WalkGrid, start: Tile, path: Tile[]) {
  let prev = start;
  for (const t of path) {
    expect(Math.abs(t.x - prev.x) + Math.abs(t.y - prev.y)).toBe(1);
    expect(g.isBlocked(t.x, t.y)).toBe(false);
    prev = t;
  }
}

describe('findPath', () => {
  it('walks a straight line on an open grid', () => {
    const g = grid('.....', '.....');
    expect(findPath(g, { x: 0, y: 0 }, { x: 4, y: 0 })).toEqual([
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
    ]);
  });

  it('returns an empty path when already there', () => {
    expect(findPath(grid('...'), { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([]);
  });

  it('finds the shortest way around blocked tiles', () => {
    const g = grid(
      '.....',
      '.###.',
      '...#.',
      '.#...',
    );
    const start = { x: 0, y: 2 };
    const path = findPath(g, start, { x: 4, y: 2 })!;
    expect(path).not.toBeNull();
    expectValidPath(g, start, path);
    expect(path.length).toBe(6); // down, then along the bottom row
    expect(path.at(-1)).toEqual({ x: 4, y: 2 });
  });

  it('never cuts corners diagonally', () => {
    const g = grid(
      '.#',
      '#.',
    );
    expect(findPath(g, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it('returns null for a blocked goal', () => {
    expect(findPath(grid('..#'), { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it('returns null for an unreachable goal', () => {
    const g = grid(
      '...#.',
      '...#.',
      '...#.',
    );
    expect(findPath(g, { x: 0, y: 0 }, { x: 4, y: 1 })).toBeNull();
  });

  it('returns null for a walled-off map corner', () => {
    const g = grid(
      '....',
      '....',
      '...#',
      '..#.',
    );
    expect(findPath(g, { x: 0, y: 0 }, { x: 3, y: 3 })).toBeNull();
  });

  it('returns null for goals outside the map edges', () => {
    const g = grid('...', '...');
    expect(findPath(g, { x: 0, y: 0 }, { x: -1, y: 0 })).toBeNull();
    expect(findPath(g, { x: 0, y: 0 }, { x: 3, y: 0 })).toBeNull();
    expect(findPath(g, { x: 0, y: 0 }, { x: 0, y: 2 })).toBeNull();
  });

  it('can path along the map edges without leaving the map', () => {
    const g = grid(
      '...',
      '##.',
      '...',
    );
    const start = { x: 0, y: 0 };
    const path = findPath(g, start, { x: 0, y: 2 })!;
    expectValidPath(g, start, path);
    for (const t of path) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThan(3);
    }
    expect(path.length).toBe(6);
  });

  it('is deterministic', () => {
    const g = grid('......', '......', '......');
    expect(findPath(g, { x: 0, y: 0 }, { x: 5, y: 2 })).toEqual(findPath(g, { x: 0, y: 0 }, { x: 5, y: 2 }));
  });
});
