import { describe, expect, it } from 'vitest';
import { parseTiledMap, type TiledJson } from './tiledMap';
import { findPath } from './pathfinding';
import kallsjo from '../../assets/maps/kallsjo.json';
import { NPCS } from '../../content/data/npcs';

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
    expect(obj).toEqual({ id: 7, name: 'boathouse', type: 'boathouse', sprite: 'boathouse', npc: null, broken: false, rest: false, inspect: null, footprint: { x: 1, y: 0, w: 2, h: 1 } });
  });

  it('reads the spawn tile from map properties', () => {
    expect(parseTiledMap(tinyMap()).spawn).toEqual({ x: 1, y: 0 });
  });

  it('rejects non-isometric maps', () => {
    expect(() => parseTiledMap({ ...tinyMap(), orientation: 'orthogonal' })).toThrow();
  });
});

describe('the Kallsjö map', () => {
  const map = parseTiledMap(kallsjo as TiledJson);
  // Ground frames (tileset order in scripts/generate-placeholders.mjs).
  const FRAME = { ice: [4, 5], water: 6, road: [8, 9], iceRoad: 10 };
  const frameAt = (x: number, y: number) => map.ground[y * map.width + x] ?? -1;
  const person = (id: string) => map.objects.find((o) => o.npc === id)!.footprint;
  const beside = (x: number, y: number) => [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];

  it('is 256x256 with 32x16 tiles', () => {
    expect([map.width, map.height, map.tileWidth, map.tileHeight]).toEqual([256, 256, 32, 16]);
  });

  it('starts Signe on a free tile', () => {
    expect(map.isBlocked(map.spawn.x, map.spawn.y)).toBe(false);
  });

  it('blocks every object footprint, and the mountains at the edges', () => {
    for (const o of map.objects) {
      const { x, y, w, h } = o.footprint;
      for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) expect(map.isBlocked(tx, ty)).toBe(true);
    }
    for (const [x, y] of [[0, 0], [255, 0], [0, 255], [255, 255]] as const) expect(map.isBlocked(x, y)).toBe(true);
  });

  it('puts every person on the map, each reachable from where Signe starts', () => {
    const people = map.objects.filter((o) => o.npc);
    expect(people.map((o) => o.npc).sort()).toEqual(NPCS.map((n) => n.id).sort());
    for (const p of people) {
      const { x, y } = p.footprint;
      expect(beside(x, y).some((t) => findPath(map, map.spawn, t) !== null)).toBe(true);
    }
  });

  it('names places worth finding, each on the map', () => {
    expect(map.places.length).toBeGreaterThan(10);
    for (const p of map.places) {
      expect(p.tile.x).toBeGreaterThanOrEqual(0);
      expect(p.tile.x).toBeLessThan(256);
    }
    const ids = map.places.map((p) => p.id);
    for (const id of ['island', 'abandoned', 'tithe-sled', 'cairn']) expect(ids).toContain(id);
  });

  it('has Lilja out on the ice, as her dialogue says', () => {
    const { x, y } = person('lilja');
    expect(FRAME.ice).toContain(frameAt(x, y));
  });

  it('has Torvald fishing beside open water', () => {
    const { x, y } = person('torvald');
    expect(beside(x, y).some((t) => frameAt(t.x, t.y) === FRAME.water)).toBe(true);
  });

  it('has an ice road across the lake, and roads out through passes north and south', () => {
    const iceRoad = [];
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (frameAt(x, y) === FRAME.iceRoad) iceRoad.push(y);
    expect(Math.max(...iceRoad) - Math.min(...iceRoad)).toBeGreaterThan(100);
    const roadAt = (y: number) => [...Array(map.width).keys()].find((x) => FRAME.road.includes(frameAt(x, y)!) && !map.isBlocked(x, y));
    for (const edge of [0, map.height - 1]) {
      const x = roadAt(edge);
      expect(x).toBeDefined();
      expect(findPath(map, map.spawn, { x: x!, y: edge })).not.toBeNull();
    }
  });
});
