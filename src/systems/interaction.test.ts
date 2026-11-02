import { describe, expect, it } from 'vitest';
import { isBeside, pathToBeside } from './interaction';
import type { WalkGrid } from './pathfinding';

function grid(...rows: string[]): WalkGrid {
  return { width: rows[0]!.length, height: rows.length, isBlocked: (x, y) => rows[y]![x] !== '.' };
}

describe('isBeside', () => {
  it('counts the four iso neighbours only', () => {
    expect(isBeside({ x: 2, y: 2 }, { x: 3, y: 2 })).toBe(true);
    expect(isBeside({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(false);
    expect(isBeside({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(false);
  });
});

describe('pathToBeside', () => {
  // N is a person standing on a blocked tile.
  it('walks to the nearest free side', () => {
    const g = grid(
      '.....',
      '..N..',
      '.....',
    );
    expect(pathToBeside(g, { x: 0, y: 1 }, { x: 2, y: 1 })).toEqual([{ x: 1, y: 1 }]);
  });

  it('needs no walking when already beside', () => {
    expect(pathToBeside(grid('.N.'), { x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
  });

  it('goes round to a far side when the near ones are blocked', () => {
    const g = grid(
      '.#...',
      '.#N..',
      '.##..',
      '.....',
    );
    const path = pathToBeside(g, { x: 0, y: 0 }, { x: 2, y: 1 })!;
    expect(isBeside(path.at(-1)!, { x: 2, y: 1 })).toBe(true);
  });

  it('returns null when nobody can reach them', () => {
    const g = grid(
      '.#.',
      '.#N',
    );
    expect(pathToBeside(g, { x: 0, y: 0 }, { x: 2, y: 1 })).toBeNull();
  });
});
