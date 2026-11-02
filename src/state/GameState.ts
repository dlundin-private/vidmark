import { KEEPSAKES, type Domain, type KeepsakeId } from '../../content/data/keepsakes';
import { NPCS, type NpcId } from '../../content/data/npcs';
import type { Tile } from '../iso/types';

/** Bump when the shape changes, and add a migration in save.ts. */
export const STATE_VERSION = 1;

/**
 * kept: Signe still has it. burned: spent for Power; gone.
 * consumed: spent into a permanent Weave; gone.
 */
export type KeepsakeStatus = 'kept' | 'burned' | 'consumed';

export interface KeepsakeState {
  status: KeepsakeStatus;
  /** False for Keepsakes formed during play (why you left) until they form. */
  formed: boolean;
}

export interface NpcState {
  /** Has given Signe an Offering. */
  offered: boolean;
  /** Taken everything from: now a Hollow. */
  hollowed: boolean;
  /** Lost faith in Signe: no longer part of her Hearth. */
  faithLost: boolean;
}

export type SkillId = 'strengthen' | 'weaken' | 'push' | 'mend';

export interface SkillState {
  level: number;
  xp: number;
}

export interface SavedWeave {
  id: string;
  name: string;
  action: SkillId;
  target: string;
  modifier: string | null;
  /** A memory consumed into the Weave, making it permanent. */
  anchor: KeepsakeId | NpcId | null;
}

export interface PromiseRecord {
  id: string;
  to: NpcId;
  kept: boolean | null;
}

export type FlagValue = boolean | number | string;

/** Everything that persists. Saving = serialising this object. */
export interface GameState {
  version: number;
  domains: Domain[];
  keepsakes: Record<KeepsakeId, KeepsakeState>;
  npcs: Record<NpcId, NpcState>;
  /** Refillable Power currently available (at most maxPower). */
  power: number;
  /** One-time Power from hollowing and burning; does not refill. */
  reserve: number;
  wounds: number;
  skills: Record<SkillId, SkillState>;
  weaves: SavedWeave[];
  promises: PromiseRecord[];
  flags: Record<string, FlagValue>;
  position: Tile | null;
}

export function createNewGame(basePower: number): GameState {
  const keepsakes = Object.fromEntries(
    KEEPSAKES.map((k) => [k.id, { status: 'kept', formed: !k.formedLater }]),
  ) as Record<KeepsakeId, KeepsakeState>;
  const npcs = Object.fromEntries(
    NPCS.map((n) => [n.id, { offered: false, hollowed: !!n.startsHollow, faithLost: false }]),
  ) as Record<NpcId, NpcState>;
  const skill = (): SkillState => ({ level: 1, xp: 0 });
  return {
    version: STATE_VERSION,
    domains: ['craft'],
    keepsakes,
    npcs,
    power: basePower,
    reserve: 0,
    wounds: 0,
    skills: { strengthen: skill(), weaken: skill(), push: skill(), mend: skill() },
    weaves: [],
    promises: [],
    flags: {},
    position: null,
  };
}
