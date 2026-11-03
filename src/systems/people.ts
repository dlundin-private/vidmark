import type { NpcId } from '../../content/data/npcs';
import type { Footprint, Tile } from '../iso/types';
import { isBeside } from './interaction';
import { TileWalker } from './movement';
import { findPath, NEIGHBOUR_OFFSETS, type WalkGrid } from './pathfinding';

/** What the people simulation needs from the world. */
export interface PeopleWorld extends WalkGrid {
  isIce(x: number, y: number): boolean;
  /** Tells the world where someone now stands, so they block that tile. */
  placePerson(id: NpcId, tile: Tile): void;
  /** Someone is about to step onto a tile. Return true if it gave way under them: they stay where they were. */
  stepping?(id: NpcId, from: Tile, to: Tile): boolean;
}

export interface PersonSetup {
  id: NpcId;
  home: Tile;
  /** How far from home they wander; 0 = they stay put. */
  radius: number;
  /** Only wander on ice (Lilja). */
  onIce?: boolean;
}

export interface MeetingDef {
  a: NpcId;
  b: NpcId;
  knot: string;
}

export interface PeopleTiming {
  msPerTile: number;
  stepsPerTile: number;
  idleMs: readonly [number, number];
  meetingIntervalMs: readonly [number, number];
  meetingMaxDistance: number;
}

/** What the scene tells the simulation each frame. */
export interface PeopleContext {
  signe: Tile;
  /** Signe's next few steps: nobody steps in front of her. */
  signeRoute: readonly Tile[];
  /** People who must hold still (Signe is talking to them or walking over to). */
  frozen: ReadonlySet<NpcId>;
  /** Starts a meeting's lines; returns how long it lasts in ms, or 0 if it has nothing to say. */
  meet(meeting: MeetingDef): number;
}

type Mode = 'idle' | 'wander' | 'toMeet' | 'waitMeet' | 'talk' | 'home';

interface Person extends PersonSetup {
  walker: TileWalker;
  route: Tile[];
  mode: Mode;
  until: number;
  blockedFor: number;
  meeting: MeetingDef | null;
  /** A Hollow: stands where they are, goes nowhere, meets nobody. */
  hollow: boolean;
  /** Left the region: nowhere on the map at all. */
  gone: boolean;
}

/**
 * Moves the people of the village: small walks around their spot, and now and
 * then two of them walking over to each other to talk before going back.
 * Logical positions are whole tiles, like Signe's; each step reserves the tile
 * it walks into, so people never walk through each other or through Signe.
 */
export class PeopleSim {
  private readonly people: Person[];
  private now = 0;
  private nextMeetingAt: number;

  constructor(
    private readonly world: PeopleWorld,
    setups: readonly PersonSetup[],
    private readonly meetings: readonly MeetingDef[],
    private readonly timing: PeopleTiming,
    private readonly random: () => number = Math.random,
  ) {
    this.people = setups.map((p) => ({
      ...p,
      home: { ...p.home },
      walker: new TileWalker(p.home, timing.msPerTile, timing.stepsPerTile),
      route: [],
      mode: 'idle',
      until: this.between(timing.idleMs),
      blockedFor: 0,
      meeting: null,
      hollow: false,
      gone: false,
    }));
    this.nextMeetingAt = this.between(timing.meetingIntervalMs);
  }

  /** Where someone logically stands. */
  tileOf(id: NpcId): Tile {
    return this.person(id).walker.tile;
  }

  /** Someone's footprint for depth sorting: both tiles while between them. */
  footprintOf(id: NpcId): Footprint {
    return this.person(id).walker.footprint;
  }

  /** Interpolated position for drawing. */
  visualOf(id: NpcId): { x: number; y: number } {
    return this.person(id).walker.visual;
  }

  /** Someone has left the region (taken by the Tithe): they are nowhere on the map, and do nothing. */
  setGone(id: NpcId): void {
    const p = this.person(id);
    if (p.gone) return;
    p.gone = true;
    p.hollow = true;
    if (p.meeting) this.endMeeting(p.meeting);
    p.route = [];
    const nowhere = { x: -1000, y: -1000 };
    p.walker.teleport(nowhere);
    this.world.placePerson(id, nowhere);
  }

