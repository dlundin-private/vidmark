import type { Domain } from './keepsakes';

export type NpcId = 'ebbe' | 'hermit' | 'gerda' | 'olle' | 'hollow' | 'lilja' | 'torvald';

export interface NpcDef {
  id: NpcId;
  name: string;
  role: string;
  /** The domain this person holds. null where the design doc doesn't say yet. */
  domain: Domain | null;
  /** Already a Hollow when the game starts. */
  startsHollow?: boolean;
}

// People in the vertical slice (docs/design.md, "Vertical slice: content").
export const NPCS: readonly NpcDef[] = [
  { id: 'ebbe', name: 'Ebbe', role: 'Net-mender who has forgotten his craft', domain: 'craft' },
  { id: 'hermit', name: 'The hermit', role: 'Remembers the old safe route across the ice', domain: null },
  { id: 'gerda', name: 'Old Gerda', role: 'Her grandmother knew Maren as a girl', domain: null },
  { id: 'olle', name: 'Reeve Olle', role: 'The Tithe-collector', domain: null },
  { id: 'hollow', name: 'The Hollow', role: 'The blank man in the boathouse', domain: null, startsHollow: true },
  { id: 'lilja', name: 'Lilja', role: "Signe's little sister", domain: null },
  { id: 'torvald', name: 'Torvald', role: "Signe's father, a fisherman", domain: null },
];
