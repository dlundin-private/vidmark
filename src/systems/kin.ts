import { kinDef, type KinAction } from '../../content/data/kin';
import { NPCS, type NpcId } from '../../content/data/npcs';
import type { Tuning } from '../../content/data/tuning';
import * as A from '../state/actions';
import type { GameState } from '../state/GameState';

/** What a Kin ability is aimed at: Signe herself, a person, or a creature in a fight (by its id there). */
export type KinTarget = { kind: 'self' } | { kind: 'person'; id: NpcId } | { kind: 'creature'; id: number };

export type KinPlan = { ok: true; action: KinAction; target: KinTarget; cost: number } | { ok: false; reason: string };

/** Flags: a person calmed until the next rest; Signe's body strengthened against her next wound. */
export const calmedFlag = (id: NpcId) => `calmed_${id}`;
export const FLAG_BOLSTERED = A.FLAG_BOLSTERED;
/** Someone hurt or sick that Heal can ease (Arn's cough, a villager hurt by trap ice). */
export const easedFlag = (id: NpcId) => `eased_${id}`;

export function hasKin(state: Readonly<GameState>): boolean {
  return state.domains.includes('kin');
}

/** Whether a person is hurt or sick in a way Heal can ease. */
export function isHurt(state: Readonly<GameState>, id: NpcId): boolean {
  if (state.flags[easedFlag(id)]) return false;
  return id === 'arn' || !!state.flags[`hurt_by_trap_${id}`];
}

/** Checks a Kin ability against its target. Changes nothing. */
export function planKin(state: Readonly<GameState>, t: Tuning, action: KinAction, target: KinTarget): KinPlan {
  const fail = (reason: string): KinPlan => ({ ok: false, reason });
  if (!hasKin(state)) return fail('You have no Kin in you.');
  const def = kinDef(action);
  const cost = t[def.costTuning];
  if (target.kind === 'self') {
    if (!def.onSelf) return fail(`${def.name} works on others, not on yourself.`);
    if (action === 'heal' && state.wounds === 0) return fail('You have no wounds to close.');
    if (action === 'bolster' && state.flags[FLAG_BOLSTERED]) return fail('Your body is already holding.');
  }
  if (target.kind === 'person') {
    const n = state.npcs[target.id];
    if (n.gone) return fail('They are not here.');
    if (n.hollowed && action !== 'sense') return fail('There is nobody in there to reach.');
    if (action === 'heal' && !isHurt(state, target.id)) return fail('Nothing in them needs closing.');
    if (action === 'calm' && state.flags[calmedFlag(target.id)]) return fail('They are already quiet.');
  }
  if (target.kind === 'creature' && (action === 'heal' || action === 'bolster')) return fail('Not on something that wants to eat you.');
  return { ok: true, action, target, cost };
}

/** Uses a checked Kin ability: spends Power and does what it does. Returns what happened, for the player. */
export function castKin(state: GameState, plan: Extract<KinPlan, { ok: true }>): string {
  if (!A.spendPower(state, plan.cost)) return 'Not enough Power.';
  const { action, target } = plan;
  if (target.kind === 'self') {
    if (action === 'heal') {
      A.healWound(state);
      return 'The wound draws closed under your hand. It aches, and holds.';
    }
    if (action === 'bolster') {
      state.flags[FLAG_BOLSTERED] = true;
      return 'You feel your own body as Edda feels hers: something to keep. The next blow will not land.';
    }
    return A.carriesEchoes(state)
      ? `You reach into yourself and find ${A.echoCount(state) === 1 ? 'another life' : `${A.echoCount(state)} other lives`} there, and under them, smaller, you.`
      : 'You reach into yourself and find only you. Smaller than you thought.';
  }
  if (target.kind === 'person') {
    const name = NPCS.find((n) => n.id === target.id)!.name;
    if (action === 'heal') {
      state.flags[easedFlag(target.id)] = true;
      return target.id === 'arn' ? 'The rattle in Arn\'s chest loosens. He breathes in, and doesn\'t cough.' : `${name}'s hurt eases under your hand.`;
    }
    if (action === 'calm') {
      state.flags[calmedFlag(target.id)] = true;
      return `${name}'s shoulders come down. For a while, nothing frightens them.`;
    }
    if (action === 'bolster') return `${name} stands straighter, without knowing why.`;
    return ''; // Sense on a person: the scene plays their Ink knot (sense_<id>).
  }
  if (action === 'calm') return 'The hunger in it goes quiet. For a moment it only stands there.';
  return 'It is all teeth and hunger. Nothing else is in there.';
}

