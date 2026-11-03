import { NPCS, type NpcId } from '../../content/data/npcs';
import { keepsakeDef, type KeepsakeId } from '../../content/data/keepsakes';
import type { Tuning } from '../../content/data/tuning';
import type { Tile } from '../iso/types';
import { ExploredMap } from './explored';
import type { CraftEffect, FlagValue, GameState, SavedWeave, SkillId, WeaveAnchor } from './GameState';

// Reads and changes to GameState. Actions mutate the state they are given;
// GameStore wraps them so scenes get change notifications.

// --- Hearth and Power -------------------------------------------------------

/** People in Signe's Hearth: they offered, and are neither hollowed nor faithless. */
export function hearth(state: GameState): NpcId[] {
  return NPCS.map((n) => n.id).filter((id) => {
    const n = state.npcs[id];
    return n.offered && !n.hollowed && !n.faithLost;
  });
}

/**
 * Refillable Power ceiling: base plus one share per Hearth member, minus a
 * share for every Offering consumed into a Weave (design: "one point of
 * Hearth power for good").
 */
export function maxPower(state: GameState, t: Tuning): number {
  const consumed = state.weaves.filter((w) => w.anchor?.kind === 'offering').length;
  return Math.max(0, t.basePower + (hearth(state).length - consumed) * t.powerPerOffering);
}

/** Everything Signe can spend right now. */
export function availablePower(state: GameState): number {
  return state.power + state.reserve;
}

/**
 * Spends Power, refillable first, then the one-time reserve.
 * Returns false and changes nothing if there isn't enough.
 */
export function spendPower(state: GameState, amount: number): boolean {
  if (amount < 0 || availablePower(state) < amount) return false;
  const fromPower = Math.min(state.power, amount);
  state.power -= fromPower;
  state.reserve -= amount - fromPower;
  return true;
}

/**
 * Resting between fights refills Power toward the Hearth ceiling. The reserve
 * does not refill. Every Echo she carries crowds the Hearth out (decided by
 * Daniel: "unbearably tempting once you tried it"): each refills less.
 */
export function rest(state: GameState, t: Tuning): void {
  state.power = restRefill(state, t);
}

/** What a rest refills Power to: the Hearth ceiling, minus what the Echoes crowd out. */
export function restRefill(state: GameState, t: Tuning): number {
  return Math.max(0, maxPower(state, t) - echoCount(state) * t.restPenaltyPerEcho);
}

/** Every life she carries, people and wolves alike. */
export function echoCount(state: GameState): number {
  return echoes(state).length + wolfEchoes(state);
}

/** Keeps power within its ceiling after the Hearth shrinks. */
export function clampPower(state: GameState, t: Tuning): void {
  state.power = Math.max(0, Math.min(state.power, maxPower(state, t)));
}

export function addReserve(state: GameState, amount: number): void {
  state.reserve = Math.max(0, state.reserve + amount);
}

// --- People -----------------------------------------------------------------

/**
 * Someone gives Signe a memory: they join her Hearth, her ceiling rises at
 * once, and a memory of their craft deepens the matching skill.
 */
export function recordOffering(state: GameState, npc: NpcId, t: Tuning): void {
  const n = state.npcs[npc];
  if (n.hollowed || n.offered) return;
  n.offered = true;
  state.power = Math.min(state.power + t.powerPerOffering, maxPower(state, t));
  teach(state, npc, 1);
}

/**
 * Signe takes everything: they become a Hollow, leave her Hearth, and she gains
 * a one-time reserve. A whole life teaches faster and fuller than an Offering.
 */
export function recordHollowing(state: GameState, npc: NpcId, t: Tuning): void {
  const n = state.npcs[npc];
  if (n.hollowed) return;
  n.hollowed = true;
  state.reserve += t.hollowingReserve;
  clampPower(state, t);
  teach(state, npc, 2);
  // She takes everything they knew, too: what she'd otherwise have had to find out.
  const knows = HOLLOWING_KNOWLEDGE[npc];
  for (const flag of knows?.flags ?? []) state.flags[flag] = true;
  for (const key of knows?.memories ?? []) remember(state, npc, key);
}

/**
 * What someone's whole life tells her: world flags, and what she now knows
 * about them without asking (drafts, docs/decisions.md).
 */
