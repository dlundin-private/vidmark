import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING, type Tuning } from '../../content/data/tuning';
import * as A from '../state/actions';
import { createNewGame, type GameState } from '../state/GameState';
import { cast, planCast, plainSpell, spellCost, stepOnto, type Aim, type CastPlan, type Spell } from './craft';
import { parseTiledMap, type TiledJson } from './tiledMap';
import { WorldModel } from './world';

const t: Tuning = { ...DEFAULT_TUNING };

/**
 * A small test world. Rows: '.' snow, '~' ice, 'W' open water.
 * Objects are placed separately.
 */
function setup(rows: string[], objects: { id: number; type: string; x: number; y: number; w?: number; h?: number; broken?: boolean; npc?: string }[] = []) {
  const height = rows.length;
  const width = rows[0]!.length;
  const ground: number[] = [];
  const collision: number[] = [];
  for (const row of rows) {
    for (const c of row) {
      ground.push(c === '~' ? 5 : c === 'W' ? 7 : 1);
      collision.push(c === 'W' ? 8 : 0);
    }
  }
  for (const o of objects) {
    for (let y = o.y; y < o.y + (o.h ?? 1); y++) for (let x = o.x; x < o.x + (o.w ?? 1); x++) collision[y * width + x] = 8;
  }
  const json: TiledJson = {
    orientation: 'isometric', width, height, tilewidth: 32, tileheight: 16,
    tilesets: [{ firstgid: 1, name: 'tiles' }],
    layers: [
      { type: 'tilelayer', name: 'ground', width, height, data: ground },
      {
        type: 'objectgroup', name: 'objects',
        objects: objects.map((o) => ({
          id: o.id, name: o.npc ?? o.type, type: o.npc ? 'npc' : o.type,
          x: o.x * 16, y: o.y * 16, width: (o.w ?? 1) * 16, height: (o.h ?? 1) * 16,
          properties: [
            ...(o.broken ? [{ name: 'broken', value: true }] : []),
            ...(o.npc ? [{ name: 'npc', value: o.npc }] : []),
          ],
        })),
      },
      { type: 'tilelayer', name: 'collision', width, height, data: collision },
    ],
  };
  let state: GameState = createNewGame(t.basePower);
  state.power = 10;
  let version = 0;
  const world = new WorldModel(parseTiledMap(json), () => state, () => version);
  const run = (spell: Spell, aim: Aim, signe = { x: 0, y: 0 }, pushTo?: { x: number; y: number }) => {
    const plan = planCast(world, state, t, spell, aim, signe, pushTo);
    if (!plan.ok) return { plan, message: null };
    const message = cast(world, state, t, plan);
    version++;
    return { plan, message };
  };
  return { world, get state() { return state; }, set state(s) { state = s; version++; }, run, bump: () => version++ };
}

const reason = (p: CastPlan) => (p.ok ? null : p.reason);

describe('costs', () => {
  it('match the design for plain actions', () => {
    const s = createNewGame(2);
    expect(spellCost(s, t, plainSpell('strengthen', 'object'))).toBe(1);
    expect(spellCost(s, t, plainSpell('mend', 'object'))).toBe(1);
    expect(spellCost(s, t, plainSpell('push', 'object'), 1)).toBe(1);
    expect(spellCost(s, t, plainSpell('push', 'object'), 2)).toBe(1);
    expect(spellCost(s, t, plainSpell('push', 'object'), 3)).toBe(2);
  });

  it('add the parts of a Weave', () => {
    const s = createNewGame(2);
    expect(spellCost(s, t, { action: 'weaken', target: 'surface', modifier: 'trigger', anchored: false })).toBe(2);
    expect(spellCost(s, t, { action: 'weaken', target: 'area', modifier: 'trigger', anchored: false })).toBe(3);
  });

  it('get cheaper as a trained skill levels up, never below 1', () => {
    const s = createNewGame(2);
    const weave: Spell = { action: 'weaken', target: 'area', modifier: 'trigger', anchored: false };
    s.skills.weaken.taught = 2;
    expect(spellCost(s, t, weave)).toBe(1);
  });
});

