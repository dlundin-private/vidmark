import type { Tuning } from '../../content/data/tuning';
import type { Tile } from '../iso/types';
import { isBeside, pathToBeside } from './interaction';
import { findPath, type WalkGrid } from './pathfinding';

// The wolf fight on the ice road (build step 6): turn-based on the same grid as
// the world. Rules from docs/design.md ("Combat: turn-based on the isometric
// grid") and Daniel's step-6 answers (docs/decisions.md):
//   - Signe gets `combatActions` actions a turn: move, use an ability, or interact.
//   - Wolves show where they will run before they act; a wolf that ends beside
//     Signe bites.
//   - A wolf that goes through the ice is gone; one hit `wolfHitsToFlee` times
//     runs off; once half the pack is down, the rest flee.
//   - No running: it ends with the wolves gone, or with Signe fallen.
// Pure logic: the scene draws it and feeds it Craft results.

export type WolfState = 'hunting' | 'fled' | 'drowned' | 'hollowed';

export interface Wolf {
  id: number;
  at: Tile;
  hits: number;
  state: WolfState;
  /** Where it will run on its turn, step by step; shown to the player. */
  intent: Tile[];
  /** Whether that run ends beside Signe as she stands now (shown as a bite). */
  bites: boolean;
}

/** What the fight needs from the world. */
export interface FightGrid extends WalkGrid {
  /** Signe's armed ice: looks whole, breaks under the next weight. Wolves don't see it. */
  isTrap(x: number, y: number): boolean;
}

export type FightEvent =
  | { kind: 'ran'; wolf: number; path: Tile[] }
  | { kind: 'drowned'; wolf: number; at: Tile }
  | { kind: 'bite'; wolf: number }
  | { kind: 'hit'; wolf: number }
  | { kind: 'fled'; wolf: number }
  | { kind: 'packFled' };

type FightTuning = Pick<Tuning, 'combatActions' | 'combatMoveTiles' | 'wolfMoveTiles' | 'wolfHitsToFlee'>;

export class WolfFight {
  readonly wolves: Wolf[];
  actionsLeft: number;
  /** 'signe' while she acts; 'over' once the pack is gone. The scene runs the wolves' turn in between. */
  phase: 'signe' | 'wolves' | 'over' = 'signe';

  constructor(
    private readonly grid: FightGrid,
    public signe: Tile,
    starts: readonly Tile[],
    private readonly t: FightTuning,
  ) {
    this.wolves = starts.map((at, id) => ({ id, at: { ...at }, hits: 0, state: 'hunting', intent: [], bites: false }));
    this.actionsLeft = t.combatActions;
    this.planIntents();
  }

  /** Read through a getter: remove() can end the fight in the middle of the wolves' turn. */
  get isOver(): boolean {
    return this.phase === 'over';
  }

  get hunting(): Wolf[] {
    return this.wolves.filter((w) => w.state === 'hunting');
  }

  wolfAt(x: number, y: number): Wolf | undefined {
    return this.hunting.find((w) => w.at.x === x && w.at.y === y);
  }

  /** A hunting wolf right beside Signe (the one she can hollow). */
  wolfBeside(): Wolf | undefined {
    return this.hunting.find((w) => isBeside(w.at, this.signe));
  }

  /** Signe's route to a tile for one move action, or null if it's too far, blocked or not her turn. */
  movePath(to: Tile): Tile[] | null {
    if (this.phase !== 'signe' || this.actionsLeft <= 0) return null;
    const grid = this.gridWithout((x, y) => !!this.wolfAt(x, y));
    const path = findPath(grid, this.signe, to);
    if (!path || path.length === 0 || path.length > this.t.combatMoveTiles) return null;
    return path;
  }

  /** Signe moved (one action). Her intents-to-bite are re-read from where she now stands. */
  moved(to: Tile): void {
    this.signe = { ...to };
    this.spend();
  }

  /** Signe used an ability or interacted: one action. */
  spend(): void {
    if (this.phase !== 'signe') return;
    this.actionsLeft = Math.max(0, this.actionsLeft - 1);
    this.refreshBites();
    if (this.actionsLeft === 0 && this.phase === 'signe') this.phase = 'wolves';
  }

  /** Signe gives up her remaining actions. */
  endTurn(): void {
    if (this.phase === 'signe') this.phase = 'wolves';
  }

  /** A wolf was struck (a pushed crate). Hit often enough, it runs. */
  hit(id: number): FightEvent[] {
    const w = this.wolves[id];
    if (!w || w.state !== 'hunting') return [];
    w.hits++;
    const events: FightEvent[] = [{ kind: 'hit', wolf: id }];
    if (w.hits >= this.t.wolfHitsToFlee) {
      w.state = 'fled';
      events.push({ kind: 'fled', wolf: id });
    }
    return [...events, ...this.checkPack()];
  }

