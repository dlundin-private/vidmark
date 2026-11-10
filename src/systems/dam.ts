import { KEEPSAKES, type KeepsakeId } from '../../content/data/keepsakes';
import { NPCS, type NpcId } from '../../content/data/npcs';
import type { Tuning } from '../../content/data/tuning';
import type { Tile } from '../iso/types';
import * as A from '../state/actions';
import type { GameState, WeaveAnchor } from '../state/GameState';

// The dam crisis (chapter 2, build step 5; docs/chapter-2-jarnfors.md).
// The flood-bell rings, and the city has three rests (Daniel). Four ways to
// save it, each with a cost, and failure, which is allowed: the dam breaks,
// the city floods, and the game goes on.
//   knit    asking: Kin and Craft together, "stone that knits like bone",
//           anchored in a memory; Järnfors givers add Power (Daniel)
//   taken   taking: hold the crack with the keeping taken from Gudmund
//   relief  preparing: open Halvar's relief cut; the lower quarter floods
//   held    spending herself: raw Craft, Power enough only by burning Keepsakes
//   broken  the clock ran out

export type DamRoute = 'knit' | 'taken' | 'relief' | 'held';
export type DamOutcome = DamRoute | 'broken';

export const FLAG_BELL = 'flood_bell';
export const FLAG_RESTS_LEFT = 'dam_rests_left';
export const FLAG_OUTCOME = 'dam_outcome';
/** Rests taken in Järnfors before the bell. */
export const FLAG_JF_RESTS = 'jarnfors_rests';
/** Preparing the relief cut: each task, done once. */
export const CUT_TASKS = ['plug_weakened', 'cut_walls_strengthened', 'cut_carts_cleared'] as const;

export function damOutcome(state: Readonly<GameState>): DamOutcome | null {
  const o = state.flags[FLAG_OUTCOME];
  return typeof o === 'string' ? (o as DamOutcome) : null;
}

export function bellRinging(state: Readonly<GameState>): boolean {
  return !!state.flags[FLAG_BELL] && !damOutcome(state);
}

export function restsLeft(state: Readonly<GameState>): number {
  return Number(state.flags[FLAG_RESTS_LEFT] ?? 0);
}

/**
 * The bell rings at a rest in Järnfors once Signe has had the chance to find
 * her ways (Claude's draft): she holds Kin, or has finished two side quests,
 * or it is her third rest there.
 */
export function bellDue(state: Readonly<GameState>): boolean {
  if (state.chapter !== 2 || state.map !== 'jarnfors' || state.flags[FLAG_BELL]) return false;
  const quests = ['britas-bowl', 'keeping', 'tithe-house'].filter((q) => state.flags[`quest_${q}`]).length;
  return state.domains.includes('kin') || quests >= 2 || Number(state.flags[FLAG_JF_RESTS] ?? 0) >= 3;
}

/**
 * A rest in Järnfors: counts toward the bell, rings it, or brings the break
 * one rest nearer. Returns what happened, for the scene to tell.
 */
export function restInJarnfors(state: GameState, t: Tuning): 'rang' | 'ticked' | 'broke' | null {
  if (state.chapter !== 2 || state.map !== 'jarnfors' || damOutcome(state)) return null;
  if (!state.flags[FLAG_BELL]) {
    state.flags[FLAG_JF_RESTS] = Number(state.flags[FLAG_JF_RESTS] ?? 0) + 1;
    if (!bellDue(state)) return null;
    state.flags[FLAG_BELL] = true;
    state.flags[FLAG_RESTS_LEFT] = t.damRests;
    return 'rang';
  }
  const left = restsLeft(state) - 1;
  state.flags[FLAG_RESTS_LEFT] = Math.max(0, left);
  if (left > 0) return 'ticked';
  state.flags[FLAG_OUTCOME] = 'broken';
  return 'broke';
}

/** People who gave Signe a memory here, and come up to stand with her on the crest (Daniel: +1 each). */
export function helpers(state: Readonly<GameState>): NpcId[] {
  return A.hearth(state as GameState).filter((id) => NPCS.find((n) => n.id === id)?.map === 'jarnfors');
}

/** Power the knitting Weave costs: the tuning value, less one for each Järnfors giver beside her. */
export function knitCost(state: Readonly<GameState>, t: Tuning): number {
  return Math.max(1, t.damKnitCost - helpers(state).length * t.powerPerOffering);
}

/** What the knitting can be anchored in: a Keepsake, an Offering, or an Echo (chapter 2 design). */
export function knitAnchors(state: Readonly<GameState>): WeaveAnchor[] {
  return A.availableAnchors(state as GameState);
}

export type DamResult = { ok: true; text: string } | { ok: false; reason: string };

/** Tries a route. Changes nothing unless it succeeds. */
export function saveDam(state: GameState, t: Tuning, route: DamRoute, anchor?: WeaveAnchor): DamResult {
  if (!bellRinging(state)) return { ok: false, reason: 'The dam is not failing yet.' };
  const pay = (cost: number): boolean => A.spendPower(state, cost);
  switch (route) {
    case 'knit': {
      if (!state.domains.includes('kin')) return { ok: false, reason: 'You need Kin for this: the stone has to be mended like a body.' };
      if (!anchor) return { ok: false, reason: 'It has to be anchored in something of yours.' };
      if (!pay(knitCost(state, t))) return { ok: false, reason: `It needs ${knitCost(state, t)} Power.` };
      A.saveWeave(state, { id: `dam-knit-${Date.now().toString(36)}`, name: 'Stone that knits like bone', action: 'mend', target: 'area', modifier: null, anchor }, t);
      // It lives in the dam, not in her hands: she doesn't carry it.
      state.heldWeaves = state.heldWeaves.filter((id) => !id.startsWith('dam-knit-'));
      break;
    }
    case 'taken':
      if (!state.flags.keeping_in_signe) return { ok: false, reason: "You'd need the whole keeping of the dam in you." };
      if (!pay(t.damHoldCost)) return { ok: false, reason: `It needs ${t.damHoldCost} Power.` };
      break;
    case 'relief':
      if (!CUT_TASKS.every((f) => state.flags[f])) return { ok: false, reason: 'The cut is not ready to open.' };
      break;
    case 'held':
      if (!pay(t.damRawCost)) return { ok: false, reason: `It needs ${t.damRawCost} Power. More than you have.` };
      break;
  }
  state.flags[FLAG_OUTCOME] = route;
  state.flags[FLAG_RESTS_LEFT] = 0;
  return { ok: true, text: route };
}

/** The Keepsakes she could still burn, to reach the Power raw holding needs. */
export function burnable(state: Readonly<GameState>): KeepsakeId[] {
  return KEEPSAKES.filter((k) => !k.hiddenUntilLate && A.hasKeepsake(state as GameState, k.id)).map((k) => k.id);
}

/** A flooded area: every tile in it becomes open water (lasting). */
export function flood(state: GameState, tiles: readonly Tile[]): void {
  for (const { x, y } of tiles) A.breakIce(state, x, y, Number.MAX_SAFE_INTEGER);
}
