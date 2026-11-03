import { ACTIONS, CRAFTABLES, type CraftAction, type WeaveModifier, type WeaveTarget } from '../../content/data/craft';
import type { NpcId } from '../../content/data/npcs';
import type { Tuning } from '../../content/data/tuning';
import type { Tile } from '../iso/types';
import * as A from '../state/actions';
import type { CraftEffect, GameState, SavedWeave } from '../state/GameState';
import type { MapObject } from './tiledMap';
import { distanceTo, forTiles, tileKey, type WorldModel } from './world';

/** What Signe casts: a plain action, or a saved Weave. */
export interface Spell {
  action: CraftAction;
  target: WeaveTarget;
  modifier: WeaveModifier | null;
  /** From an anchored Weave: effects never fade. */
  anchored: boolean;
}

export const plainSpell = (action: CraftAction, target: WeaveTarget): Spell => ({ action, target, modifier: null, anchored: false });

export function weaveSpell(w: SavedWeave): Spell {
  return { action: w.action, target: w.target, modifier: w.modifier, anchored: w.anchor !== null };
}

/** Where Signe aims: an object, or a tile (for surfaces and areas, and Push's destination). */
export type Aim = { kind: 'object'; id: number } | { kind: 'tile'; x: number; y: number };

export type CastPlan =
  | {
      ok: true;
      spell: Spell;
      cost: number;
      object?: MapObject;
      /** Ice tiles a surface or area spell affects. */
      tiles?: Tile[];
      /** Push: where the object ends up. */
      pushTo?: Tile;
    }
  | { ok: false; reason: string; /** 'range': fine, but Signe must get closer. */ code?: 'range' };

/** Which modifiers make sense for an action and target; the Weave screen offers only these. */
export function allowedModifiers(action: CraftAction, target: WeaveTarget): WeaveModifier[] {
  const onIce = target !== 'object';
  switch (action) {
    case 'strengthen':
      return onIce ? ['duration', 'range', 'size'] : ['duration', 'range'];
    case 'weaken':
      return onIce ? ['duration', 'range', 'size', 'trigger'] : ['duration', 'range'];
    case 'push':
      return ['range'];
    case 'mend':
      return ['range', 'size'];
  }
}

export function allowedTargets(action: CraftAction): WeaveTarget[] {
  return action === 'push' || action === 'mend' ? ['object'] : ['object', 'surface', 'area'];
}

/** Power a spell costs (Push: for this many tiles). */
export function spellCost(state: GameState, t: Tuning, spell: Spell, pushTiles = 1): number {
  let cost =
    spell.action === 'push'
      ? Math.max(1, Math.ceil(pushTiles / t.pushTilesPerPower))
      : t[ACTIONS.find((a) => a.id === spell.action)!.costTuning!];
  const isWeave = spell.modifier !== null || spell.target === 'area';
  if (spell.target === 'area') cost += t.areaTargetCost;
  if (spell.modifier) cost += t.modifierCost;
  const trainable = ACTIONS.find((a) => a.id === spell.action)!.trainable;
  if (isWeave && trainable) {
    const discount = (A.skillLevel(state, spell.action, t) - 1) * t.trainedDiscountPerLevel;
    cost = Math.max(1, cost - discount);
  }
  return cost;
}

