import { describe, expect, it } from 'vitest';
import type { NpcId } from '../../content/data/npcs';
import type { Tile } from '../iso/types';
import { PeopleSim, type MeetingDef, type PeopleContext, type PeopleWorld, type PersonSetup } from './people';

/** A grid of '.' snow, '~' ice, '#' blocked; people block the tiles they stand on. */
function world(rows: string[]): PeopleWorld & { at: Map<NpcId, Tile> } {
  const at = new Map<NpcId, Tile>();
  return {
    at,
    width: rows[0]!.length,
    height: rows.length,
    isIce: (x, y) => rows[y]?.[x] === '~',
    isBlocked: (x, y) =>
      rows[y]?.[x] === undefined || rows[y]![x] === '#' || [...at.values()].some((t) => t.x === x && t.y === y),
    placePerson: (id, tile) => void at.set(id, { ...tile }),
  };
}

function seeded(seed: number): () => number {
  let a = seed;
  return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648);
}

const timing = { msPerTile: 100, stepsPerTile: 4, idleMs: [100, 300] as const, meetingIntervalMs: [500, 800] as const, meetingMaxDistance: 20 };
const ctx = (extra: Partial<PeopleContext> = {}): PeopleContext => ({
  signe: { x: -10, y: -10 },
  signeRoute: [],
  frozen: new Set(),
  meet: () => 0,
  ...extra,
});

function run(sim: PeopleSim, ms: number, c: PeopleContext, each?: () => void): void {
  for (let t = 0; t < ms; t += 50) {
    sim.update(50, c);
    each?.();
  }
}

const open = (w: number, h: number, c = '.') => Array.from({ length: h }, () => c.repeat(w));

function place(w: ReturnType<typeof world>, setups: PersonSetup[]) {
  for (const s of setups) w.placePerson(s.id, s.home);
}

describe('PeopleSim wandering', () => {
  it('keeps people within their radius of home', () => {
    const w = world(open(20, 20));
    const setups: PersonSetup[] = [{ id: 'ebbe', home: { x: 10, y: 10 }, radius: 3 }];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(1));
    let moved = false;
    run(sim, 30000, ctx(), () => {
      const t = sim.tileOf('ebbe');
      expect(Math.abs(t.x - 10) + Math.abs(t.y - 10)).toBeLessThanOrEqual(3);
      if (t.x !== 10 || t.y !== 10) moved = true;
    });
    expect(moved).toBe(true);
  });

  it('never moves someone with radius 0', () => {
    const w = world(open(10, 10));
    const setups: PersonSetup[] = [{ id: 'torvald', home: { x: 5, y: 5 }, radius: 0 }];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(2));
    run(sim, 20000, ctx());
    expect(sim.tileOf('torvald')).toEqual({ x: 5, y: 5 });
  });

  it('keeps someone who plays on the ice on the ice', () => {
    const rows = ['.....~~~~~', '.....~~~~~', '.....~~~~~', '.....~~~~~'];
    const w = world(rows);
    const setups: PersonSetup[] = [{ id: 'lilja', home: { x: 6, y: 1 }, radius: 4, onIce: true }];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(3));
    run(sim, 30000, ctx(), () => {
      const t = sim.tileOf('lilja');
      expect(rows[t.y]![t.x]).toBe('~');
    });
  });

  it('never steps onto Signe, or into her next steps, and holds still when frozen', () => {
    const w = world(open(5, 1));
    const setups: PersonSetup[] = [{ id: 'olle', home: { x: 2, y: 0 }, radius: 2 }];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(4));
    run(sim, 20000, ctx({ signe: { x: 1, y: 0 }, signeRoute: [{ x: 0, y: 0 }] }), () => {
      expect(sim.tileOf('olle').x).toBeGreaterThanOrEqual(2);
    });
    const before = sim.tileOf('olle');
    run(sim, 20000, ctx({ frozen: new Set<NpcId>(['olle']) }));
    expect(sim.tileOf('olle')).toEqual(before);
  });

  it('never lets two people share a tile', () => {
    const w = world(open(6, 6));
    const setups: PersonSetup[] = [
      { id: 'ebbe', home: { x: 2, y: 2 }, radius: 3 },
      { id: 'gerda', home: { x: 3, y: 3 }, radius: 3 },
      { id: 'olle', home: { x: 2, y: 3 }, radius: 3 },
    ];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(5));
    run(sim, 30000, ctx(), () => {
      const tiles = setups.map((s) => sim.tileOf(s.id)).map((t) => `${t.x},${t.y}`);
      expect(new Set(tiles).size).toBe(tiles.length);
    });
  });
});

