import type { Footprint, Tile } from '../iso/types';
import { unionFootprint } from '../iso/depth';

/**
 * Walks a character tile by tile. The logical position (`tile`) is always a
 * whole tile: it switches to the next tile when a step finishes. In between,
 * `visual` gives the interpolated position for rendering, snapped to
 * `stepsPerTile` increments so the sprite moves in whole-pixel steps.
 */
export class TileWalker {
  private current: Tile;
  private next: Tile | null = null;
  private queue: Tile[] = [];
  private elapsed = 0;

  constructor(
    start: Tile,
    private readonly msPerTile: number,
    private readonly stepsPerTile: number,
  ) {
    this.current = { ...start };
  }

  /** The whole tile the character logically stands on. */
  get tile(): Tile {
    return { ...this.current };
  }

  /** The tile currently being walked into, if any. */
  get target(): Tile | null {
    return this.next ? { ...this.next } : null;
  }

  get isMoving(): boolean {
    return this.next !== null;
  }

  /** Last tile of the planned route (where the character will end up). */
  get destination(): Tile {
    const last = this.queue[this.queue.length - 1] ?? this.next ?? this.current;
    return { ...last };
  }

  /** The tiles still to walk, in order, including the one being entered. */
  get route(): Tile[] {
    return [...(this.next ? [this.next] : []), ...this.queue].map((t) => ({ ...t }));
  }

  /** Where new routes should start: the tile being entered, or the current tile. */
  get planningTile(): Tile {
    return { ...(this.next ?? this.current) };
  }

  /**
   * Replaces the planned route. `path` must start next to `planningTile`
   * (as returned by findPath from it). A step in progress always completes.
   */
  setPath(path: readonly Tile[]): void {
    this.queue = path.map((t) => ({ ...t }));
    if (!this.next) this.startNextStep();
  }

  /** Puts the character straight onto a tile, dropping any route (falling through ice, waking at home). */
  teleport(tile: Tile): void {
    this.current = { ...tile };
    this.next = null;
    this.queue = [];
    this.elapsed = 0;
  }

  /** Advances time. Returns the tiles entered during this update, in order. */
  update(deltaMs: number): Tile[] {
    const entered: Tile[] = [];
    let remaining = deltaMs;
    while (this.next && remaining > 0) {
      const needed = this.msPerTile - this.elapsed;
      if (remaining < needed) {
        this.elapsed += remaining;
        remaining = 0;
      } else {
        remaining -= needed;
        this.current = this.next;
        entered.push({ ...this.current });
        this.next = null;
        this.elapsed = 0;
        this.startNextStep();
      }
    }
    return entered;
  }

  /** Interpolated tile coordinates for rendering, quantised to whole steps. */
  get visual(): { x: number; y: number } {
    if (!this.next) return { ...this.current };
    const t = Math.floor((this.elapsed / this.msPerTile) * this.stepsPerTile) / this.stepsPerTile;
    return {
      x: this.current.x + (this.next.x - this.current.x) * t,
      y: this.current.y + (this.next.y - this.current.y) * t,
    };
  }

  /** Footprint for depth sorting: both tiles while between them, so nothing in front can cover it. */
  get footprint(): Footprint {
    const here: Footprint = { x: this.current.x, y: this.current.y, w: 1, h: 1 };
    return this.next ? unionFootprint(here, { x: this.next.x, y: this.next.y, w: 1, h: 1 }) : here;
  }

  private startNextStep(): void {
    const step = this.queue.shift();
    if (step) this.next = step;
  }
}
