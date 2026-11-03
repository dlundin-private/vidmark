import type { Footprint, Tile } from '../iso/types';
import type { WalkGrid } from './pathfinding';

/** The subset of the Tiled JSON format we read. */
export interface TiledJson {
  orientation: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  properties?: TiledProperty[];
  tilesets: { firstgid: number; name: string; tilecount?: number }[];
  layers: TiledLayer[];
}

interface TiledProperty {
  name: string;
  type?: string;
  value: unknown;
}

type TiledLayer =
  | { type: 'tilelayer'; name: string; width: number; height: number; data: number[] }
  | { type: 'objectgroup'; name: string; objects: TiledObject[] }
  | { type: string; name: string };

interface TiledObject {
  id: number;
  name: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: TiledProperty[];
}

export interface MapObject {
  id: number;
  name: string;
  /** Kind of object (Tiled's class/type): "boathouse", "birch", "npc"... */
  type: string;
  /** Texture key of the sprite to draw. */
  sprite: string;
  footprint: Footprint;
  /** Person id (content/data/npcs.ts) if this object is someone Signe can talk to. */
  npc: string | null;
  /** Starts broken (Mend can repair it). */
  broken: boolean;
  /** Signe can rest here (her home). */
  rest: boolean;
}

/** A Tiled map reduced to what the world needs: ground frames, collision and objects. */
export interface IsoMap extends WalkGrid {
  readonly tileWidth: number;
  readonly tileHeight: number;
  /** Tileset frame index per tile (row-major), or -1 for no tile. */
  readonly ground: readonly number[];
  readonly objects: readonly MapObject[];
  readonly spawn: Tile;
  /** Whole-number map properties (spawnX, bandY0, safeRouteX...). */
  readonly numbers: Readonly<Record<string, number>>;
}

const LAYER_GROUND = 'ground';
const LAYER_OBJECTS = 'objects';
const LAYER_COLLISION = 'collision';

// Tiled stores flip flags in the top bits of each gid.
const GID_MASK = 0x1fffffff;

export function parseTiledMap(json: TiledJson): IsoMap {
  if (json.orientation !== 'isometric') {
    throw new Error(`Expected an isometric map, got "${json.orientation}"`);
  }
  const { width, height } = json;
  const firstgid = json.tilesets[0]?.firstgid ?? 1;

  const groundLayer = findTileLayer(json, LAYER_GROUND);
  const ground = groundLayer.data.map((gid) => ((gid & GID_MASK) === 0 ? -1 : (gid & GID_MASK) - firstgid));

  const collisionLayer = findTileLayer(json, LAYER_COLLISION);
  const blocked = collisionLayer.data.map((gid) => (gid & GID_MASK) !== 0);

  const objectLayer = json.layers.find(
    (l): l is Extract<TiledLayer, { type: 'objectgroup' }> => l.type === 'objectgroup' && l.name === LAYER_OBJECTS,
  );
  const objects: MapObject[] = (objectLayer?.objects ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    sprite: stringProperty(o.properties, 'sprite') ?? o.name,
    npc: stringProperty(o.properties, 'npc') ?? null,
    type: o.type || o.name,
    broken: boolProperty(o.properties, 'broken'),
    rest: boolProperty(o.properties, 'rest'),
    // Isometric object coordinates are measured along the tile axes in tile-height units.
    footprint: {
      x: Math.round(o.x / json.tileheight),
      y: Math.round(o.y / json.tileheight),
      w: Math.max(1, Math.round(o.width / json.tileheight)),
      h: Math.max(1, Math.round(o.height / json.tileheight)),
    },
  }));

  const spawn = {
    x: numberProperty(json.properties, 'spawnX') ?? 0,
    y: numberProperty(json.properties, 'spawnY') ?? 0,
  };

  const numbers: Record<string, number> = {};
  for (const p of json.properties ?? []) if (typeof p.value === 'number') numbers[p.name] = p.value;

  return {
    width,
    height,
    numbers,
    tileWidth: json.tilewidth,
    tileHeight: json.tileheight,
    ground,
    objects,
    spawn,
    isBlocked(x: number, y: number): boolean {
      return blocked[y * width + x] ?? true;
    },
  };
}

function findTileLayer(json: TiledJson, name: string): { data: number[] } {
  const layer = json.layers.find((l) => l.type === 'tilelayer' && l.name === name);
  if (!layer || !('data' in layer)) throw new Error(`Map has no tile layer "${name}"`);
  if (layer.data.length !== json.width * json.height) {
    throw new Error(`Layer "${name}" has ${layer.data.length} tiles, expected ${json.width * json.height}`);
  }
  return layer;
}

function stringProperty(props: TiledProperty[] | undefined, name: string): string | undefined {
  const v = props?.find((p) => p.name === name)?.value;
  return typeof v === 'string' ? v : undefined;
}

function boolProperty(props: TiledProperty[] | undefined, name: string): boolean {
  return props?.find((p) => p.name === name)?.value === true;
}

function numberProperty(props: TiledProperty[] | undefined, name: string): number | undefined {
  const v = props?.find((p) => p.name === name)?.value;
  return typeof v === 'number' ? v : undefined;
}