/** Checks whether Signe, standing on `signe`, can cast this at `aim`, and what it would do. Changes nothing. */
export function planCast(world: WorldModel, state: GameState, t: Tuning, spell: Spell, aim: Aim, signe: Tile, pushTo?: Tile): CastPlan {
  const reach = spell.modifier === 'range' ? t.craftRangeExtended : t.craftRange;
  const fail = (reason: string): CastPlan => ({ ok: false, reason });
  const tooFar: CastPlan = { ok: false, reason: 'Too far away.', code: 'range' };

  if (spell.target === 'object') {
    const object = aim.kind === 'object' ? world.object(aim.id) : world.objectAt(aim.x, aim.y);
    if (!object) return fail('There is nothing made there to work on.');
    if (!(object.type in CRAFTABLES)) return fail(object.npc ? 'Craft works on made things, not people.' : 'Craft works on made things.');
    const fp = world.footprintOf(object);
    if (distanceTo(signe, fp) > reach) return tooFar;
    const effect = world.objectEffect(object);
    const def = CRAFTABLES[object.type]!;

    switch (spell.action) {
      case 'strengthen':
        return ok(spell, state, t, { object });
      case 'weaken':
        if (effect?.kind === 'strengthened') return fail('It has been strengthened and will not weaken.');
        if (world.isBroken(object)) return fail('It is already broken.');
        return ok(spell, state, t, { object });
      case 'mend': {
        if (!world.isBroken(object)) return fail('Nothing about it is broken.');
        const level = A.skillLevel(state, 'mend', t) + (spell.modifier === 'size' ? 1 : 0);
        if ((def.mendLevel ?? 1) > level) return fail('It is too big for your mending yet.');
        return ok(spell, state, t, { object });
      }
      case 'push': {
        if (!def.pushable) return fail('It will not move.');
        // Straight away from Signe, along one iso axis.
        const inRow = signe.y >= fp.y && signe.y < fp.y + fp.h;
        const inCol = signe.x >= fp.x && signe.x < fp.x + fp.w;
        if (!inRow && !inCol) return fail('Stand in line with it to push.');
        const dx = inRow ? Math.sign(fp.x - signe.x) : 0;
        const dy = inCol ? Math.sign(fp.y - signe.y) : 0;
        if (dx === 0 && dy === 0) return fail('Stand in line with it to push.');
        // `pushTo` is where the player tapped: any tile along the line beyond the object.
        const dest = pushTo ?? { x: fp.x + dx, y: fp.y + dy };
        const inLine = dx !== 0 ? dest.y >= fp.y && dest.y < fp.y + fp.h : dest.x >= fp.x && dest.x < fp.x + fp.w;
        const distance = dx !== 0 ? (dx > 0 ? dest.x - (fp.x + fp.w - 1) : fp.x - dest.x) : dy > 0 ? dest.y - (fp.y + fp.h - 1) : fp.y - dest.y;
        if (!inLine || distance < 1) return fail('Push moves things straight away from you.');
        for (let step = 1; step <= distance; step++) {
          let clear = true;
          forTiles({ ...fp, x: fp.x + dx * step, y: fp.y + dy * step }, (x, y) => {
            const other = world.objectAt(x, y);
            if (!world.inMap(x, y) || (world.isBlocked(x, y) && other !== object)) clear = false;
          });
          if (!clear) return fail(step === 1 ? 'Something is in the way.' : 'Something is in the way that far.');
        }
        return ok(spell, state, t, { object, pushTo: { x: fp.x + dx * distance, y: fp.y + dy * distance } }, distance);
      }
    }
  }

  // Surfaces and areas: ice.
  if (spell.action === 'push' || spell.action === 'mend') return fail('That works on objects only.');
  if (aim.kind !== 'tile') return fail('Aim at the ice.');
  if (!world.isIce(aim.x, aim.y)) return fail('Only ice can be worked as a surface.');
  if (Math.abs(aim.x - signe.x) + Math.abs(aim.y - signe.y) > reach) return tooFar;
  const radius = (spell.target === 'area' ? 1 : 0) + (spell.modifier === 'size' ? 1 : 0);
  const tiles: Tile[] = [];
  for (let y = aim.y - radius; y <= aim.y + radius; y++) {
    for (let x = aim.x - radius; x <= aim.x + radius; x++) {
      if (!world.isIce(x, y)) continue;
      if (spell.action === 'weaken') {
        if (world.tileEffect(x, y)?.kind === 'strengthened') continue; // strengthened ice holds
        const here = world.objectAt(x, y);
        if (here) {
          if (here.npc && spell.modifier !== 'trigger') return fail(`${here.name} is standing on that ice.`);
          continue; // ice under markers and reeds holds
        }
        if (x === signe.x && y === signe.y && spell.modifier !== 'trigger') return fail('Not the ice under your own feet.');
      }
      tiles.push({ x, y });
    }
  }
  if (tiles.length === 0) return fail('That ice will not take it.');
  return ok(spell, state, t, { tiles });
}

function ok(spell: Spell, state: GameState, t: Tuning, rest: { object?: MapObject; tiles?: Tile[]; pushTo?: Tile }, pushTiles = 1): CastPlan {
  return { ok: true, spell, cost: spellCost(state, t, spell, pushTiles), ...rest };
}

