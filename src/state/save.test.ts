import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import * as A from './actions';
import { createNewGame } from './GameState';
import { SAVE_KEY, SaveError, deserialize, serialize, type SaveStorage } from './save';
import { GameStore } from './store';

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('serialize / deserialize', () => {
  it('round-trips a played state exactly', () => {
    const s = createNewGame(2);
    A.recordOffering(s, 'ebbe', DEFAULT_TUNING);
    A.burnKeepsake(s, 'swim', DEFAULT_TUNING);
    A.setFlag(s, 'netsMended', true);
    A.setPosition(s, { x: 4, y: 7 });
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('rejects things that are not Vidmark saves', () => {
    expect(() => deserialize('not json')).toThrow(SaveError);
    expect(() => deserialize('{"game":"other","version":1,"state":{}}')).toThrow(SaveError);
  });

  it('rejects saves from a newer version', () => {
    const file = JSON.parse(serialize(createNewGame(2)));
    file.version = 99;
    expect(() => deserialize(JSON.stringify(file))).toThrow(/newer version/);
  });

  it('rejects damaged saves with a readable reason', () => {
    const file = JSON.parse(serialize(createNewGame(2)));
    delete file.state.keepsakes.swim;
    expect(() => deserialize(JSON.stringify(file))).toThrow(/Keepsake "swim" is missing/);
  });
});

describe('GameStore', () => {
  it('saves to and loads from storage', () => {
    const storage = memoryStorage();
    const store = new GameStore(storage, () => DEFAULT_TUNING);
    store.update((s, t) => A.recordHollowing(s, 'hermit', t));
    expect(store.save()).toBe(true);
    expect(storage.data.has(SAVE_KEY)).toBe(true);

    const other = new GameStore(storage, () => DEFAULT_TUNING);
    expect(other.load()).toBeNull();
    expect(A.echoes(other.state)).toEqual(['hermit']);
  });

  it('notifies listeners on every change', () => {
    const store = new GameStore(memoryStorage(), () => DEFAULT_TUNING);
    let calls = 0;
    store.subscribe(() => calls++);
    store.update((s) => A.setFlag(s, 'x', 1));
    store.newGame();
    expect(calls).toBe(2);
  });

  it('keeps the current game when a load fails', () => {
    const store = new GameStore(memoryStorage(), () => DEFAULT_TUNING);
    store.update((s) => A.setFlag(s, 'kept', true));
    expect(store.loadFrom('{"broken"')).toMatch(/not valid JSON/);
    expect(store.state.flags.kept).toBe(true);
  });

  it('works without storage (private mode)', () => {
    const store = new GameStore(null, () => DEFAULT_TUNING);
    expect(store.save()).toBe(false);
    expect(store.load()).toBeNull();
  });
});
