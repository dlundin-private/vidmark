import type { Tile } from '../iso/types';

/**
 * Which tiles Signe has sketched into her journal map: one bit per tile,
 * stored in the save as base64 (8 KB for a 256 x 256 map).
 */
export class ExploredMap {
  private constructor(
    readonly width: number,
    readonly height: number,
    private readonly bits: Uint8Array,
  ) {}

  static empty(width: number, height: number): ExploredMap {
    return new ExploredMap(width, height, new Uint8Array(Math.ceil((width * height) / 8)));
  }

  static fromBase64(text: string, width: number, height: number): ExploredMap {
    const map = ExploredMap.empty(width, height);
    if (!text) return map;
    const raw = atob(text);
    for (let i = 0; i < Math.min(raw.length, map.bits.length); i++) map.bits[i] = raw.charCodeAt(i);
    return map;
  }

  toBase64(): string {
    let raw = '';
    for (let i = 0; i < this.bits.length; i += 0x2000) raw += String.fromCharCode(...this.bits.subarray(i, i + 0x2000));
    return btoa(raw);
  }

  has(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const i = y * this.width + x;
    return (this.bits[i >> 3]! & (1 << (i & 7))) !== 0;
  }

  /** Marks a tile; returns true if it was new. */
  set(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || this.has(x, y)) return false;
    const i = y * this.width + x;
    this.bits[i >> 3]! |= 1 << (i & 7);
    return true;
  }

  /** Marks every tile within `radius` (a rough circle) of each centre; returns how many were new. */
  sketchAround(centres: readonly Tile[], radius: number): number {
    let added = 0;
    const r2 = radius * radius;
    for (const c of centres) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= r2 && this.set(c.x + dx, c.y + dy)) added++;
        }
      }
    }
    return added;
  }
}

/**
 * The steps Signe has walked since she last stopped to sketch. She can only
 * hold so much in her head: walk too long without stopping, and the start of
 * the way is gone before she can put it down (Daniel's design).
 */
export class SketchMemory {
  private steps: Tile[] = [];

  push(tile: Tile): void {
    this.steps.push({ x: tile.x, y: tile.y });
  }

  get pending(): number {
    return this.steps.length;
  }

  /** Empties the memory: the most recent `limit` steps are kept for sketching, the rest are forgotten. */
  flush(limit: number): { kept: Tile[]; forgotten: number } {
    const forgotten = Math.max(0, this.steps.length - limit);
    const kept = this.steps.slice(forgotten);
    this.steps = [];
    return { kept, forgotten };
  }
}
