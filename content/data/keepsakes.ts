import type { TuningKey } from './tuning';

/** The three domains. Some Keepsakes belong to none. */
export type Domain = 'kin' | 'craft' | 'thought';

export type KeepsakeId = 'swim' | 'coat' | 'story' | 'shame' | 'whyYouLeft' | 'name';

export interface KeepsakeDef {
  id: KeepsakeId;
  title: string;
  /** The memory as the journal shows it while Signe still has it. */
  memory: string;
  domain: Domain | null;
  /** Tuning value for the Power reserve this Keepsake gives when burned. */
  burnTuning: TuningKey;
  /** Formed during play rather than held from the start (design: "formed at the end of chapter 1"). */
  formedLater?: boolean;
  /** Present but not shown in the journal until late (design: "hidden until late"). */
  hiddenUntilLate?: boolean;
}

// Wording follows the Keepsakes table in docs/design.md.
export const KEEPSAKES: readonly KeepsakeDef[] = [
  {
    id: 'swim',
    title: 'The swim',
    memory: 'Teaching your little sister to swim in the lake.',
    domain: 'kin',
    burnTuning: 'burnSwim',
  },
  {
    id: 'coat',
    title: 'The coat',
    memory: 'A stranger gave you their coat one winter, asking nothing back.',
    domain: 'craft',
    burnTuning: 'burnCoat',
  },
  {
    id: 'story',
    title: 'The story',
    memory: "Your father's bedtime tale, a garbled history of the predecessor.",
    domain: 'thought',
    burnTuning: 'burnStory',
  },
  {
    id: 'shame',
    title: 'The shame',
    memory: 'You ran away, and someone got hurt.',
    domain: null,
    burnTuning: 'burnShame',
  },
  {
    id: 'whyYouLeft',
    title: 'Why you left',
    memory: 'To bring Lilja home.',
    domain: null,
    burnTuning: 'burnWhyYouLeft',
    formedLater: true,
  },
  {
    id: 'name',
    title: 'Your name',
    memory: 'Signe.',
    domain: null,
    burnTuning: 'burnName',
    hiddenUntilLate: true,
  },
];

export function keepsakeDef(id: KeepsakeId): KeepsakeDef {
  const def = KEEPSAKES.find((k) => k.id === id);
  if (!def) throw new Error(`Unknown Keepsake "${id}"`);
  return def;
}
