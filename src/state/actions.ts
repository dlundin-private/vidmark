import { NPCS, type NpcId } from '../../content/data/npcs';
import { keepsakeDef, type KeepsakeId } from '../../content/data/keepsakes';
import type { Tuning } from '../../content/data/tuning';
import type { Tile } from '../iso/types';
import type { FlagValue, GameState } from './GameState';

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

/** Refillable Power ceiling: base plus one share per Hearth member. */
export function maxPower(state: GameState, t: Tuning): number {
  return t.basePower + hearth(state).length * t.powerPerOffering;
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

/** Resting between fights refills Power to the Hearth ceiling. The reserve does not refill. */
export function rest(state: GameState, t: Tuning): void {
  state.power = maxPower(state, t);
}

/** Keeps power within its ceiling after the Hearth shrinks. */
export function clampPower(state: GameState, t: Tuning): void {
  state.power = Math.max(0, Math.min(state.power, maxPower(state, t)));
}

export function addReserve(state: GameState, amount: number): void {
  state.reserve = Math.max(0, state.reserve + amount);
}

// --- People -----------------------------------------------------------------

/** Someone gives Signe a memory: they join her Hearth, and her ceiling rises at once. */
export function recordOffering(state: GameState, npc: NpcId, t: Tuning): void {
  const n = state.npcs[npc];
  if (n.hollowed || n.offered) return;
  n.offered = true;
  state.power = Math.min(state.power + t.powerPerOffering, maxPower(state, t));
}

/** Signe takes everything: they become a Hollow, leave her Hearth, and she gains a one-time reserve. */
export function recordHollowing(state: GameState, npc: NpcId, t: Tuning): void {
  const n = state.npcs[npc];
  if (n.hollowed) return;
  n.hollowed = true;
  state.reserve += t.hollowingReserve;
  clampPower(state, t);
}

export function setFaithLost(state: GameState, npc: NpcId, lost: boolean, t: Tuning): void {
  state.npcs[npc].faithLost = lost;
  clampPower(state, t);
}

/** Hollowed people whose echo Signe carries (the boathouse Hollow was hollowed by someone else). */
export function echoes(state: GameState): NpcId[] {
  return NPCS.filter((n) => !n.startsHollow && state.npcs[n.id].hollowed).map((n) => n.id);
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

// --- World ------------------------------------------------------------------

export function setFlag(state: GameState, name: string, value: FlagValue): void {
  state.flags[name] = value;
}

export function getFlag(state: GameState, name: string): FlagValue | undefined {
  return state.flags[name];
}

export function setPosition(state: GameState, tile: Tile): void {
  state.position = { x: tile.x, y: tile.y };
}
