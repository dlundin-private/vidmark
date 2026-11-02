import { describe, expect, it } from 'vitest';
import { parseTiledMap, type TiledJson } from './tiledMap';
import { findPath } from './pathfinding';
import testMap from '../../assets/maps/test-map.json';

function tinyMap(): TiledJson {
  return {
    orientation: 'isometric',
    width: 3,
    height: 2,
    tilewidth: 32,
    tileheight: 16,
    properties: [{ name: 'spawnX', value: 1 }, { name: 'spawnY', value: 0 }],
    tilesets: [{ firstgid: 1, name: 'tiles' }],
    layers: [
      { type: 'tilelayer', name: 'ground', width: 3, height: 2, data: [1, 2, 3, 0, 5, 0x80000001] },
      {
        type: 'objectgroup',
        name: 'objects',
        objects: [{ id: 7, name: 'boathouse', x: 16, y: 0, width: 32, height: 16, properties: [{ name: 'sprite', value: 'boathouse' }] }],
      },
      { type: 'tilelayer', name: 'collision', width: 3, height: 2, data: [0, 8, 8, 0, 0, 0] },
    ],
  };
}

describe('parseTiledMap', () => {
  it('reads ground frames, ignoring flip flags', () => {
    expect(parseTiledMap(tinyMap()).ground).toEqual([0, 1, 2, -1, 4, 0]);
  });

  it('reads collision and treats outside the map as blocked', () => {
    const map = parseTiledMap(tinyMap());
    expect(map.isBlocked(0, 0)).toBe(false);
    expect(map.isBlocked(1, 0)).toBe(true);
    expect(map.isBlocked(5, 5)).toBe(true);
  });

  it('converts isometric object coordinates to tile footprints', () => {
    const [obj] = parseTiledMap(tinyMap()).objects;
    expect(obj).toEqual({ id: 7, name: 'boathouse', sprite: 'boathouse', footprint: { x: 1, y: 0, w: 2, h: 1 } });
  });

  it('reads the spawn tile from map properties', () => {
    expect(parseTiledMap(tinyMap()).spawn).toEqual({ x: 1, y: 0 });
  });

  it('rejects non-isometric maps', () => {
    expect(() => parseTiledMap({ ...tinyMap(), orientation: 'orthogonal' })).toThrow();
  });
});

describe('the step 1 test map', () => {
  const map = parseTiledMap(testMap as TiledJson);
  // Walled off by two birches on purpose, to test clicks on unreachable tiles.
  const UNREACHABLE = { x: 23, y: 23 };

  it('is 24x24 with 32x16 tiles', () => {
    expect([map.width, map.height, map.tileWidth, map.tileHeight]).toEqual([24, 24, 32, 16]);
  });

  it('has the objects the step asks for, each on blocked tiles', () => {
    const names = new Set(map.objects.map((o) => o.name));
    for (const n of ['boathouse', 'birch', 'net-rack', 'statue']) expect(names.has(n)).toBe(true);
    for (const o of map.objects) {
      const { x, y, w, h } = o.footprint;
      for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) expect(map.isBlocked(tx, ty)).toBe(true);
    }
  });

  it('lets Signe walk all the way around every object', () => {
    for (const o of map.objects) {
      const { x, y, w, h } = o.footprint;
      const sides = [
        { x: x - 1, y }, { x: x + w, y }, { x, y: y - 1 }, { x, y: y + h },
      ].filter((t) => t.x >= 0 && t.y >= 0 && t.x < map.width && t.y < map.height && !map.isBlocked(t.x, t.y))
        .filter((t) => !(t.x === UNREACHABLE.x && t.y === UNREACHABLE.y));
      // Objects at the map edge or walling off the test corner may lose a side; the others keep all four.
      if (o.name === 'boathouse' || o.name === 'statue' || o.name === 'net-rack') expect(sides.length).toBe(4);
      for (const s of sides) expect(findPath(map, map.spawn, s)).not.toBeNull();
    }
  });

  it('has an unreachable corner for testing', () => {
    expect(map.isBlocked(UNREACHABLE.x, UNREACHABLE.y)).toBe(false);
    expect(findPath(map, map.spawn, UNREACHABLE)).toBeNull();
  });
});
