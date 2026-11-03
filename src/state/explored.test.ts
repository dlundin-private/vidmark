import { describe, expect, it } from 'vitest';
import { ExploredMap, SketchMemory } from './explored';

describe('ExploredMap', () => {
  it('marks tiles and round-trips through base64', () => {
    const m = ExploredMap.empty(256, 256);
    expect(m.set(10, 20)).toBe(true);
    expect(m.set(10, 20)).toBe(false);
    expect(m.set(255, 255)).toBe(true);
    const back = ExploredMap.fromBase64(m.toBase64(), 256, 256);
    expect(back.has(10, 20)).toBe(true);
    expect(back.has(255, 255)).toBe(true);
    expect(back.has(11, 20)).toBe(false);
  });

  it('sketches a rough circle around each centre, counting only new tiles', () => {
    const m = ExploredMap.empty(64, 64);
    const first = m.sketchAround([{ x: 30, y: 30 }], 3);
    expect(first).toBe(29); // tiles with dx² + dy² <= 9
    expect(m.sketchAround([{ x: 30, y: 30 }], 3)).toBe(0);
    expect(m.has(33, 30)).toBe(true);
    expect(m.has(33, 33)).toBe(false);
  });

  it('ignores tiles outside the map', () => {
    const m = ExploredMap.empty(8, 8);
    expect(m.sketchAround([{ x: 0, y: 0 }], 2)).toBeLessThan(13);
  });
});

describe('SketchMemory', () => {
  it('keeps a short walk whole', () => {
    const mem = new SketchMemory();
    for (let i = 0; i < 10; i++) mem.push({ x: i, y: 0 });
    const { kept, forgotten } = mem.flush(45);
    expect(kept).toHaveLength(10);
    expect(forgotten).toBe(0);
    expect(mem.pending).toBe(0);
  });

  it('forgets the start of a walk that went on too long', () => {
    const mem = new SketchMemory();
    for (let i = 0; i < 60; i++) mem.push({ x: i, y: 0 });
    const { kept, forgotten } = mem.flush(45);
    expect(forgotten).toBe(15);
    expect(kept[0]).toEqual({ x: 15, y: 0 });
    expect(kept.at(-1)).toEqual({ x: 59, y: 0 });
  });
});
