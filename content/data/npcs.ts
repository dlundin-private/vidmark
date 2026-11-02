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
}

// People in the vertical slice (docs/design.md, "Vertical slice: content").
export const NPCS: readonly NpcDef[] = [
  { id: 'ebbe', name: 'Ebbe', role: 'Net-mender who has forgotten his craft', domain: 'craft', teaches: 'mend' },
  { id: 'hermit', name: 'The hermit', role: 'Remembers the old safe route across the ice', domain: 'kin' },
  { id: 'gerda', name: 'Old Gerda', role: 'Her grandmother knew Maren as a girl', domain: 'thought' },
  { id: 'olle', name: 'Reeve Olle', role: 'The Tithe-collector', domain: 'thought' },
  { id: 'hollow', name: 'The Hollow', role: 'The blank man in the boathouse', domain: 'craft', startsHollow: true },
  { id: 'lilja', name: 'Lilja', role: "Signe's little sister", domain: 'kin' },
  { id: 'torvald', name: 'Torvald', role: "Signe's father, a fisherman", domain: 'craft' },
];
