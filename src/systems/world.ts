import type { Footprint, Tile } from '../iso/types';
import type { CraftEffect, GameState } from '../state/GameState';
import type { WalkGrid } from './pathfinding';
import type { IsoMap, MapObject } from './tiledMap';

/** Ground frames (tileset order in scripts/generate-placeholders.mjs). */
const ICE_ROAD_FRAME = 10;
export const THIN_ICE_FRAME = 13;
/** Ice: ice, ice-2, ice road, cracked ice. */
const ICE_FRAMES = new Set([4, 5, ICE_ROAD_FRAME, THIN_ICE_FRAME]);
/** Ground frame shown where the ice has been broken open. */
export const WATER_FRAME = 6;

/** World flags the map reacts to. */
export const FLAG_ICE_ROAD_OPEN = 'ice_road_open';
export const FLAG_KNOWS_SAFE_ROUTE = 'knows_safe_route';

export const tileKey = (x: number, y: number): string => `${x},${y}`;

/**
 * The map as it is now: the static Tiled map plus everything Signe has changed
 * (moved objects, broken ice), read from GameState. Answers "what is here?"
 * for movement, rendering and Craft.
 */
export class WorldModel implements WalkGrid {
  readonly width: number;
  readonly height: number;
  private readonly terrainBlocked: Uint8Array;
  private readonly byId = new Map<number, MapObject>();
  /** Where moving people stand right now. Not saved: they return to their spots. */
  private readonly dynamicAt = new Map<number, Tile>();
  /** Object id per tile (0 = none), rebuilt when the state changes. */
  private occupant = new Int32Array(0);
  private builtFor: GameState | null = null;
  private builtVersion = -1;

