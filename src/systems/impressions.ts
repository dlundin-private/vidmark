import { MEMORIES } from '../../content/data/impressions';
import { NPCS, type NpcId } from '../../content/data/npcs';
import * as A from '../state/actions';
import type { GameState } from '../state/GameState';

export interface RememberedPerson {
  id: NpcId;
  /** Their name, or how she'd describe them once the memory it rests on is gone. */
  name: string;
  /** What she remembers, in the order she formed it, as she sees it now. */
  lines: { text: string; blurred: boolean; cold: boolean }[];
  /** Where they stand with her now: in her Hearth, lost faith, hollowed. */
  standing: string | null;
}

/**
 * Signe's memories of the people she has met, coloured by who she has become
 * (decided by Daniel): a lost Keepsake blurs what rested on it, and carrying
 * Echoes makes her see what people are worth to her rather than who they are.
 */
export function rememberedPeople(state: Readonly<GameState>): RememberedPerson[] {
  const s = state as GameState;
  const crowded = A.echoes(s).length > 0;
  return A.peopleMet(s).map((id) => {
    const person = MEMORIES[id];
    const def = NPCS.find((n) => n.id === id)!;
    const personFaded = person.tiedTo !== undefined && !A.hasKeepsake(s, person.tiedTo);
    const lines = (s.impressions[id] ?? []).flatMap((key) => {
      const imp = person.impressions.find((i) => i.key === key);
      if (!imp) return [];
      const tie = imp.tiedTo ?? person.tiedTo;
      const blurred = tie !== undefined && !A.hasKeepsake(s, tie) && imp.blurred !== undefined;
      const cold = !blurred && crowded && imp.cold !== undefined;
      return [{ text: blurred ? imp.blurred! : cold ? imp.cold! : imp.text, blurred, cold }];
    });
    const n = s.npcs[id];
    const standing = n.hollowed
      ? def.startsHollow
        ? null
        : 'Hollowed by you. You carry all of them now.'
      : n.offered && n.faithLost
        ? 'Lost faith in you.'
        : n.offered
          ? 'In your Hearth.'
          : null;
    return { id, name: personFaded ? person.blurredName ?? def.name : def.name, lines, standing };
  });
}
