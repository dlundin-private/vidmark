import type { TuningKey } from './tuning';

// Craft: the slice's domain. Actions, Weave parts and which objects Craft can
// work on. Costs live in tuning.ts. Rules not in the design doc are drafts,
// listed in docs/decisions.md.

export type CraftAction = 'strengthen' | 'weaken' | 'push' | 'mend';
export type WeaveTarget = 'object' | 'surface' | 'area';
export type WeaveModifier = 'duration' | 'range' | 'size' | 'trigger';

export interface ActionDef {
  id: CraftAction;
  name: string;
  description: string;
  /** What a plain use (not a Weave) can be aimed at. */
  targets: readonly WeaveTarget[];
  /** Tuning value for its cost (Push is costed per distance instead). */
  costTuning: TuningKey | null;
  /** Gets better with use (design: "training for Mend and Weaken"). */
  trainable: boolean;
}

export const ACTIONS: readonly ActionDef[] = [
  {
    id: 'strengthen',
    name: 'Strengthen',
    description: 'Make an object or a patch of ice resilient. Strengthened ice holds, and cannot be weakened.',
    targets: ['object', 'surface'],
    costTuning: 'strengthenCost',
    trainable: false,
  },
  {
    id: 'weaken',
    name: 'Weaken',
    description: 'Make an object brittle, or crack the ice: whoever stands on it goes through.',
    targets: ['object', 'surface'],
    costTuning: 'weakenCost',
    trainable: true,
  },
  {
    id: 'push',
    name: 'Push',
    description: 'Move an object straight away from you. Costs 1 Power per 2 tiles.',
    targets: ['object'],
    costTuning: null,
    trainable: false,
  },
  {
    id: 'mend',
    name: 'Mend',
    description: 'Repair something broken. Bigger things need more skill.',
    targets: ['object'],
    costTuning: 'mendCost',
    trainable: true,
  },
];

export const TARGETS: readonly { id: WeaveTarget; name: string; description: string }[] = [
  { id: 'object', name: 'An object', description: 'One made thing: a crate, a net rack, a boat.' },
  { id: 'surface', name: 'A surface', description: 'One tile of ice.' },
  { id: 'area', name: 'An area', description: 'The ice in a 3 x 3 patch around a tile. Costs 1 more.' },
];

export const MODIFIERS: readonly { id: WeaveModifier; name: string; description: string }[] = [
  { id: 'duration', name: 'Duration', description: 'The effect lasts one rest longer.' },
  { id: 'range', name: 'Range', description: 'Reach 8 tiles instead of 3.' },
  { id: 'size', name: 'Size', description: 'A surface becomes 3 x 3, an area 5 x 5; Mend can repair one size bigger.' },
  { id: 'trigger', name: 'Trigger', description: 'Lies in wait: takes effect when someone next steps on it.' },
];

/** Objects Craft can work on, by map object type. Anything not listed (trees, people, mountains) is not made, so Craft can't touch it. */
export interface CraftableDef {
  /** Push can move it. */
  pushable?: boolean;
  /** Mend skill level needed to repair it when broken. */
  mendLevel?: number;
}

export const CRAFTABLES: Record<string, CraftableDef> = {
  'net-rack': { mendLevel: 1 },
  boat: { mendLevel: 2 },
  crate: { pushable: true, mendLevel: 1 },
  sled: { pushable: true, mendLevel: 1 },
  boathouse: { mendLevel: 3 },
  house: { mendLevel: 3 },
  'house-small': { mendLevel: 3 },
  hut: { mendLevel: 3 },
  statue: { mendLevel: 2 },
  'ice-marker': { pushable: true, mendLevel: 1 },
  shelter: { mendLevel: 1 },
  'tithe-sled': { mendLevel: 1 },
  // Järnfors (chapter 2 side quests).
  'drawing-table': { mendLevel: 1 },
  'gallery-door': { mendLevel: 2 },
  cot: { mendLevel: 1 },
  // The dam crisis: preparing the relief cut.
  'relief-plug': { mendLevel: 3 },
  'sluice-cart': { pushable: true, mendLevel: 1 },
  'cut-wall': { mendLevel: 2 },
};