  /** Someone has a new spot (the world changed): they walk there and wander around it from now on. */
  moveTo(id: NpcId, home: Tile, radius: number, onIce: boolean): void {
    const p = this.person(id);
    if (p.gone) return;
    if (p.home.x === home.x && p.home.y === home.y && p.radius === radius) return;
    if (p.meeting) this.endMeeting(p.meeting);
    p.home = { ...home };
    p.radius = radius;
    p.onIce = onIce;
    p.route = this.routeHome(p);
    p.mode = p.route.length > 0 ? 'home' : 'idle';
    // No way to walk there (across the lake, say): they are simply there next time she looks.
    const at = p.walker.tile;
    if (p.route.length === 0 && (at.x !== home.x || at.y !== home.y) && !this.world.isBlocked(home.x, home.y)) {
      p.walker.teleport(home);
      this.world.placePerson(id, home);
    }
  }

  /** Where someone's spot is now. */
  homeOf(id: NpcId): Tile {
    return this.person(id).home;
  }

  /** Someone became a Hollow (or is one from the start): they stop where they stand. */
  setHollow(id: NpcId, hollow: boolean): void {
    const p = this.person(id);
    if (p.gone || p.hollow === hollow) return;
    p.hollow = hollow;
    if (hollow && p.meeting) this.endMeeting(p.meeting);
  }

  isTalking(id: NpcId): boolean {
    return this.person(id).mode === 'talk';
  }

  update(deltaMs: number, ctx: PeopleContext): void {
    this.now += deltaMs;
    for (const p of this.people) p.walker.update(deltaMs);
    if (this.now >= this.nextMeetingAt) {
      this.startMeeting();
      this.nextMeetingAt = this.now + this.between(this.timing.meetingIntervalMs);
    }
    for (const p of this.people) this.think(p, deltaMs, ctx);
  }

  private think(p: Person, deltaMs: number, ctx: PeopleContext): void {
    if (p.walker.isMoving) return;
    if (ctx.frozen.has(p.id) || p.hollow) {
      p.route = [];
      if (p.mode === 'wander') p.mode = 'idle';
      return;
    }

    if (p.route.length > 0) return this.step(p, deltaMs, ctx);

    // Arrived somewhere (or nowhere to go).
    switch (p.mode) {
      case 'wander':
      case 'home':
        p.mode = 'idle';
        p.until = this.now + this.between(this.timing.idleMs);
        return;
      case 'toMeet': {
        const m = p.meeting!;
        const other = this.person(m.a === p.id ? m.b : m.a);
        if (!isBeside(p.walker.tile, other.walker.tile)) return this.endMeeting(m);
        const ms = ctx.meet(m);
        if (ms <= 0) return this.endMeeting(m);
        for (const q of [p, other]) {
          q.mode = 'talk';
          q.until = this.now + ms;
        }
        return;
      }
      case 'talk':
        if (this.now >= p.until) this.endMeeting(p.meeting!);
        return;
      case 'waitMeet':
        // Waiting for the other to arrive; give up if it takes far too long.
        if (this.now >= p.until) this.endMeeting(p.meeting!);
        return;
      case 'idle':
        if (this.now < p.until) return;
        // Far from their spot (they were moved, or the way was blocked): head back first.
        if (Math.abs(p.walker.tile.x - p.home.x) + Math.abs(p.walker.tile.y - p.home.y) > p.radius) {
          p.route = this.routeHome(p);
          p.mode = 'home';
          if (p.route.length > 0) return;
          p.mode = 'idle';
        }
        if (p.radius > 0) this.wander(p);
        else p.until = this.now + this.between(this.timing.idleMs);
    }
  }

