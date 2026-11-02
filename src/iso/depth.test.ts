import { describe, expect, it } from 'vitest';
import { compareFootprints, depthOrder, unionFootprint } from './depth';
import type { Footprint } from './types';

const tile = (x: number, y: number): Footprint => ({ x, y, w: 1, h: 1 });
const boathouse: Footprint = { x: 9, y: 17, w: 3, h: 2 };

/** True if `a` is drawn before (behind) `b` in depthOrder. */
function behind(a: Footprint, b: Footprint, ...others: Footprint[]): boolean {
  const order = depthOrder([a, b, ...others]);
  return order.indexOf(0) < order.indexOf(1);
}

describe('compareFootprints', () => {
  it('puts lower x/y further back for single tiles', () => {
    expect(compareFootprints(tile(1, 1), tile(2, 1))).toBeLessThan(0);
    expect(compareFootprints(tile(1, 2), tile(1, 1))).toBeGreaterThan(0);
  });
});

describe('depth around a multi-tile object (3x2 boathouse at 9,17)', () => {
  // Back sides: up-left (lower x) and up-right (lower y) on screen.
  it('draws Signe behind it along the whole back-left side', () => {
    for (let y = 17; y <= 18; y++) expect(behind(tile(8, y), boathouse)).toBe(true);
  });

  it('draws Signe behind it along the whole back-right side', () => {
    for (let x = 9; x <= 11; x++) expect(behind(tile(x, 16), boathouse)).toBe(true);
  });

  // Front sides: down-right (higher x) and down-left (higher y).
  it('draws Signe in front along the whole front-right side', () => {
    for (let y = 17; y <= 18; y++) expect(behind(boathouse, tile(12, y))).toBe(true);
  });

  it('draws Signe in front along the whole front-left side', () => {
    for (let x = 9; x <= 11; x++) expect(behind(boathouse, tile(x, 19))).toBe(true);
  });

  it('gets the sides right where a plain x+y key fails', () => {
    // (12,17): x+y = 29, boathouse back corner 9+17 = 26, front corner 11+18 = 29.
    // A single key per sprite can't order both (12,17) in front and (8,18) behind.
    expect(behind(boathouse, tile(12, 17))).toBe(true);
    expect(behind(tile(8, 18), boathouse)).toBe(true);
    expect(behind(tile(11, 16), boathouse)).toBe(true);
  });

  it('stays correct while Signe is between two tiles', () => {
    // Walking along the back-right side, from (8,16) to (9,16).
    expect(behind(unionFootprint(tile(8, 16), tile(9, 16)), boathouse)).toBe(true);
    // Walking down the front-right side, from (12,16) to (12,17).
    expect(behind(boathouse, unionFootprint(tile(12, 16), tile(12, 17)))).toBe(true);
  });
});

describe('depthOrder', () => {
  it('orders a whole scene consistently', () => {
    const tree = tile(13, 18);
    const statue = tile(8, 15);
    const signe = tile(12, 18);
    const items = [tree, boathouse, signe, statue];
    const order = depthOrder(items).map((i) => items[i]);
    // Every pair that must be ordered is ordered correctly.
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        expect(compareFootprints(order[i]!, order[j]!)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('is deterministic and handles empty input', () => {
    expect(depthOrder([])).toEqual([]);
    const items = [tile(3, 3), tile(0, 0), tile(5, 1), tile(1, 5)];
    expect(depthOrder(items)).toEqual(depthOrder(items));
    expect(depthOrder(items)[0]).toBe(1);
  });

  it('still returns every index if footprints overlap', () => {
    const order = depthOrder([tile(1, 1), { x: 0, y: 0, w: 3, h: 3 }, tile(2, 2)]);
    expect([...order].sort()).toEqual([0, 1, 2]);
  });
});

describe('unionFootprint', () => {
  it('covers both tiles', () => {
    expect(unionFootprint(tile(4, 4), tile(5, 4))).toEqual({ x: 4, y: 4, w: 2, h: 1 });
    expect(unionFootprint(tile(4, 4), tile(4, 3))).toEqual({ x: 4, y: 3, w: 1, h: 2 });
  });
});