  constructor(
    readonly map: IsoMap,
    private readonly state: () => Readonly<GameState>,
    /** Bumped by the owner whenever GameState changes, so the occupancy grid is rebuilt. */
    private readonly version: () => number,
  ) {
    this.width = map.width;
    this.height = map.height;
    // The map's collision layer covers object footprints too; keep only terrain (water, rock).
    const covered = new Uint8Array(map.width * map.height);
    for (const o of map.objects) {
      this.byId.set(o.id, o);
      forTiles(o.footprint, (x, y) => (covered[y * map.width + x] = 1));
    }
    this.terrainBlocked = new Uint8Array(map.width * map.height);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const i = y * map.width + x;
        this.terrainBlocked[i] = map.isBlocked(x, y) && !covered[i] ? 1 : 0;
      }
    }
  }

  get objects(): readonly MapObject[] {
    return this.map.objects;
  }

  object(id: number): MapObject | undefined {
    return this.byId.get(id);
  }

  /** Moves a person (a map object) to a tile, keeping the occupancy grid up to date. */
  placeDynamic(id: number, tile: Tile): void {
    const o = this.byId.get(id);
    if (!o) return;
    const built = this.builtFor === this.state() && this.builtVersion === this.version();
    if (built) forTiles(this.footprintOf(o), (x, y) => this.inMap(x, y) && this.occupant[y * this.width + x] === id && (this.occupant[y * this.width + x] = 0));
    this.dynamicAt.set(id, { x: tile.x, y: tile.y });
    if (built) forTiles(this.footprintOf(o), (x, y) => this.inMap(x, y) && (this.occupant[y * this.width + x] = id));
  }

  /** Where an object is now (Push moves things; people walk about). */
  footprintOf(o: MapObject): Footprint {
    const at = this.dynamicAt.get(o.id) ?? this.state().world.objects[o.id]?.at;
    return at ? { ...o.footprint, x: at.x, y: at.y } : o.footprint;
  }

  /** Whether an object is there at all: some only appear once a quest has ended a certain way. */
  isShown(o: MapObject): boolean {
    return showing(o.show, this.state().flags);
  }

  isBroken(o: MapObject): boolean {
    return this.state().world.objects[o.id]?.broken ?? o.broken;
  }

  objectEffect(o: MapObject): CraftEffect | undefined {
    return this.state().world.objects[o.id]?.effect;
  }

  objectAt(x: number, y: number): MapObject | undefined {
    this.ensureBuilt();
    if (!this.inMap(x, y)) return undefined;
    const id = this.occupant[y * this.width + x]!;
    return id ? this.byId.get(id) : undefined;
  }

  inMap(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Ice that is still whole (Craft surfaces). */
  isIce(x: number, y: number): boolean {
    if (!this.inMap(x, y)) return false;
    return ICE_FRAMES.has(this.map.ground[y * this.width + x] ?? -1) && !this.isBrokenIce(x, y);
  }

  isBrokenIce(x: number, y: number): boolean {
    return (this.state().world.tiles[tileKey(x, y)]?.brokenRestsLeft ?? 0) > 0;
  }

  tileEffect(x: number, y: number): CraftEffect | undefined {
    return this.state().world.tiles[tileKey(x, y)]?.effect;
  }

  /** Ground frame to draw: broken ice shows open water; the reopened road shows as road again. */
  groundFrame(x: number, y: number): number {
    if (this.isBrokenIce(x, y)) return WATER_FRAME;
    const frame = this.map.ground[y * this.width + x] ?? -1;
    if (frame === THIN_ICE_FRAME && this.isReopenedRoad(x)) return ICE_ROAD_FRAME;
    return frame;
  }

  /** Cracked ice, whole but unsafe unless something makes it safe. */
  isThinIce(x: number, y: number): boolean {
    return this.inMap(x, y) && this.map.ground[y * this.width + x] === THIN_ICE_FRAME && !this.isBrokenIce(x, y);
  }

  /** On the hermit's remembered route through the cracked ice. */
  isSafeRoute(x: number, y: number): boolean {
    return this.isThinIce(x, y) && x === this.map.numbers.safeRouteX;
  }

  /**
   * Cracked ice that would break under someone: not strengthened, not on the
   * reopened road, and (for Signe, once she knows it) not on the hermit's route.
   */
  isDangerousIce(x: number, y: number, forSigne: boolean): boolean {
    if (!this.isThinIce(x, y)) return false;
    if (this.tileEffect(x, y)?.kind === 'strengthened') return false;
    if (this.isReopenedRoad(x)) return false;
    if (forSigne && this.state().flags[FLAG_KNOWS_SAFE_ROUTE] && this.isSafeRoute(x, y)) return false;
    return true;
  }

  private isReopenedRoad(x: number): boolean {
    const { iceRoadX0, iceRoadX1 } = this.map.numbers;
    return !!this.state().flags[FLAG_ICE_ROAD_OPEN] && iceRoadX0 !== undefined && iceRoadX1 !== undefined && x >= iceRoadX0 && x <= iceRoadX1;
  }

  /** Row numbers of the cracked-ice band, if the map has one. */
  get band(): { y0: number; y1: number } | null {
    const { bandY0, bandY1 } = this.map.numbers;
    return bandY0 !== undefined && bandY1 !== undefined ? { y0: bandY0, y1: bandY1 } : null;
  }

  isBlocked(x: number, y: number): boolean {
    if (!this.inMap(x, y)) return true;
    const i = y * this.width + x;
    return this.terrainBlocked[i] === 1 || this.isBrokenIce(x, y) || this.objectAt(x, y) !== undefined;
  }

  /** Signe's route planning also steers around her own armed traps and cracked ice she can see. */
  isBlockedForRouting(x: number, y: number): boolean {
    return this.isBlocked(x, y) || this.tileEffect(x, y)?.armed === true || this.isDangerousIce(x, y, true);
  }

  /** Villagers know the cracked ice and keep off it, but they don't know about Signe's traps. */
  isBlockedForPeople(x: number, y: number): boolean {
    return this.isBlocked(x, y) || this.isDangerousIce(x, y, false);
  }

  private ensureBuilt(): void {
    const state = this.state();
    if (this.builtFor === state && this.builtVersion === this.version()) return;
    this.builtFor = state;
    this.builtVersion = this.version();
    this.occupant = new Int32Array(this.width * this.height);
    for (const o of this.map.objects) {
      if (!this.isShown(o)) continue;
      forTiles(this.footprintOf(o), (x, y) => {
        if (this.inMap(x, y)) this.occupant[y * this.width + x] = o.id;
      });
    }
  }
}

/** Reads a map object's show condition against the world flags (see MapObject.show). */
export function showing(condition: string | null, flags: Readonly<Record<string, unknown>>): boolean {
  if (!condition) return true;
  // "!flag": only while the flag is not set (the dam statue, until the dam breaks).
  if (condition.startsWith('!')) return !showing(condition.slice(1), flags);
  const [flag, values] = condition.split('=');
  const v = flags[flag!];
  if (values === undefined) return v !== undefined && v !== false && v !== 0 && v !== '';
  return values.split('|').includes(String(v));
}

export function forTiles(f: Footprint, fn: (x: number, y: number) => void): void {
  for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) fn(x, y);
}

/** Manhattan distance from a tile to the nearest tile of a footprint. */
export function distanceTo(from: Tile, f: Footprint): number {
  const dx = from.x < f.x ? f.x - from.x : from.x >= f.x + f.w ? from.x - (f.x + f.w - 1) : 0;
  const dy = from.y < f.y ? f.y - from.y : from.y >= f.y + f.h ? from.y - (f.y + f.h - 1) : 0;
  return dx + dy;
}