describe('Strengthen and Weaken on objects', () => {
  it('makes a crate brittle, and a push then breaks it', () => {
    const w = setup(['......'], [{ id: 1, type: 'crate', x: 2, y: 0 }]);
    expect(w.run(plainSpell('weaken', 'object'), { kind: 'object', id: 1 }).message).toContain('brittle');
    const pushed = w.run(plainSpell('push', 'object'), { kind: 'object', id: 1 }, { x: 1, y: 0 });
    expect(pushed.message).toContain('breaks apart');
    expect(w.world.isBroken(w.world.object(1)!)).toBe(true);
  });

  it('a strengthened object cannot be weakened', () => {
    const w = setup(['....'], [{ id: 1, type: 'crate', x: 1, y: 0 }]);
    w.run(plainSpell('strengthen', 'object'), { kind: 'object', id: 1 });
    expect(reason(w.run(plainSpell('weaken', 'object'), { kind: 'object', id: 1 }).plan)).toMatch(/strengthened/);
  });

  it('cannot touch trees or people: they are not made things', () => {
    const w = setup(['....'], [{ id: 1, type: 'birch', x: 1, y: 0 }, { id: 2, type: 'npc', npc: 'ebbe', x: 2, y: 0 }]);
    expect(reason(w.run(plainSpell('strengthen', 'object'), { kind: 'object', id: 1 }).plan)).toMatch(/made things/);
    expect(reason(w.run(plainSpell('strengthen', 'object'), { kind: 'object', id: 2 }).plan)).toMatch(/not people/);
  });

  it('only reaches as far as the craft range, further with the Range modifier', () => {
    const w = setup(['..........'], [{ id: 1, type: 'crate', x: 6, y: 0 }]);
    expect(reason(w.run(plainSpell('strengthen', 'object'), { kind: 'object', id: 1 }).plan)).toMatch(/Too far/);
    const ranged: Spell = { action: 'strengthen', target: 'object', modifier: 'range', anchored: false };
    expect(w.run(ranged, { kind: 'object', id: 1 }).plan.ok).toBe(true);
  });
});