  /** A wolf went through the ice (Signe weakened it under them), or she took everything from it. */
  remove(id: number, how: 'drowned' | 'hollowed'): FightEvent[] {
    const w = this.wolves[id];
    if (!w || w.state !== 'hunting') return [];
    w.state = how;
    return [...(how === 'drowned' ? [{ kind: 'drowned', wolf: id, at: { ...w.at } } as const] : []), ...this.checkPack()];
  }

  /**
   * The wolves act, one after another, along the runs they showed. A run stops
   * short of anything now in the way; Signe's armed ice takes a wolf down.
   * Then each wolf beside Signe bites, and the next turn's runs are planned.
   */
  wolvesAct(): FightEvent[] {
    if (this.phase === 'over') return [];
    const events: FightEvent[] = [];
    for (const w of this.hunting) {
      const path: Tile[] = [];
      for (const step of w.intent) {
        const taken = (step.x === this.signe.x && step.y === this.signe.y) || this.wolves.some((o) => o !== w && o.state === 'hunting' && o.at.x === step.x && o.at.y === step.y);
        if (taken || this.grid.isBlocked(step.x, step.y)) break;
        w.at = { ...step };
        path.push(step);
        if (this.grid.isTrap(step.x, step.y)) break;
      }
      if (path.length > 0) events.push({ kind: 'ran', wolf: w.id, path });
      if (this.grid.isTrap(w.at.x, w.at.y)) {
        events.push(...this.remove(w.id, 'drowned'));
        if (this.isOver) return events;
        continue;
      }
      if (isBeside(w.at, this.signe)) events.push({ kind: 'bite', wolf: w.id });
    }
    if (!this.isOver) {
      this.phase = 'signe';
      this.actionsLeft = this.t.combatActions;
      this.planIntents();
    }
    return events;
  }

  /** Each wolf's run toward Signe, cut to how far it runs in a turn. Earlier wolves claim their end tiles. */
  planIntents(): void {
    const claimed: Tile[] = [];
    const planned = new Set<Wolf>();
    for (const w of this.hunting) {
      // In the way: where earlier wolves will end up, where later ones stand now, and Signe.
      const others = (x: number, y: number) =>
        claimed.some((c) => c.x === x && c.y === y) ||
        this.hunting.some((o) => o !== w && !planned.has(o) && o.at.x === x && o.at.y === y) ||
        (x === this.signe.x && y === this.signe.y);
      planned.add(w);
      const grid = this.gridWithout(others);
      const route = pathToBeside(grid, w.at, this.signe) ?? [];
      w.intent = route.slice(0, this.t.wolfMoveTiles);
      claimed.push(w.intent.at(-1) ?? w.at);
    }
    this.refreshBites();
  }

  private refreshBites(): void {
    for (const w of this.wolves) w.bites = w.state === 'hunting' && isBeside(w.intent.at(-1) ?? w.at, this.signe);
  }

  /** Half the pack down: the rest give up and flee. */
  private checkPack(): FightEvent[] {
    const down = this.wolves.filter((w) => w.state !== 'hunting').length;
    if (this.phase === 'over' || down < Math.ceil(this.wolves.length / 2)) return [];
    const events: FightEvent[] = [];
    for (const w of this.hunting) {
      w.state = 'fled';
      events.push({ kind: 'fled', wolf: w.id });
    }
    this.phase = 'over';
    return [...events, { kind: 'packFled' }];
  }

  private gridWithout(blocked: (x: number, y: number) => boolean): WalkGrid {
    return { width: this.grid.width, height: this.grid.height, isBlocked: (x, y) => this.grid.isBlocked(x, y) || blocked(x, y) };
  }
}

/** Where the pack comes out of the snow: ahead of Signe (north, the far shore), spread out. */
export function wolfStarts(signe: Tile, count: number, free: (x: number, y: number) => boolean): Tile[] {
  const offsets: [number, number][] = [[-2, -5], [2, -6], [4, -4], [-4, -4], [0, -7], [5, -7]];
  const starts: Tile[] = [];
  for (const [dx, dy] of offsets) {
    if (starts.length >= count) break;
    // The nearest free tile to the wanted spot, not already taken.
    search: for (let r = 0; r <= 3; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          if (Math.abs(ox) + Math.abs(oy) !== r) continue;
          const t = { x: signe.x + dx + ox, y: signe.y + dy + oy };
          if (free(t.x, t.y) && !starts.some((s) => s.x === t.x && s.y === t.y)) {
            starts.push(t);
            break search;
          }
        }
      }
    }
  }
  return starts;
}

/** Saved form of where the fled wolves were: "x,y;x,y". */
export function encodeTrackStarts(tiles: readonly Tile[]): string {
  return tiles.map((t) => `${t.x},${t.y}`).join(';');
}

/**
 * The tracks a fled pack leaves (step 7): from where each wolf turned, a
 * wavering line north toward the far shore, `length` tiles long.
 */
export function trackTiles(encoded: string, length = 12): Set<string> {
  const tiles = new Set<string>();
  for (const part of encoded.split(';')) {
    const [x, y] = part.split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    for (let i = 1; i <= length; i++) tiles.add(`${x! + (Math.floor(i / 4) % 2)},${y! - i}`);
  }
  return tiles;
}
