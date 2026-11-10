import { KEEPSAKES } from '../../content/data/keepsakes';
import { NPCS } from '../../content/data/npcs';
import { QUESTS } from '../../content/data/quests';
import * as A from '../state/actions';
import type { ChapterOneRecord, ChapterTwoRecord, GameState } from '../state/GameState';
import { damOutcome } from './dam';

// The end of chapter 1 (docs/design.md, "End of chapter"): the villages can't
// pay the Tithe, so a child is taken to Kronvall in payment: Lilja. Signe's
// reason for leaving, bringing her home, becomes the Keepsake "Why you left".
// How it happens follows what she did (Daniel's decisions, docs/decisions.md):
//   - Olle hollowed: the Reeve never reported, so Kronvall sends its own men,
//     who take Lilja and the blank Reeve too.
//   - Lilja hollowed: she is taken anyway, "paid in full: one, whole".
//   - The swim burned: Signe goes for a girl she doesn't know, because Torvald asks.

/** The chapter ends once the ice road is open and Signe rests: the Tithe can travel. */
export function chapterOneCanEnd(state: Readonly<GameState>): boolean {
  return state.chapter === 1 && !!state.flags.ice_road_open;
}

/** What chapter 1 decided, for the outro and for the chapters after it. */
export function summariseChapterOne(state: Readonly<GameState>): ChapterOneRecord {
  const s = state as GameState;
  const quests: Record<string, string> = {};
  for (const q of QUESTS) {
    const outcome = s.flags[`quest_${q.id}`];
    if (typeof outcome === 'string') quests[q.id] = outcome;
  }
  return {
    chapter: 1,
    gave: NPCS.filter((n) => s.npcs[n.id].offered).map((n) => n.id),
    hollowed: A.echoes(s),
    wolvesHollowed: A.wolfEchoes(s),
    burned: KEEPSAKES.filter((k) => s.keepsakes[k.id].formed && s.keepsakes[k.id].status !== 'kept').map((k) => k.id),
    // A promise still open when Lilja is taken was broken: someone else took her across.
    promises: s.promises.map((p) => ({ id: p.id, to: p.to, kept: p.kept === true })),
    quests,
    villageKnew: !!s.flags[A.FLAG_VILLAGE_KNOWS],
    liljaTakenBy: s.npcs.olle.hollowed ? 'kronvall' : 'olle',
    lilja: s.npcs.lilja.hollowed ? 'hollow' : A.hasKeepsake(s, 'swim') ? 'sister' : 'stranger',
  };
}

/** Ends chapter 1: Lilja (and whoever took her) leaves Kallsjö, "Why you left" forms, chapter 2 begins. */
export function endChapterOne(state: GameState): ChapterOneRecord {
  const record = summariseChapterOne(state);
  state.npcs.lilja.gone = true;
  // Olle goes with her: as the Reeve taking her, or, emptied, as Kronvall's property.
  state.npcs.olle.gone = true;
  for (const p of state.promises) if (p.kept === null) p.kept = false;
  A.formKeepsake(state, 'whyYouLeft');
  state.flags.why_you_left_for = record.lilja;
  state.chapters.push(record);
  state.chapter = 2;
  return record;
}

/**
 * Chapter 2 without a chapter 1 save (Daniel): a default chapter 1, with nobody
 * hollowed and the nets mended, the road open and Lilja taken. Signe starts at
 * Järnfors' south gate.
 */
export function startChapterTwo(state: GameState): void {
  state.flags.intro_seen = true;
  state.flags['quest_nets_started'] = true;
  state.flags['quest_nets'] = 'mended';
  state.flags['quest_ice-road_started'] = true;
  state.flags['quest_ice-road'] = 'strengthened';
  state.flags.ice_road_open = true;
  state.flags.wolves_gone = true;
  endChapterOne(state);
  A.travel(state, 'jarnfors');
}

// --- The end of chapter 2 (build step 7) ------------------------------------------
// Once the dam is decided, any of the five ways, a rest at the inn ends the
// chapter, and the road north opens toward chapter 3, Runhem (design: the
// chapter order). Claude's draft: the design says what chapter 2 holds, not how
// it closes.

export function chapterTwoCanEnd(state: Readonly<GameState>): boolean {
  return state.chapter === 2 && state.map === 'jarnfors' && damOutcome(state) !== null;
}

const JARNFORS_QUESTS = ['britas-bowl', 'keeping', 'tithe-house', 'flood-bell'];

export function summariseChapterTwo(state: Readonly<GameState>): ChapterTwoRecord {
  const s = state as GameState;
  const here = NPCS.filter((n) => n.map === 'jarnfors');
  const quests: Record<string, string> = {};
  for (const q of JARNFORS_QUESTS) {
    const outcome = s.flags[`quest_${q}`];
    if (typeof outcome === 'string') quests[q] = outcome;
  }
  const kin = s.npcs.edda.hollowed ? 'taken' : s.npcs.edda.offered ? (s.promises.some((p) => p.id === 'give_halvar_back') ? 'bargain' : 'asked') : 'none';
  const after = s.flags.knut_after_fight;
  const knut = s.npcs.knut.hollowed
    ? 'hollowed'
    : s.flags.thieves === 'let'
      ? 'let'
      : after === 'offer'
        ? 'gave'
        : after === 'spare'
          ? 'spared'
          : s.flags.thieves === 'stopped'
            ? 'spared'
            : s.flags.knut_persuaded || s.flags.masons_posted || s.flags.cramps_strengthened
              ? 'avoided'
              : 'never';
  const told = s.flags.brita_told;
  return {
    chapter: 2,
    dam: damOutcome(s)!,
    kin,
    gave: here.filter((n) => s.npcs[n.id].offered).map((n) => n.id),
    hollowed: here.filter((n) => !n.startsHollow && s.npcs[n.id].hollowed).map((n) => n.id),
    quests,
    brita: told === 'truth' || told === 'lie' || told === 'nothing' ? told : null,
    knut,
    arnSafe: !!s.flags.arn_safe || s.npcs.clerk.hollowed,
    liljaTrace: !!s.flags.lilja_trace_known,
    villageKnew: !!s.flags[A.FLAG_VILLAGE_KNOWS],
  };
}

/** Ends chapter 2: its record is kept, and the road north opens (chapter 3, not yet written). */
export function endChapterTwo(state: GameState): ChapterTwoRecord {
  const record = summariseChapterTwo(state);
  state.chapters.push(record);
  state.chapter = 3;
  return record;
}
