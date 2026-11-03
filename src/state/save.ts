import { KEEPSAKES } from '../../content/data/keepsakes';
import { NPCS } from '../../content/data/npcs';
import { STATE_VERSION, type GameState } from './GameState';

export const SAVE_KEY = 'vidmark.save';
/** The game as it was at the last rest at home: where death returns to. */
export const REST_KEY = 'vidmark.rest';

export interface SaveFile {
  game: 'vidmark';
  version: number;
  savedAt: string;
  state: GameState;
}

/** Migrations from version N to N+1, keyed by N. */
const MIGRATIONS: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {
  // 2: skills track what they were used on; the world remembers Craft effects.
  1: (s) => {
    const skills: Record<string, unknown> = {};
    for (const [id, old] of Object.entries((s.skills ?? {}) as Record<string, { level?: number }>)) {
      skills[id] = { usedOn: [], taught: Math.max(0, (old?.level ?? 1) - 1) };
    }
    return { ...s, skills, weaves: [], world: { objects: {}, tiles: {} } };
  },
  // 3: Signe remembers people. Anyone already met gets their first impression.
  2: (s) => {
    const flags = (s.flags ?? {}) as Record<string, unknown>;
    const impressions: Record<string, string[]> = {};
    for (const id of ['ebbe', 'hermit', 'gerda', 'olle', 'hollow']) if (flags[`met_${id}`]) impressions[id] = ['met'];
    // Weaves are carried in a few slots now; carry the first three.
    const weaves = (Array.isArray(s.weaves) ? s.weaves : []) as { id: string }[];
    return { ...s, impressions, heldWeaves: weaves.slice(0, 3).map((w) => w.id) };
  },
  // 4: the journal map. Nothing sketched yet.
  3: (s) => ({ ...s, sketched: { tiles: '', places: [] } }),
  // 5: chapters. Everyone so far is in chapter 1, and is past the intro.
  4: (s) => ({ ...s, chapter: 1, chapters: [], flags: { ...((s.flags ?? {}) as Record<string, unknown>), intro_seen: true } }),
  // 6: more than one map. Everyone so far is in Kallsjö.
  5: (s) => ({ ...s, map: 'kallsjo', elsewhere: {} }),
};

export function serialize(state: GameState, now = new Date()): string {
  const file: SaveFile = { game: 'vidmark', version: STATE_VERSION, savedAt: now.toISOString(), state };
  return JSON.stringify(file);
}

export class SaveError extends Error {}

/** Parses and checks a save, migrating older versions. Throws SaveError with a readable message. */
export function deserialize(text: string): GameState {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new SaveError('The save is not valid JSON.');
  }
  if (!isObject(file) || file.game !== 'vidmark' || !isObject(file.state)) {
    throw new SaveError('This is not a Vidmark save.');
  }
  let version = typeof file.version === 'number' ? file.version : NaN;
  if (!Number.isInteger(version) || version < 1) throw new SaveError('The save has no valid version.');
  if (version > STATE_VERSION) throw new SaveError(`The save is from a newer version (${version}) of the game.`);

  let state = file.state;
  while (version < STATE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) throw new SaveError(`No migration from save version ${version}.`);
    state = migrate(state);
    version++;
  }
  state.version = STATE_VERSION;
  checkShape(state);
  return state as unknown as GameState;
}

function checkShape(s: Record<string, unknown>): void {
  const fail = (what: string) => {
    throw new SaveError(`The save is damaged: ${what}.`);
  };
  for (const key of ['power', 'reserve', 'wounds'] as const) {
    if (typeof s[key] !== 'number' || !Number.isFinite(s[key])) fail(`${key} is not a number`);
  }
  if (!Array.isArray(s.domains)) fail('domains is missing');
  if (!isObject(s.keepsakes)) fail('keepsakes are missing');
  else for (const k of KEEPSAKES) if (!isObject(s.keepsakes[k.id])) fail(`Keepsake "${k.id}" is missing`);
  if (!isObject(s.npcs)) fail('people are missing');
  else for (const n of NPCS) if (!isObject(s.npcs[n.id])) fail(`"${n.id}" is missing`);
  if (!isObject(s.skills)) fail('skills are missing');
  if (!Array.isArray(s.weaves) || !Array.isArray(s.promises)) fail('Weaves or promises are missing');
  if (!isObject(s.flags)) fail('world flags are missing');
  if (!isObject(s.world) || !isObject(s.world.objects) || !isObject(s.world.tiles)) fail('the world is missing');
  if (!isObject(s.impressions)) fail('memories of people are missing');
  if (!Array.isArray(s.heldWeaves)) fail('carried Weaves are missing');
  if (typeof s.chapter !== 'number' || !Array.isArray(s.chapters)) fail('the chapter is missing');
  if (typeof s.map !== 'string' || !isObject(s.elsewhere)) fail('the map is missing');
  if (!isObject(s.sketched) || typeof s.sketched.tiles !== 'string' || !Array.isArray(s.sketched.places)) fail('the journal map is missing');
  if (s.position !== null && !isObject(s.position)) fail('position is invalid');
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Minimal storage interface so tests can pass a fake; the game passes localStorage. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage can throw (private mode, blocked site data); treat that as "no storage". */
export function browserStorage(): SaveStorage | null {
  try {
    const s = window.localStorage;
    const probe = '__vidmark_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
