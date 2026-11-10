import type { Tuning } from '../../content/data/tuning';
import * as A from '../state/actions';
import type { GameState } from '../state/GameState';
import { FLAG_OUTCOME, FLAG_RESTS_LEFT, bellRinging } from './dam';

// The cramp-thieves (chapter 2, build step 6; docs/chapter-2-jarnfors.md).
// While the flood-bell rings, Knut and two others from the lower quarter come
// up at night to pry the iron cramps out of the crest. Stopping them slows the
// crack (a rest back on the clock); letting them go costs a rest, and their
// families are gone before the flood. Avoidable: tell Knut the dam can hold,
// promise his family a place on the relief route, ask Gudmund to post masons,
// or strengthen the cramps by day. All Claude's draft on the design.

export const FLAG_THIEVES = 'thieves';
export type ThievesOutcome = 'stopped' | 'let';

/** Something already keeps them off the crest. */
export function thievesAvoided(state: Readonly<GameState>): boolean {
  const f = state.flags;
  return !!f.cramps_strengthened || !!f.masons_posted || !!f.knut_persuaded || state.npcs.knut.hollowed || !!state.npcs.knut.gone;
}

/** They come up on a night while the bell rings, unless something keeps them off. Once. */
export function thievesDue(state: Readonly<GameState>): boolean {
  return bellRinging(state) && !state.flags[FLAG_THIEVES] && !thievesAvoided(state);
}

/** Signe lets them: the crack widens a night sooner, and Knut's family is gone before the water. */
export function letThievesGo(state: GameState): 'broke' | 'ok' {
  state.flags[FLAG_THIEVES] = 'let';
  state.npcs.knut.gone = true;
  const left = Math.max(0, Number(state.flags[FLAG_RESTS_LEFT] ?? 0) - 1);
  state.flags[FLAG_RESTS_LEFT] = left;
  if (left > 0) return 'ok';
  state.flags[FLAG_OUTCOME] = 'broken';
  return 'broke';
}

/** Signe stopped them: with the cramps left in, the crack slows by a night. */
export function thievesStopped(state: GameState): void {
  state.flags[FLAG_THIEVES] = 'stopped';
  state.flags[FLAG_RESTS_LEFT] = Number(state.flags[FLAG_RESTS_LEFT] ?? 0) + 1;
}

/** After the fight, Knut on his knees: spare him, ask for an Offering, or take everything (design). */
export function afterKnut(state: GameState, t: Tuning, choice: 'spare' | 'offer' | 'hollow'): void {
  state.flags.knut_after_fight = choice;
  if (choice === 'offer') A.recordOffering(state, 'knut', t);
  if (choice === 'hollow') {
    A.recordHollowing(state, 'knut', t);
    // The masons on the towers see it (design): the city knows.
    A.seenHollowing(state, 'knut');
  }
}
