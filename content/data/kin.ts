import type { TuningKey } from './tuning';

// Kin: the living domain (docs/design.md). Signe gains it in Järnfors from the
// Keystone, Edda (Daniel: a Keystone never holds the starting domain; with a
// Craft start, Järnfors' holds Kin). Four abilities mirroring Craft (Daniel).
// What each does is Claude's draft (docs/decisions.md). Craft works on made
// things; Kin works on the living, Signe included.

export type KinAction = 'bolster' | 'calm' | 'heal' | 'sense';

export interface KinDef {
  id: KinAction;
  name: string;
  description: string;
  costTuning: TuningKey;
  /** Can be aimed at Signe herself. */
  onSelf: boolean;
}

export const KIN_ACTIONS: readonly KinDef[] = [
  {
    id: 'bolster',
    name: 'Strengthen',
    description: 'Make a body hold. On yourself: the next wound before you rest does not land.',
    costTuning: 'kinBolsterCost',
    onSelf: true,
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Quiet a living thing. In a fight, a calmed enemy loses its next turn.',
    costTuning: 'kinCalmCost',
    onSelf: false,
  },
  {
    id: 'heal',
    name: 'Heal',
    description: 'Close a wound: one of yours, or ease someone who is hurt or sick.',
    costTuning: 'kinHealCost',
    onSelf: true,
  },
  {
    id: 'sense',
    name: 'Sense',
    description: 'Feel what someone holds closest, and whether they would ever give it.',
    costTuning: 'kinSenseCost',
    onSelf: true,
  },
];

export function kinDef(id: KinAction): KinDef {
  return KIN_ACTIONS.find((k) => k.id === id)!;
}