const HOLLOWING_KNOWLEDGE: Partial<Record<NpcId, { flags?: string[]; memories?: string[] }>> = {
  hermit: { flags: ['knows_safe_route'] },
  olle: { flags: ['knows_tithe_takes_people'] },
  gerda: { memories: ['statue', 'grandmother'] },
};

function teach(state: GameState, npc: NpcId, levels: number): void {
  const skill = NPCS.find((d) => d.id === npc)?.teaches;
  if (skill) state.skills[skill].taught += levels;
}

/**
 * A villager went through Signe's trap ice and climbed out hurt (decided by
 * Daniel: hurt, not killed). If they were in her Hearth, they lose faith in her.
 * Their dialogue can read the flag.
 */
export function hurtByTrap(state: GameState, npc: NpcId, t: Tuning): void {
  state.flags[`hurt_by_trap_${npc}`] = true;
  if (state.npcs[npc].offered && !state.npcs[npc].hollowed) setFaithLost(state, npc, true, t);
}

export function setFaithLost(state: GameState, npc: NpcId, lost: boolean, t: Tuning): void {
  state.npcs[npc].faithLost = lost;
  clampPower(state, t);
}

/** Hollowed people whose echo Signe carries (the boathouse Hollow was hollowed by someone else). */
export function echoes(state: GameState): NpcId[] {
  return NPCS.filter((n) => !n.startsHollow && state.npcs[n.id].hollowed).map((n) => n.id);
}

/** Someone saw Signe hollow a person: the village knows (Daniel: only by evidence). */
export const FLAG_VILLAGE_KNOWS = 'village_knows';

export function seenHollowing(state: GameState, victim: NpcId, witness: NpcId): void {
  state.flags[FLAG_VILLAGE_KNOWS] = true;
  state.flags.seen_hollowing = NPCS.find((n) => n.id === victim)!.name;
  state.flags.seen_by = witness;
}

/** Flag counting the wolves Signe has hollowed. */
export const FLAG_HOLLOWED_WOLVES = 'hollowed_wolves';

/**
 * Signe takes everything from a wolf (decided by Daniel): a smaller reserve than
 * a person gives, and a wordless Echo of hunger and the pack.
 */
export function hollowWolf(state: GameState, t: Tuning): void {
  state.reserve += t.wolfHollowingReserve;
  state.flags[FLAG_HOLLOWED_WOLVES] = wolfEchoes(state) + 1;
}

export function wolfEchoes(state: GameState): number {
  return Number(state.flags[FLAG_HOLLOWED_WOLVES] ?? 0);
}

/** Other lives crowd her own: anyone or anything she has hollowed. */
export function carriesEchoes(state: GameState): boolean {
  return echoes(state).length > 0 || wolfEchoes(state) > 0;
}

// --- Keepsakes --------------------------------------------------------------

export function hasKeepsake(state: GameState, id: KeepsakeId): boolean {
  const k = state.keepsakes[id];
  return k.formed && k.status === 'kept';
}

/** Burns a Keepsake for a one-time reserve. Returns the Power gained, or 0 if it can't be burned. */
export function burnKeepsake(state: GameState, id: KeepsakeId, t: Tuning): number {
  if (!hasKeepsake(state, id)) return 0;
  state.keepsakes[id].status = 'burned';
  const gained = t[keepsakeDef(id).burnTuning];
  state.reserve += gained;
  return gained;
}

export function formKeepsake(state: GameState, id: KeepsakeId): void {
  state.keepsakes[id].formed = true;
}

// --- Wounds -----------------------------------------------------------------

export function addWound(state: GameState, t: Tuning): void {
  state.wounds = Math.min(t.maxWounds, state.wounds + 1);
}

export function healWound(state: GameState): void {
  state.wounds = Math.max(0, state.wounds - 1);
}

export function hasFallen(state: GameState, t: Tuning): boolean {
  return state.wounds >= t.maxWounds;
}

// --- Skills -----------------------------------------------------------------

export const MAX_SKILL_LEVEL = 3;

/** 1 to 3: taught levels plus levels from use on distinct things. */
export function skillLevel(state: GameState, skill: SkillId, t: Tuning): number {
  const s = state.skills[skill];
  const used = s.usedOn.length;
  const fromUse = (used >= t.skillLevel2At ? 1 : 0) + (used >= t.skillLevel3At ? 1 : 0);
  return Math.min(MAX_SKILL_LEVEL, 1 + s.taught + fromUse);
}

