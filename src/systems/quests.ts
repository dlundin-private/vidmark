import { QUESTS, type QuestDef, type QuestView } from '../../content/data/quests';
import type { NpcId } from '../../content/data/npcs';
import * as A from '../state/actions';
import type { GameState } from '../state/GameState';

/** A quest as the journal shows it. */
export interface QuestStatus {
  def: QuestDef;
  started: boolean;
  /** The outcome it ended with, or null while it is open. */
  outcome: { id: string; text: string } | null;
  steps: { text: string; done: boolean; alternative: boolean }[];
}

export type QuestEvent = { kind: 'started' | 'completed'; quest: QuestDef; text: string };

const startedFlag = (id: string) => `quest_${id}_started`;
const outcomeFlag = (id: string) => `quest_${id}`;

function view(state: GameState): QuestView {
  return {
    flag: (name) => state.flags[name],
    offered: (npc: NpcId) => state.npcs[npc].offered,
    hollowed: (npc: NpcId) => state.npcs[npc].hollowed,
  };
}

/**
 * Records quests starting and ending, from what has happened in the world.
 * An ending is kept for good once reached, even if the world changes later
 * (a mended net torn again doesn't reopen the quest). Returns what changed,
 * for the HUD to announce.
 */
export function updateQuests(state: GameState): QuestEvent[] {
  const v = view(state);
  const events: QuestEvent[] = [];
  for (const q of QUESTS) {
    if (state.flags[outcomeFlag(q.id)]) continue;
    if (!state.flags[startedFlag(q.id)] && q.starts(v)) {
      A.setFlag(state, startedFlag(q.id), true);
      events.push({ kind: 'started', quest: q, text: q.summary });
    }
    if (!state.flags[startedFlag(q.id)]) continue;
    const outcome = q.outcomes.find((o) => o.when(v));
    if (outcome) {
      A.setFlag(state, outcomeFlag(q.id), outcome.id);
      if (outcome.sets) A.setFlag(state, outcome.sets, true);
      events.push({ kind: 'completed', quest: q, text: outcome.text });
    }
  }
  return events;
}

/** True if updateQuests would change anything: lets callers skip a state write (and redraw) when nothing happened. */
export function questsWouldChange(state: Readonly<GameState>): boolean {
  const v = view(state as GameState);
  return QUESTS.some((q) => {
    if (state.flags[outcomeFlag(q.id)]) return false;
    const started = !!state.flags[startedFlag(q.id)];
    if (!started) return q.starts(v);
    return q.outcomes.some((o) => o.when(v));
  });
}

export function questStatuses(state: Readonly<GameState>): QuestStatus[] {
  const v = view(state as GameState);
  return QUESTS.map((def) => {
    const outcomeId = state.flags[outcomeFlag(def.id)];
    const outcome = typeof outcomeId === 'string' ? def.outcomes.find((o) => o.id === outcomeId) ?? null : null;
    return {
      def,
      started: !!state.flags[startedFlag(def.id)],
      outcome: outcome ? { id: outcome.id, text: outcome.text } : null,
      steps: def.steps.map((s) => ({ text: s.text(v), done: s.done(v), alternative: !!s.alternative })),
    };
  });
}
