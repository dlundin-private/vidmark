import { KEEPSAKES } from '../../content/data/keepsakes';
import { NPCS } from '../../content/data/npcs';
import { QUESTS } from '../../content/data/quests';
import * as A from '../state/actions';
import type { ChapterRecord, GameState } from '../state/GameState';

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
export function summariseChapterOne(state: Readonly<GameState>): ChapterRecord {
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
export function endChapterOne(state: GameState): ChapterRecord {
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
