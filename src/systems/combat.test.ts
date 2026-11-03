import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import type { Tile } from '../iso/types';
import { WolfFight, wolfStarts, type FightGrid } from './combat';

/** '.' ice, '#' blocked, 'T' Signe's armed trap ice. */
function grid(rows: string[]): FightGrid & { traps: Set<string> } {
  const traps = new Set<string>();
  rows.forEach((r, y) => [...r].forEach((c, x) => c === 'T' && traps.add(`${x},${y}`)));
  return {
    width: rows[0]!.length,
    height: rows.length,
    traps,
    isBlocked: (x, y) => rows[y]?.[x] === undefined || rows[y]![x] === '#',
    isTrap: (x, y) => traps.has(`${x},${y}`),
  };
}

const t = DEFAULT_TUNING;
const open = (w: number, h: number) => Array.from({ length: h }, () => '.'.repeat(w));
const dist = (a: Tile, b: Tile) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

describe('WolfFight', () => {
  it('shows each wolf\'s run before it acts, and the wolves follow it', () => {
    const fight = new WolfFight(grid(open(12, 12)), { x: 5, y: 10 }, [{ x: 5, y: 1 }], t);
    const shown = fight.wolves[0]!.intent.map((s) => ({ ...s }));
    expect(shown).toHaveLength(t.wolfMoveTiles);
    expect(shown[0]).toEqual({ x: 5, y: 2 });
    fight.endTurn();
    fight.wolvesAct();
    expect(fight.wolves[0]!.at).toEqual(shown.at(-1));
  });

  it('gives Signe two actions, then it is the wolves\' turn', () => {
    const fight = new WolfFight(grid(open(12, 12)), { x: 5, y: 10 }, [{ x: 5, y: 0 }], t);
    expect(fight.actionsLeft).toBe(2);
    const path = fight.movePath({ x: 7, y: 10 })!;
    expect(path).toHaveLength(2);
    fight.moved(path.at(-1)!);
    fight.spend();
    expect(fight.phase).toBe('wolves');
    expect(fight.movePath({ x: 8, y: 10 })).toBeNull();
  });

  it('lets one move go at most a few tiles, and not through a wolf', () => {
    const fight = new WolfFight(grid(open(12, 3)), { x: 1, y: 1 }, [{ x: 2, y: 1 }], t);
    expect(fight.movePath({ x: 1 + t.combatMoveTiles + 1, y: 1 })).toBeNull();
    expect(fight.movePath({ x: 3, y: 1 })).toBeNull(); // around the wolf is 4 tiles
    const around = fight.movePath({ x: 2, y: 0 })!;
    expect(around.some((s) => s.x === 2 && s.y === 1)).toBe(false);
  });

  it('a wolf that ends beside Signe bites; stepping away makes it miss', () => {
    const fight = new WolfFight(grid(open(12, 12)), { x: 5, y: 5 }, [{ x: 5, y: 2 }], t);
    expect(fight.wolves[0]!.bites).toBe(true);
    const away = fight.movePath({ x: 5, y: 8 })!;
    fight.moved(away.at(-1)!);
    expect(fight.wolves[0]!.bites).toBe(false);
    fight.endTurn();
    expect(fight.wolvesAct().some((e) => e.kind === 'bite')).toBe(false);
  });

  it('a wolf that runs onto Signe\'s armed ice goes through and is gone', () => {
    const rows = open(12, 12);
    rows[3] = '.....T......';
    const fight = new WolfFight(grid(rows), { x: 5, y: 10 }, [{ x: 5, y: 1 }, { x: 0, y: 0 }, { x: 11, y: 0 }], t);
    fight.endTurn();
    const events = fight.wolvesAct();
    expect(events).toContainEqual({ kind: 'drowned', wolf: 0, at: { x: 5, y: 3 } });
    expect(fight.wolves[0]!.state).toBe('drowned');
  });

  it('a wolf hit twice runs off; with half the pack down the rest flee', () => {
    const fight = new WolfFight(grid(open(12, 12)), { x: 5, y: 10 }, [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 9, y: 1 }], t);
    expect(fight.hit(0).map((e) => e.kind)).toEqual(['hit']);
    expect(fight.hit(0).map((e) => e.kind)).toEqual(['hit', 'fled']);
    expect(fight.phase).toBe('signe');
    const events = fight.remove(1, 'drowned');
    expect(events.map((e) => e.kind)).toEqual(['drowned', 'fled', 'packFled']);
    expect(fight.phase).toBe('over');
    expect(fight.hunting).toHaveLength(0);
  });

  it('wolves never plan to end on the same tile, and never run through a wall', () => {
    const rows = open(9, 9);
    rows[4] = '###.#####';
    const fight = new WolfFight(grid(rows), { x: 4, y: 8 }, [{ x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }], t);
    for (let turn = 0; turn < 4; turn++) {
      const ends = fight.hunting.map((w) => w.intent.at(-1) ?? w.at).map((s) => `${s.x},${s.y}`);
      expect(new Set(ends).size).toBe(ends.length);
      fight.endTurn();
      fight.wolvesAct();
      for (const w of fight.hunting) expect(rows[w.at.y]![w.at.x]).toBe('.');
    }
    // They found the gap and reached her.
    expect(fight.hunting.some((w) => dist(w.at, fight.signe) === 1)).toBe(true);
  });
});

describe('wolfStarts', () => {
  it('puts the pack ahead of Signe on free tiles, apart from each other', () => {
    const rows = open(20, 20);
    rows[3] = '##########..........';
    const g = grid(rows);
    const starts = wolfStarts({ x: 10, y: 12 }, 3, (x, y) => !g.isBlocked(x, y));
    expect(starts).toHaveLength(3);
    for (const s of starts) {
      expect(s.y).toBeLessThan(12);
      expect(g.isBlocked(s.x, s.y)).toBe(false);
    }
    expect(new Set(starts.map((s) => `${s.x},${s.y}`)).size).toBe(3);
  });
});
