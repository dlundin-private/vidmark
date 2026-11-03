import type { CraftAction } from './craft';
import type { Domain } from './keepsakes';

export type NpcId = 'ebbe' | 'hermit' | 'gerda' | 'olle' | 'hollow' | 'lilja' | 'torvald';

export interface NpcDef {
  id: NpcId;
  name: string;
  role: string;
  /** The domain this person holds. Only Ebbe's follows from the design doc; the rest are drafts (docs/decisions.md). */
  domain: Domain;
  /** Already a Hollow when the game starts. */
  startsHollow?: boolean;
  /** The skill their memories deepen (design: "memories teach"). */
  teaches?: CraftAction;
  /** The memory they give Signe as an Offering, as her Hearth shows it. Drafts. Torvald and Olle give none (decided by Daniel: not everyone is willing). */
  offering?: string;
  /** How they move around their spot on the map. Radius 0: they stay put, but others can walk over to them. */
  wander: { radius: number; onIce?: boolean };
}

// People in the vertical slice (docs/design.md, "Vertical slice: content").
export const NPCS: readonly NpcDef[] = [
  { id: 'ebbe', name: 'Ebbe', role: 'Net-mender who has forgotten his craft', domain: 'craft', teaches: 'mend', offering: 'His wife on the jetty, the first spring, laughing at his clumsy knots', wander: { radius: 3 } },
  { id: 'hermit', name: 'The hermit', role: 'Remembers the old safe route across the ice', domain: 'kin', offering: 'The one safe way across the cracked ice', wander: { radius: 4 } },
  { id: 'gerda', name: 'Old Gerda', role: 'Her grandmother knew Maren as a girl', domain: 'thought', offering: "Her grandmother's Maren: chapped hands, a little brother, a mother's face", wander: { radius: 2 } },
  { id: 'olle', name: 'Reeve Olle', role: 'The Tithe-collector', domain: 'thought', wander: { radius: 4 } },
  { id: 'hollow', name: 'The Hollow', role: 'The blank man in the boathouse', domain: 'craft', startsHollow: true, wander: { radius: 0 } },
  { id: 'lilja', name: 'Lilja', role: "Signe's little sister", domain: 'kin', offering: 'You holding her up in the water, then letting go, and she did not sink', wander: { radius: 5, onIce: true } },
  { id: 'torvald', name: 'Torvald', role: "Signe's father, a fisherman", domain: 'craft', wander: { radius: 0 } },
];