/** Carries out a checked plan: spends Power, changes the world, trains the skill. Returns what happened, for the player. */
export function cast(world: WorldModel, state: GameState, t: Tuning, plan: Extract<CastPlan, { ok: true }>): string {
  if (!A.spendPower(state, plan.cost)) return 'Not enough Power.';
  const { spell } = plan;
  const effect = (kind: CraftEffect['kind']): CraftEffect => ({
    kind,
    armed: spell.modifier === 'trigger',
    restsLeft: spell.anchored ? null : t.effectRests + (spell.modifier === 'duration' ? t.durationExtraRests : 0),
  });
  let trainedOn: string | null = null;
  let message = '';

  if (plan.object) {
    const o = plan.object;
    trainedOn = `object:${o.id}`;
    switch (spell.action) {
      case 'strengthen':
        A.setObjectEffect(state, o.id, effect('strengthened'));
        message = `The ${label(o)} grows hard and sure.`;
        break;
      case 'weaken':
        A.setObjectEffect(state, o.id, effect('weakened'));
        message = `The ${label(o)} turns brittle. A push would break it.`;
        break;
      case 'mend':
        A.setObjectBroken(state, o.id, false);
        A.setObjectEffect(state, o.id, undefined);
        if (o.type === 'tithe-sled') A.setFlag(state, 'tithe_sled_mended', true);
        if (o.type === 'shelter') A.setFlag(state, 'shelter_mended', true);
        if (o.type === 'net-rack') {
          const racks = world.objects.filter((x) => x.type === 'net-rack' && x.broken);
          A.setFlag(state, 'nets_total', racks.length);
          A.setFlag(state, 'nets_mended', racks.filter((x) => !world.isBroken(x)).length);
        }
        message = `You feel how the ${label(o)} was made, and it is whole again.`;
        break;
      case 'push': {
        const brittle = world.objectEffect(o)?.kind === 'weakened';
        A.moveObject(state, o.id, plan.pushTo!);
        if (brittle) {
          A.setObjectBroken(state, o.id, true);
          A.setObjectEffect(state, o.id, undefined);
          message = `The ${label(o)} slides, and breaks apart.`;
        } else {
          message = `The ${label(o)} slides away from you.`;
        }
        break;
      }
    }
  } else if (plan.tiles) {
    const first = plan.tiles[0]!;
    trainedOn = `tile:${tileKey(first.x, first.y)}`;
    for (const { x, y } of plan.tiles) {
      if (spell.action === 'strengthen' && world.isThinIce(x, y)) A.setFlag(state, FLAG_STRENGTHENED_CRACKED_ICE, true);
      if (spell.action === 'strengthen') A.setTileEffect(state, x, y, effect('strengthened'));
      else if (spell.modifier === 'trigger') A.setTileEffect(state, x, y, effect('weakened'));
      else A.breakIce(state, x, y, iceRests(t, spell));
    }
    const many = plan.tiles.length > 1;
    message =
      spell.action === 'strengthen'
        ? `The ice ${many ? 'around it ' : ''}thickens and holds.`
        : spell.modifier === 'trigger'
          ? `The ice ${many ? 'there ' : ''}looks whole. It will not hold the next weight.`
          : `The ice ${many ? 'there ' : ''}cracks open to black water.`;
  }

  if (trainedOn && (spell.action === 'mend' || spell.action === 'weaken')) {
    const before = A.skillLevel(state, spell.action, t);
    A.recordSkillUse(state, spell.action, trainedOn);
    const after = A.skillLevel(state, spell.action, t);
    if (after > before) message += ` Your ${spell.action === 'mend' ? 'mending' : 'weakening'} has grown surer.`;
  }
  return message;
}

function iceRests(t: Tuning, spell: Spell): number {
  if (spell.anchored) return Number.MAX_SAFE_INTEGER;
  return t.iceRefreezeRests + (spell.modifier === 'duration' ? t.durationExtraRests : 0);
}

/** Flags set the first time Signe goes through cracked ice, and strengthens it (the ice road quest reads them). */
export const FLAG_FELL_THROUGH_CRACKED_ICE = 'fell_through_cracked_ice';
export const FLAG_STRENGTHENED_CRACKED_ICE = 'strengthened_cracked_ice';

/**
 * Signe steps onto a tile: her own armed ice, or cracked ice that nothing
 * made safe, breaks under her. Returns true if she went through.
 */
/** True if stepping here would break the ice under Signe (checked before changing anything). */
export function wouldBreakUnderSigne(world: WorldModel, tile: Tile): boolean {
  const e = world.tileEffect(tile.x, tile.y);
  return (e?.armed === true && e.kind === 'weakened') || world.isDangerousIce(tile.x, tile.y, true);
}

/** True if stepping here would break Signe's trap under a villager. */
export function wouldBreakUnderPerson(world: WorldModel, tile: Tile): boolean {
  const e = world.tileEffect(tile.x, tile.y);
  return e?.armed === true && e.kind === 'weakened';
}

export function stepOnto(world: WorldModel, state: GameState, t: Tuning, tile: Tile): boolean {
  const e = world.tileEffect(tile.x, tile.y);
  const trap = e?.armed === true && e.kind === 'weakened';
  const cracked = world.isDangerousIce(tile.x, tile.y, true);
  if (!trap && !cracked) return false;
  if (cracked) A.setFlag(state, FLAG_FELL_THROUGH_CRACKED_ICE, true);
  A.breakIce(state, tile.x, tile.y, t.iceRefreezeRests);
  for (let i = 0; i < t.woundsFromBreakingThrough; i++) A.addWound(state, t);
  return true;
}

/** A villager steps onto Signe's armed ice: it breaks, and they climb out hurt. Returns true if they went through. */
export function personStepsOnto(world: WorldModel, state: GameState, t: Tuning, npc: NpcId, tile: Tile): boolean {
  const e = world.tileEffect(tile.x, tile.y);
  if (!e?.armed || e.kind !== 'weakened') return false;
  A.breakIce(state, tile.x, tile.y, t.iceRefreezeRests);
  A.hurtByTrap(state, npc, t);
  return true;
}

function label(o: MapObject): string {
  return o.type.replace(/-/g, ' ');
}