/** Using a skill for real on something new trains it; repeating on the same thing doesn't. */
export function recordSkillUse(state: GameState, skill: SkillId, on: string): boolean {
  const used = state.skills[skill].usedOn;
  if (used.includes(on)) return false;
  used.push(on);
  return true;
}

// --- Weaves -----------------------------------------------------------------

/** Memories Signe could consume into a Weave right now. */
export function availableAnchors(state: GameState): WeaveAnchor[] {
  const taken = (a: WeaveAnchor) =>
    state.weaves.some((w) => w.anchor && w.anchor.kind === a.kind && JSON.stringify(w.anchor) === JSON.stringify(a));
  const anchors: WeaveAnchor[] = [];
  // "Your name" stays hidden until late (docs/decisions.md): it is never offered here.
  for (const k of ['swim', 'coat', 'story', 'shame', 'whyYouLeft'] as const) {
    if (hasKeepsake(state, k)) anchors.push({ kind: 'keepsake', id: k });
  }
  for (const id of hearth(state)) anchors.push({ kind: 'offering', npc: id });
  for (const id of echoes(state)) anchors.push({ kind: 'echo', npc: id });
  return anchors.filter((a) => !taken(a));
}

/** Saves a Weave. An anchored one consumes its memory at once: a Keepsake is gone, an Offering's share of Power is gone. A free slot carries it at once. */
export function saveWeave(state: GameState, weave: SavedWeave, t: Tuning): void {
  state.weaves.push(weave);
  if (state.heldWeaves.length < t.weaveSlots) state.heldWeaves.push(weave.id);
  if (weave.anchor?.kind === 'keepsake') state.keepsakes[weave.anchor.id].status = 'consumed';
  clampPower(state, t);
}

/** Deleting a Weave never gives a consumed memory back. */
export function deleteWeave(state: GameState, id: string): void {
  const w = state.weaves.find((x) => x.id === id);
  if (w?.anchor) return; // Anchored Weaves are permanent.
  state.weaves = state.weaves.filter((x) => x.id !== id);
  state.heldWeaves = state.heldWeaves.filter((x) => x !== id);
}

/** The Weaves Signe carries ready to cast, in slot order. */
export function heldWeaves(state: GameState): SavedWeave[] {
  return state.heldWeaves.map((id) => state.weaves.find((w) => w.id === id)).filter((w): w is SavedWeave => !!w);
}

/** Refocusing: carry a known Weave in a free slot. Returns false if all slots are full. */
export function holdWeave(state: GameState, id: string, t: Tuning): boolean {
  if (state.heldWeaves.includes(id)) return true;
  if (!state.weaves.some((w) => w.id === id) || state.heldWeaves.length >= t.weaveSlots) return false;
  state.heldWeaves.push(id);
  return true;
}

/** Refocusing: set a carried Weave down. Signe still knows it. */
export function releaseWeave(state: GameState, id: string): void {
  state.heldWeaves = state.heldWeaves.filter((x) => x !== id);
}

// --- The world --------------------------------------------------------------

export function setObjectEffect(state: GameState, id: number, effect: CraftEffect | undefined): void {
  const o = (state.world.objects[id] ??= {});
  if (effect) o.effect = effect;
  else delete o.effect;
}

export function setObjectBroken(state: GameState, id: number, broken: boolean): void {
  (state.world.objects[id] ??= {}).broken = broken;
}

export function moveObject(state: GameState, id: number, to: Tile): void {
  (state.world.objects[id] ??= {}).at = { x: to.x, y: to.y };
}

export function setTileEffect(state: GameState, x: number, y: number, effect: CraftEffect | undefined): void {
  const key = `${x},${y}`;
  const tile = (state.world.tiles[key] ??= {});
  if (effect) tile.effect = effect;
  else delete tile.effect;
  if (!tile.effect && !tile.brokenRestsLeft) delete state.world.tiles[key];
}

/** Breaks the ice open; it freezes over again after some rests. */
export function breakIce(state: GameState, x: number, y: number, rests: number): void {
  const tile = (state.world.tiles[`${x},${y}`] ??= {});
  delete tile.effect;
  tile.brokenRestsLeft = Math.max(1, rests);
}

