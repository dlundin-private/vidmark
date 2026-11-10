import type { CraftAction, WeaveModifier, WeaveTarget } from '../../content/data/craft';
import { KEEPSAKES, type Domain, type KeepsakeId } from '../../content/data/keepsakes';
import { NPCS, type NpcId } from '../../content/data/npcs';
import type { Tile } from '../iso/types';

/** Bump when the shape changes, and add a migration in save.ts. */
export const STATE_VERSION = 7;

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
  /** No longer in the region (taken by the Tithe at the end of chapter 1). */
  gone?: boolean;
}

export type SkillId = CraftAction;

export interface SkillState {
  /** Distinct things this skill has been used on for real (design: skills grow with use, not grinding). */
  usedOn: string[];
  /** Levels taught by memories (design: "memories teach"). */
  taught: number;
}

/** A memory consumed into a Weave: a Keepsake, someone's Offering, or an Echo of someone hollowed. */
export type WeaveAnchor =
  | { kind: 'keepsake'; id: KeepsakeId }
  | { kind: 'offering'; npc: NpcId }
  | { kind: 'echo'; npc: NpcId };

export interface SavedWeave {
  id: string;
  name: string;
  action: CraftAction;
  target: WeaveTarget;
  modifier: WeaveModifier | null;
  /** A memory consumed into the Weave: its effects become permanent. */
  anchor: WeaveAnchor | null;
}

/** A Craft effect on an object or a tile of ice. */
export interface CraftEffect {
  kind: 'strengthened' | 'weakened';
  /** Laid with the Trigger modifier and still waiting for someone to step on it. */
  armed: boolean;
  /** Rests left before it fades; null = permanent (an anchored Weave). */
  restsLeft: number | null;
}

/** How the world differs from the map because of what Signe has done. */
export interface WorldState {
  /** By map object id. */
  objects: Record<string, { broken?: boolean; at?: Tile; effect?: CraftEffect }>;
  /** By tile key "x,y". */
  tiles: Record<string, { effect?: CraftEffect; brokenRestsLeft?: number }>;
}

export interface PromiseRecord {
  id: string;
  to: NpcId;
  kept: boolean | null;
}

export type FlagValue = boolean | number | string;

/** Everything about one map that Signe changed or saw, kept while she is somewhere else. */
export interface MapMemory {
  world: WorldState;
  sketched: { tiles: string; places: string[] };
  position: Tile | null;
}

/** What a finished chapter decided, kept for the chapters after it (src/systems/chapters.ts). */
export type ChapterRecord = ChapterOneRecord | ChapterTwoRecord;

/** Kallsjö. */
export interface ChapterOneRecord {
  chapter: 1;
  /** Gave Signe an Offering. */
  gave: NpcId[];
  /** Hollowed by Signe (not the Hollow who started that way). */
  hollowed: NpcId[];
  wolvesHollowed: number;
  burned: KeepsakeId[];
  promises: { id: string; to: NpcId; kept: boolean }[];
  /** Quest id -> the outcome it ended with. */
  quests: Record<string, string>;
  /** Someone saw her hollow a person. */
  villageKnew: boolean;
  /** Who came for Lilja: Reeve Olle, or Kronvall's own men because Signe emptied him. */
  liljaTakenBy: 'olle' | 'kronvall';
  /** How Signe knew her when she was taken. */
  lilja: 'sister' | 'stranger' | 'hollow';
}

/** Järnfors. */
export interface ChapterTwoRecord {
  chapter: 2;
  /** How the dam crisis ended. */
  dam: 'knit' | 'taken' | 'relief' | 'held' | 'broken';
  /** How Signe came by Kin, if she did. */
  kin: 'asked' | 'bargain' | 'taken' | 'none';
  gave: NpcId[];
  hollowed: NpcId[];
  quests: Record<string, string>;
  /** What she told Brita about Halvar, if anything. */
  brita: 'truth' | 'lie' | 'nothing' | null;
  /** What became of Knut and the cramp-thieves. */
  knut: 'spared' | 'gave' | 'hollowed' | 'let' | 'avoided' | 'never';
  /** Arn got out of the cold. */
  arnSafe: boolean;
  /** The boy remembered Lilja, and Signe knew it was her. */
  liljaTrace: boolean;
  villageKnew: boolean;
}

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
  /**
   * Weaves Signe carries ready (ids, at most tuning.weaveSlots). Only these can
   * be cast; changing them means refocusing, by the fire at home.
   */
  heldWeaves: string[];
  promises: PromiseRecord[];
  flags: Record<string, FlagValue>;
  position: Tile | null;
  world: WorldState;
  /**
   * What Signe remembers of each person she has met: impression keys, in the
   * order she formed them (texts in content/data/impressions.ts). Asked
   * questions live here too, so they aren't asked twice.
   */
  impressions: Partial<Record<NpcId, string[]>>;
  /** Her journal map: tiles she has sketched (explored.ts, base64 bits) and places she has found (map place ids). */
  sketched: { tiles: string; places: string[] };
  /** The chapter she is in (content/data/chapters.ts). */
  chapter: number;
  /** The map she is on (src/systems/maps.ts). `world`, `sketched` and `position` belong to it. */
  map: string;
  /** The other maps she has been on, as she left them. */
  elsewhere: Record<string, MapMemory>;
  /** What each finished chapter decided, oldest first. */
  chapters: ChapterRecord[];
}

export function createNewGame(basePower: number): GameState {
  const keepsakes = Object.fromEntries(
    KEEPSAKES.map((k) => [k.id, { status: 'kept', formed: !k.formedLater }]),
  ) as Record<KeepsakeId, KeepsakeState>;
  const npcs = Object.fromEntries(
    NPCS.map((n) => [n.id, { offered: false, hollowed: !!n.startsHollow, faithLost: false }]),
  ) as Record<NpcId, NpcState>;
  const skill = (): SkillState => ({ usedOn: [], taught: 0 });
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
    heldWeaves: [],
    promises: [],
    flags: {},
    position: null,
    world: { objects: {}, tiles: {} },
    impressions: {},
    sketched: { tiles: '', places: [] },
    chapter: 1,
    chapters: [],
    map: 'kallsjo',
    elsewhere: {},
  };
}
