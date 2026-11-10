import type { CraftAction } from './craft';
import type { QuestView } from './quests';
import type { Domain } from './keepsakes';

export type NpcId =
  | 'ebbe' | 'hermit' | 'gerda' | 'olle' | 'hollow' | 'lilja' | 'torvald'
  // Järnfors (chapter 2, docs/chapter-2-jarnfors.md).
  | 'edda' | 'brita' | 'halvar' | 'gudmund' | 'clerk' | 'arn' | 'knut';

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
  /**
   * A Keystone (design): someone holding a domain Signe lacks. Their Offering,
   * or hollowing them, gives Signe that domain. Edda, in Järnfors.
   */
  keystone?: boolean;
  /** The map they live on (src/systems/maps.ts); Kallsjö if not given. */
  map?: string;
  /** How they move around their spot on the map. Radius 0: they stay put, but others can walk over to them. */
  wander: { radius: number; onIce?: boolean };
  /** A new spot once the world has changed (step 7); the first that holds wins. They walk there. */
  moves?: { when: (v: QuestView) => boolean; to: SpotName; radius: number; onIce?: boolean }[];
}

/** Named spots on the map that people move to; the scene finds them from the map's numbers. */
export type SpotName = 'village-fire' | 'ice-road-near' | 'ice-road-far' | 'brita-crest' | 'halvar-crest' | 'arn-safe';

const roadOpen = (v: QuestView) => !!v.flag('ice_road_open');

// People in the vertical slice (docs/design.md, "Vertical slice: content").
export const NPCS: readonly NpcDef[] = [
  { id: 'ebbe', name: 'Ebbe', role: 'Net-mender who has forgotten his craft', domain: 'craft', teaches: 'mend', offering: 'His wife on the jetty, the first spring, laughing at his clumsy knots', wander: { radius: 3 } },
  {
    id: 'hermit', name: 'The hermit', role: 'Remembers the old safe route across the ice', domain: 'kin', offering: 'The one safe way across the cracked ice', wander: { radius: 4 },
    // He gave away what kept him on the headland, and comes in to the village fire (Daniel). Hollowed, he stays in his doorway.
    moves: [{ when: (v) => v.offered('hermit') && !v.hollowed('hermit'), to: 'village-fire', radius: 2 }],
  },
  { id: 'gerda', name: 'Old Gerda', role: 'Her grandmother knew Maren as a girl', domain: 'thought', offering: "Her grandmother's Maren: chapped hands, a little brother, a mother's face", wander: { radius: 2 } },
  {
    id: 'olle', name: 'Reeve Olle', role: 'The Tithe-collector', domain: 'thought', wander: { radius: 4 },
    // The road to Kronvall is open again: the Tithe can travel (Daniel: villagers start walking it).
    moves: [{ when: roadOpen, to: 'ice-road-far', radius: 8 }],
  },
  { id: 'hollow', name: 'The Hollow', role: 'The blank man in the boathouse', domain: 'craft', startsHollow: true, wander: { radius: 0 } },
  { id: 'lilja', name: 'Lilja', role: "Signe's little sister", domain: 'kin', offering: 'You holding her up in the water, then letting go, and she did not sink', wander: { radius: 5, onIce: true },
    moves: [{ when: roadOpen, to: 'ice-road-near', radius: 6, onIce: true }],
  },
  { id: 'torvald', name: 'Torvald', role: "Signe's father, a fisherman", domain: 'craft', wander: { radius: 0 } },

  // People in Järnfors (chapter 2). Drafts from docs/chapter-2-jarnfors.md; Daniel decided Brita is about 117.
  { id: 'edda', map: 'jarnfors', name: 'Edda', role: "Runs the Hollow-house; Halvar and Brita's granddaughter", domain: 'kin', keystone: true, offering: 'Halvar, once, seeming to look at her when she was small', wander: { radius: 3 } },
  { id: 'brita', map: 'jarnfors', name: 'Brita', role: "Halvar's widow, about 117, nearly blind", domain: 'kin', offering: 'The morning Halvar refused, and what he said to her after', wander: { radius: 0 },
    // Told the truth, she has herself carried up to the crest with him (Brita's bowl).
    moves: [{ when: (v) => v.flag('quest_britas-bowl') === 'truth', to: 'brita-crest', radius: 0 }] },
  { id: 'halvar', map: 'jarnfors', name: 'Halvar', role: 'The master builder Maren hollowed, a century ago', domain: 'craft', startsHollow: true, wander: { radius: 0 },
    moves: [{ when: (v) => v.flag('quest_britas-bowl') === 'truth', to: 'halvar-crest', radius: 0 }] },
  { id: 'gudmund', map: 'jarnfors', name: 'Gudmund', role: 'The dam-master, who lost the keeping to the Tithe', domain: 'craft', teaches: 'mend', offering: 'His first stone: the day he learned to read one', wander: { radius: 4 } },
  { id: 'clerk', map: 'jarnfors', name: 'The clerk', role: 'Keeps the Tithe-house and its ledger', domain: 'thought', offering: 'The first child he signed away to Kronvall', wander: { radius: 2 } },
  { id: 'arn', map: 'jarnfors', name: 'Arn', role: 'A sick boy left behind at the Tithe-house', domain: 'kin', wander: { radius: 1 },
    // Safe at the Hollow-house once carried there, struck from the list, or once the clerk is emptied.
    moves: [{ when: (v) => !!v.flag('arn_safe') || v.hollowed('clerk'), to: 'arn-safe', radius: 1 }] },
  { id: 'knut', map: 'jarnfors', name: 'Knut', role: 'A forge-hand in the lower quarter', domain: 'craft', wander: { radius: 4 } },
];

/** The people who live on a map. */
export function peopleOf(map: string): NpcDef[] {
  return NPCS.filter((n) => (n.map ?? 'kallsjo') === map);
}