describe('PeopleSim meetings', () => {
  it('walks one over to the other, plays the meeting, then both go home', () => {
    const w = world(open(20, 5));
    const setups: PersonSetup[] = [
      { id: 'lilja', home: { x: 2, y: 2 }, radius: 2 },
      { id: 'torvald', home: { x: 12, y: 2 }, radius: 0 },
    ];
    place(w, setups);
    const meetings: MeetingDef[] = [{ a: 'lilja', b: 'torvald', knot: 'meet_lilja_torvald' }];
    const met: { at: Tile; with: Tile }[] = [];
    const sim = new PeopleSim(w, setups, meetings, timing, seeded(6));
    const c = ctx({
      meet: () => {
        met.push({ at: sim.tileOf('lilja'), with: sim.tileOf('torvald') });
        return 1000;
      },
    });
    run(sim, 6000, c);
    expect(met.length).toBeGreaterThan(0);
    const first = met[0]!;
    expect(Math.abs(first.at.x - first.with.x) + Math.abs(first.at.y - first.with.y)).toBe(1);
    expect(sim.tileOf('torvald')).toEqual({ x: 12, y: 2 }); // the fisherman stays at his hole
    // After talking, Lilja heads back toward her spot.
    run(sim, 1200, { ...c, meet: () => 0 });
    const t = sim.tileOf('lilja');
    expect(t.x).toBeLessThan(first.at.x);
  });

  it('skips a meeting that has nothing to say (someone hollowed)', () => {
    const w = world(open(10, 3));
    const setups: PersonSetup[] = [
      { id: 'ebbe', home: { x: 1, y: 1 }, radius: 2 },
      { id: 'gerda', home: { x: 6, y: 1 }, radius: 2 },
    ];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [{ a: 'ebbe', b: 'gerda', knot: 'k' }], timing, seeded(7));
    expect(() => run(sim, 8000, ctx())).not.toThrow();
  });

  it('never moves a Hollow, and never sends anyone to meet one', () => {
    const w = world(open(20, 5));
    const setups: PersonSetup[] = [
      { id: 'ebbe', home: { x: 2, y: 2 }, radius: 3 },
      { id: 'gerda', home: { x: 8, y: 2 }, radius: 3 },
    ];
    place(w, setups);
    let meetings = 0;
    const sim = new PeopleSim(w, setups, [{ a: 'ebbe', b: 'gerda', knot: 'k' }], timing, seeded(8));
    sim.setHollow('ebbe', true);
    run(sim, 8000, ctx({ meet: () => { meetings++; return 500; } }), () => {
      expect(sim.tileOf('ebbe')).toEqual({ x: 2, y: 2 });
    });
    expect(meetings).toBe(0);
  });

  it('walks someone to a new spot when the world changes, and they wander there from then on', () => {
    const w = world(open(30, 5));
    const setups: PersonSetup[] = [{ id: 'hermit', home: { x: 2, y: 2 }, radius: 2 }];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(9));
    sim.moveTo('hermit', { x: 25, y: 2 }, 2, false);
    run(sim, 8000, ctx());
    const t = sim.tileOf('hermit');
    expect(Math.abs(t.x - 25) + Math.abs(t.y - 2)).toBeLessThanOrEqual(2);
  });

  it('puts someone straight on their new spot when there is no way to walk there', () => {
    const w = world(['.....#.....']);
    const setups: PersonSetup[] = [{ id: 'hermit', home: { x: 1, y: 0 }, radius: 0 }];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(10));
    sim.moveTo('hermit', { x: 9, y: 0 }, 1, false);
    expect(sim.tileOf('hermit')).toEqual({ x: 9, y: 0 });
  });
});

describe('PeopleSim when the way home is cut off', () => {
  it('gets someone to their spot even if the way there floods behind them', () => {
    const rows = open(20, 3);
    const w = world(rows);
    const setups: PersonSetup[] = [{ id: 'knut', home: { x: 2, y: 1 }, radius: 1 }];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(11));
    sim.moveTo('knut', { x: 17, y: 1 }, 1, false);
    // The water comes up across the middle: nothing can walk through any more.
    const flooded = new Set(['9,0', '9,1', '9,2', '10,0', '10,1', '10,2']);
    const isBlocked = w.isBlocked;
    w.isBlocked = (x, y) => flooded.has(`${x},${y}`) || isBlocked(x, y);
    run(sim, 20000, ctx());
    const t = sim.tileOf('knut');
    expect(Math.abs(t.x - 17) + Math.abs(t.y - 1)).toBeLessThanOrEqual(1);
  });
});

describe('PeopleSim when many go to one place', () => {
  it('gathers several people around a shared spot instead of all on one tile', () => {
    const w = world(open(20, 9));
    const setups: PersonSetup[] = [
      { id: 'edda', home: { x: 2, y: 2 }, radius: 1 },
      { id: 'gudmund', home: { x: 17, y: 2 }, radius: 1 },
      { id: 'clerk', home: { x: 17, y: 6 }, radius: 1 },
    ];
    place(w, setups);
    const sim = new PeopleSim(w, setups, [], timing, seeded(12));
    for (const s of setups) sim.moveTo(s.id, { x: 9, y: 4 }, 3, false);
    run(sim, 20000, ctx());
    for (const s of setups) {
      const t = sim.tileOf(s.id);
      expect(Math.abs(t.x - 9) + Math.abs(t.y - 4)).toBeLessThanOrEqual(4);
    }
  });
});