/**
 * Rest (at home): Power refills to the Hearth ceiling (the reserve does not),
 * one wound heals, temporary Craft effects fade and broken ice refreezes.
 */
export function restAtHome(state: GameState, t: Tuning): void {
  rest(state, t);
  for (let i = 0; i < t.woundsHealedByRest; i++) healWound(state);
  const tick = (e: CraftEffect | undefined): CraftEffect | undefined => {
    if (!e || e.restsLeft === null) return e;
    return e.restsLeft > 1 ? { ...e, restsLeft: e.restsLeft - 1 } : undefined;
  };
  for (const [id, o] of Object.entries(state.world.objects)) {
    const e = tick(o.effect);
    if (e) o.effect = e;
    else delete o.effect;
    if (Object.keys(o).length === 0) delete state.world.objects[id];
  }
  for (const [key, tile] of Object.entries(state.world.tiles)) {
    const e = tick(tile.effect);
    if (e) tile.effect = e;
    else delete tile.effect;
    if (tile.brokenRestsLeft) tile.brokenRestsLeft -= 1;
    if (!tile.brokenRestsLeft) delete tile.brokenRestsLeft;
    if (!tile.effect && !tile.brokenRestsLeft) delete state.world.tiles[key];
  }
}

// --- World ------------------------------------------------------------------

export function setFlag(state: GameState, name: string, value: FlagValue): void {
  state.flags[name] = value;
}

export function getFlag(state: GameState, name: string): FlagValue | undefined {
  return state.flags[name];
}

/** Signe forms an impression of someone (or notes that she asked them about something). */
export function remember(state: GameState, npc: NpcId, key: string): void {
  const list = (state.impressions[npc] ??= []);
  if (!list.includes(key)) list.push(key);
}

export function remembers(state: GameState, npc: NpcId, key: string): boolean {
  return state.impressions[npc]?.includes(key) ?? false;
}

/** People Signe has formed any impression of, in the order of NPCS. */
export function peopleMet(state: GameState): NpcId[] {
  return NPCS.map((n) => n.id).filter((id) => (state.impressions[id]?.length ?? 0) > 0);
}

/**
 * Signe stops and sketches: everything within sight of the steps she still
 * remembers goes into her journal map, and any place she saw is found.
 * Returns how many tiles were new and which places she found.
 */
export function sketchSeen(
  state: GameState,
  steps: readonly Tile[],
  sight: number,
  size: { width: number; height: number },
  places: readonly { id: string; tile: Tile }[],
): { newTiles: number; found: string[] } {
  const map = ExploredMap.fromBase64(state.sketched.tiles, size.width, size.height);
  const newTiles = map.sketchAround(steps, sight);
  if (newTiles > 0) state.sketched.tiles = map.toBase64();
  const found: string[] = [];
  for (const p of places) {
    if (!state.sketched.places.includes(p.id) && map.has(p.tile.x, p.tile.y)) {
      state.sketched.places.push(p.id);
      found.push(p.id);
    }
  }
  return { newTiles, found };
}

/**
 * Signe goes to another map: what she did and saw here is put aside, and the
 * other map comes back as she left it (or fresh, the first time).
 */
export function travel(state: GameState, map: string): void {
  if (state.map === map) return;
  state.elsewhere[state.map] = { world: state.world, sketched: state.sketched, position: state.position };
  const back = state.elsewhere[map];
  delete state.elsewhere[map];
  state.world = back?.world ?? { objects: {}, tiles: {} };
  state.sketched = back?.sketched ?? { tiles: '', places: [] };
  state.position = back?.position ?? null;
  state.map = map;
}

/** Records a promise Signe made; whether it was kept is decided later (chapter 5 tests them). */
export function makePromise(state: GameState, id: string, to: NpcId): void {
  if (state.promises.some((p) => p.id === id)) return;
  state.promises.push({ id, to, kept: null });
}

/** Signe kept a promise she made. */
export function keepPromise(state: GameState, id: string): void {
  const p = state.promises.find((q) => q.id === id);
  if (p) p.kept = true;
}

export function promiseKept(state: GameState, id: string): boolean {
  return state.promises.some((p) => p.id === id && p.kept === true);
}

export function setPosition(state: GameState, tile: Tile): void {
  state.position = { x: tile.x, y: tile.y };
}
