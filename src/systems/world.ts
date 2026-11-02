import type { Footprint, Tile } from '../iso/types';
import type { CraftEffect, GameState } from '../state/GameState';
import type { WalkGrid } from './pathfinding';
import type { IsoMap, MapObject } from './tiledMap';

/** Ground frames that are ice (tileset order in scripts/generate-placeholders.mjs): ice, ice-2, ice road. */
const ICE_FRAMES = new Set([4, 5, 10]);
/** Ground frame shown where the ice has been broken open. */
export const WATER_FRAME = 6;

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

  /** Where an object is now (Push moves things). */
  footprintOf(o: MapObject): Footprint {
    const at = this.state().world.objects[o.id]?.at;
    return at ? { ...o.footprint, x: at.x, y: at.y } : o.footprint;
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

  /** Ground frame to draw: broken ice shows open water. */
  groundFrame(x: number, y: number): number {
    if (this.isBrokenIce(x, y)) return WATER_FRAME;
    return this.map.ground[y * this.width + x] ?? -1;
  }

  isBlocked(x: number, y: number): boolean {
    if (!this.inMap(x, y)) return true;
    const i = y * this.width + x;
    return this.terrainBlocked[i] === 1 || this.isBrokenIce(x, y) || this.objectAt(x, y) !== undefined;
  }

  /** Signe's route planning also steers around her own armed traps. */
  isBlockedForRouting(x: number, y: number): boolean {
    return this.isBlocked(x, y) || this.tileEffect(x, y)?.armed === true;
  }

  private ensureBuilt(): void {
    const state = this.state();
    if (this.builtFor === state && this.builtVersion === this.version()) return;
    this.builtFor = state;
    this.builtVersion = this.version();
    this.occupant = new Int32Array(this.width * this.height);
    for (const o of this.map.objects) {
      forTiles(this.footprintOf(o), (x, y) => {
        if (this.inMap(x, y)) this.occupant[y * this.width + x] = o.id;
      });
    }
  }
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