describe('Push', () => {
  it('moves an object straight away, costing 1 per 2 tiles, and updates what blocks', () => {
    const w = setup(['.......'], [{ id: 1, type: 'sled', x: 1, y: 0 }]);
    const { plan } = w.run(plainSpell('push', 'object'), { kind: 'object', id: 1 }, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(plan.ok && plan.cost).toBe(2);
    expect(w.world.footprintOf(w.world.object(1)!)).toMatchObject({ x: 4, y: 0 });
    expect(w.world.isBlocked(1, 0)).toBe(false);
    expect(w.world.isBlocked(4, 0)).toBe(true);
  });

  it('needs Signe in line, and a clear path', () => {
    const w = setup(['....', '....'], [{ id: 1, type: 'crate', x: 1, y: 0 }, { id: 2, type: 'crate', x: 2, y: 0 }]);
    expect(reason(w.run(plainSpell('push', 'object'), { kind: 'object', id: 1 }, { x: 0, y: 1 }).plan)).toMatch(/in line/);
    expect(reason(w.run(plainSpell('push', 'object'), { kind: 'object', id: 1 }, { x: 0, y: 0 }).plan)).toMatch(/in the way/);
  });

  it('in a fight, slams into a wolf in its path and stops there', () => {
    const w = setup(['........'], [{ id: 1, type: 'crate', x: 1, y: 0 }]);
    const wolf = (x: number, y: number) => x === 4 && y === 0;
    const plan = planCast(w.world, w.state, t, plainSpell('push', 'object'), { kind: 'object', id: 1 }, { x: 0, y: 0 }, { x: 6, y: 0 }, wolf);
    expect(plan.ok && plan.hits).toEqual({ x: 4, y: 0 });
    expect(plan.ok && plan.pushTo).toEqual({ x: 3, y: 0 });
    // Right up against it: the crate doesn't move, but still strikes.
    const close = planCast(w.world, w.state, t, plainSpell('push', 'object'), { kind: 'object', id: 1 }, { x: 0, y: 0 }, { x: 2, y: 0 }, (x) => x === 2);
    expect(close.ok && close.pushTo).toEqual({ x: 1, y: 0 });
    expect(close.ok && close.cost).toBe(1);
    expect(cast(w.world, w.state, t, plan as Extract<typeof plan, { ok: true }>)).toContain('slams into the wolf');
  });

  it('will not move things that are not pushable', () => {
    const w = setup(['....'], [{ id: 1, type: 'net-rack', x: 1, y: 0, w: 2 }]);
    expect(reason(w.run(plainSpell('push', 'object'), { kind: 'object', id: 1 }).plan)).toMatch(/will not move/);
  });
});

describe('Mend and training', () => {
  it('repairs torn nets, and trains on each new thing, not on repeats', () => {
    const w = setup(['......'], [
      { id: 1, type: 'net-rack', x: 1, y: 0, w: 2, broken: true },
      { id: 2, type: 'crate', x: 4, y: 0, broken: true },
    ]);
    expect(w.run(plainSpell('mend', 'object'), { kind: 'object', id: 1 }).message).toContain('whole again');
    expect(w.world.isBroken(w.world.object(1)!)).toBe(false);
    expect(reason(w.run(plainSpell('mend', 'object'), { kind: 'object', id: 1 }).plan)).toMatch(/Nothing about it is broken/);
    w.run(plainSpell('mend', 'object'), { kind: 'object', id: 2 }, { x: 3, y: 0 });
    expect(w.state.skills.mend.usedOn).toEqual(['object:1', 'object:2']);
  });

  it('needs more skill for bigger things, or the Size modifier', () => {
    const w = setup(['......'], [{ id: 1, type: 'boat', x: 1, y: 0, w: 2, broken: true }]);
    expect(reason(w.run(plainSpell('mend', 'object'), { kind: 'object', id: 1 }).plan)).toMatch(/too big/);
    const sized: Spell = { action: 'mend', target: 'object', modifier: 'size', anchored: false };
    expect(w.run(sized, { kind: 'object', id: 1 }).plan.ok).toBe(true);
  });

  it("levels up after use on distinct things, and from Ebbe's Offering", () => {
    const s = createNewGame(2);
    expect(A.skillLevel(s, 'mend', t)).toBe(1);
    for (const k of ['a', 'b', 'c']) A.recordSkillUse(s, 'mend', k);
    expect(A.skillLevel(s, 'mend', t)).toBe(2);
    A.recordOffering(s, 'ebbe', t);
    expect(A.skillLevel(s, 'mend', t)).toBe(3);
  });
});

describe('Weaken and Strengthen on ice', () => {
  it('cracks a tile open to water at once, blocking it', () => {
    const w = setup(['.~~~']);
    w.run(plainSpell('weaken', 'surface'), { kind: 'tile', x: 2, y: 0 });
    expect(w.world.isBrokenIce(2, 0)).toBe(true);
    expect(w.world.isBlocked(2, 0)).toBe(true);
  });

  it('cracks a 3x3 area as a Weave', () => {
    const w = setup(['.~~~~', '.~~~~', '.~~~~']);
    const area: Spell = { action: 'weaken', target: 'area', modifier: null, anchored: false };
    const { plan } = w.run(area, { kind: 'tile', x: 2, y: 1 });
    expect(plan.ok && plan.tiles!.length).toBe(9);
  });

  it('never breaks strengthened ice', () => {
    const w = setup(['.~~~']);
    w.run(plainSpell('strengthen', 'surface'), { kind: 'tile', x: 2, y: 0 });
    expect(reason(w.run(plainSpell('weaken', 'surface'), { kind: 'tile', x: 2, y: 0 }).plan)).toMatch(/will not take/);
  });

  it('refuses to break the ice under someone, or under Signe', () => {
    const w = setup(['~~~~'], [{ id: 1, type: 'npc', npc: 'lilja', x: 2, y: 0 }]);
    expect(reason(w.run(plainSpell('weaken', 'surface'), { kind: 'tile', x: 2, y: 0 }).plan)).toMatch(/standing on that ice/);
    expect(reason(w.run(plainSpell('weaken', 'surface'), { kind: 'tile', x: 0, y: 0 }).plan)).toMatch(/your own feet/);
  });

  it('with Trigger lies in wait, and breaks under the next step with a wound', () => {
    const w = setup(['.~~~']);
    const trap: Spell = { action: 'weaken', target: 'surface', modifier: 'trigger', anchored: false };
    w.run(trap, { kind: 'tile', x: 2, y: 0 });
    expect(w.world.isBlocked(2, 0)).toBe(false);
    expect(w.world.isBlockedForRouting(2, 0)).toBe(true);
    expect(stepOnto(w.world, w.state, t, { x: 2, y: 0 })).toBe(true);
    w.bump();
    expect(w.state.wounds).toBe(1);
    expect(w.world.isBrokenIce(2, 0)).toBe(true);
  });

  it('only works on ice', () => {
    const w = setup(['....']);
    expect(reason(w.run(plainSpell('strengthen', 'surface'), { kind: 'tile', x: 1, y: 0 }).plan)).toMatch(/Only ice/);
  });
});

describe('resting', () => {
  it('fades effects, refreezes ice, heals a wound and refills Power', () => {
    const w = setup(['.~~~'], [{ id: 1, type: 'crate', x: 1, y: 0 }]);
    w.run(plainSpell('strengthen', 'object'), { kind: 'object', id: 1 });
    w.run(plainSpell('weaken', 'surface'), { kind: 'tile', x: 3, y: 0 });
    w.state.wounds = 2;
    A.restAtHome(w.state, t);
    w.bump();
    expect(w.world.objectEffect(w.world.object(1)!)).toBeUndefined();
    expect(w.world.isBrokenIce(3, 0)).toBe(false);
    expect(w.state.wounds).toBe(1);
    expect(w.state.power).toBe(A.maxPower(w.state, t));
  });

  it('keeps Duration effects one rest longer, and anchored ones for good', () => {
    const w = setup(['....'], [{ id: 1, type: 'crate', x: 1, y: 0 }, { id: 2, type: 'crate', x: 2, y: 0 }]);
    w.run({ action: 'strengthen', target: 'object', modifier: 'duration', anchored: false }, { kind: 'object', id: 1 });
    w.run({ action: 'strengthen', target: 'object', modifier: null, anchored: true }, { kind: 'object', id: 2 });
    A.restAtHome(w.state, t);
    expect(w.world.objectEffect(w.world.object(1)!)).toBeDefined();
    A.restAtHome(w.state, t);
    expect(w.world.objectEffect(w.world.object(1)!)).toBeUndefined();
    expect(w.world.objectEffect(w.world.object(2)!)?.restsLeft).toBeNull();
  });
});

describe('anchored Weaves', () => {
  it('consuming a Keepsake takes it away, like burning', () => {
    const s = createNewGame(2);
    A.saveWeave(s, { id: 'w1', name: 'Ward', action: 'strengthen', target: 'object', modifier: null, anchor: { kind: 'keepsake', id: 'coat' } }, t);
    expect(A.hasKeepsake(s, 'coat')).toBe(false);
    expect(s.keepsakes.coat.status).toBe('consumed');
    expect(A.availableAnchors(s).some((a) => a.kind === 'keepsake' && a.id === 'coat')).toBe(false);
  });

  it("consuming someone's Offering costs a share of max Power for good", () => {
    const s = createNewGame(2);
    A.recordOffering(s, 'ebbe', t);
    expect(A.maxPower(s, t)).toBe(3);
    A.saveWeave(s, { id: 'w1', name: 'Nets', action: 'mend', target: 'object', modifier: null, anchor: { kind: 'offering', npc: 'ebbe' } }, t);
    expect(A.maxPower(s, t)).toBe(2);
  });

  it('carries at most three Weaves; the rest are known until refocused', () => {
    const s = createNewGame(2);
    for (const id of ['a', 'b', 'c', 'd']) {
      A.saveWeave(s, { id, name: id, action: 'strengthen', target: 'object', modifier: 'range', anchor: null }, t);
    }
    expect(s.heldWeaves).toEqual(['a', 'b', 'c']);
    expect(A.holdWeave(s, 'd', t)).toBe(false);
    A.releaseWeave(s, 'b');
    expect(A.holdWeave(s, 'd', t)).toBe(true);
    expect(A.heldWeaves(s).map((w) => w.id)).toEqual(['a', 'c', 'd']);
    A.deleteWeave(s, 'a');
    expect(s.heldWeaves).toEqual(['c', 'd']);
  });

  it('never offers the hidden Keepsake "your name"', () => {
    expect(A.availableAnchors(createNewGame(2)).some((a) => a.kind === 'keepsake' && a.id === 'name')).toBe(false);
  });

  it('cannot be deleted', () => {
    const s = createNewGame(2);
    A.saveWeave(s, { id: 'w1', name: 'Ward', action: 'strengthen', target: 'object', modifier: null, anchor: { kind: 'keepsake', id: 'coat' } }, t);
    A.saveWeave(s, { id: 'w2', name: 'Plain', action: 'strengthen', target: 'object', modifier: 'range', anchor: null }, t);
    A.deleteWeave(s, 'w1');
    A.deleteWeave(s, 'w2');
    expect(s.weaves.map((w) => w.id)).toEqual(['w1']);
  });
});