  /** Takes the next step of a route, if the tile is free; otherwise waits, then plans again. */
  private step(p: Person, deltaMs: number, ctx: PeopleContext): void {
    const next = p.route[0]!;
    const inSignesWay =
      (next.x === ctx.signe.x && next.y === ctx.signe.y) || ctx.signeRoute.slice(0, 3).some((t) => t.x === next.x && t.y === next.y);
    if (this.world.isBlocked(next.x, next.y) || inSignesWay) {
      p.blockedFor += deltaMs;
      if (p.blockedFor > 1500) {
        p.blockedFor = 0;
        const goal = p.route[p.route.length - 1]!;
        p.route = this.routeTo(p, goal) ?? [];
        if (p.route.length === 0 && p.mode === 'toMeet') this.endMeeting(p.meeting!);
      }
      return;
    }
    p.blockedFor = 0;
    p.route.shift();
    if (this.world.stepping?.(p.id, p.walker.tile, next)) {
      // Went through and climbed back out: stand still a good while.
      p.route = [];
      if (p.meeting) this.endMeeting(p.meeting);
      p.mode = 'idle';
      p.until = this.now + 4 * this.timing.idleMs[1];
      return;
    }
    this.world.placePerson(p.id, next);
    p.walker.setPath([next]);
  }

  private wander(p: Person): void {
    for (let tries = 0; tries < 12; tries++) {
      const dx = Math.round((this.random() * 2 - 1) * p.radius);
      const dy = Math.round((this.random() * 2 - 1) * (p.radius - Math.abs(dx)));
      const goal = { x: p.home.x + dx, y: p.home.y + dy };
      if (goal.x === p.walker.tile.x && goal.y === p.walker.tile.y) continue;
      if (!this.allowed(p, goal)) continue;
      const route = this.routeTo(p, goal);
      // Only short walks that stay inside the area.
      if (route && route.length <= p.radius * 3 && route.every((t) => this.allowed(p, t))) {
        p.route = route;
        p.mode = 'wander';
        return;
      }
    }
    p.until = this.now + this.between(this.timing.idleMs);
  }

  private allowed(p: Person, t: Tile): boolean {
    if (Math.abs(t.x - p.home.x) + Math.abs(t.y - p.home.y) > p.radius) return false;
    if (p.onIce && !this.world.isIce(t.x, t.y)) return false;
    return !this.world.isBlocked(t.x, t.y);
  }

  private routeTo(p: Person, goal: Tile): Tile[] | null {
    return findPath(this.world, p.walker.tile, goal);
  }

  private startMeeting(): void {
    const free = (id: NpcId) => {
      const p = this.person(id);
      return p.mode === 'idle' && !p.walker.isMoving && !p.hollow;
    };
    const options = this.meetings.filter((m) => {
      const a = this.person(m.a);
      const b = this.person(m.b);
      return free(m.a) && free(m.b) && Math.abs(a.home.x - b.home.x) + Math.abs(a.home.y - b.home.y) <= this.timing.meetingMaxDistance;
    });
    if (options.length === 0) return;
    const m = options[Math.floor(this.random() * options.length)]!;
    // Whoever wanders further walks over; someone who stays put (Torvald fishing) is visited.
    const [mover, host] = this.person(m.a).radius >= this.person(m.b).radius ? [this.person(m.a), this.person(m.b)] : [this.person(m.b), this.person(m.a)];
    if (mover.radius === 0 && host.radius === 0) return;
    let best: Tile[] | null = null;
    for (const o of NEIGHBOUR_OFFSETS) {
      const route = this.routeTo(mover, { x: host.walker.tile.x + o.x, y: host.walker.tile.y + o.y });
      if (route && (!best || route.length < best.length)) best = route;
    }
    if (!best) return;
    mover.route = best;
    mover.mode = 'toMeet';
    mover.meeting = m;
    host.mode = 'waitMeet';
    host.meeting = m;
    host.until = this.now + (best.length + 6) * this.timing.msPerTile * 2;
  }

  /** Both go back to their spots. */
  private endMeeting(m: MeetingDef): void {
    for (const id of [m.a, m.b]) {
      const p = this.person(id);
      p.meeting = null;
      p.route = this.routeHome(p);
      p.mode = p.route.length > 0 ? 'home' : 'idle';
      p.until = this.now + this.between(this.timing.idleMs);
    }
  }

  private routeHome(p: Person): Tile[] {
    const at = p.walker.tile;
    if (at.x === p.home.x && at.y === p.home.y) return [];
    return this.routeTo(p, p.home) ?? [];
  }

  private person(id: NpcId): Person {
    const p = this.people.find((x) => x.id === id);
    if (!p) throw new Error(`No person "${id}" on the map`);
    return p;
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.random() * (max - min);
  }
}
