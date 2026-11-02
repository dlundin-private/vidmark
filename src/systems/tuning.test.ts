import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import { LiveTuning } from './tuning';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}

describe('LiveTuning', () => {
  it('starts from the defaults', () => {
    expect(new LiveTuning(memoryStorage()).values).toEqual(DEFAULT_TUNING);
  });

  it('applies and persists overrides', () => {
    const storage = memoryStorage();
    new LiveTuning(storage).set('basePower', 4);
    const again = new LiveTuning(storage);
    expect(again.values.basePower).toBe(4);
    expect(again.isOverridden('basePower')).toBe(true);
  });

  it('drops an override set back to its default, and resets all', () => {
    const t = new LiveTuning(memoryStorage());
    t.set('maxWounds', 5);
    t.set('maxWounds', DEFAULT_TUNING.maxWounds);
    expect(t.isOverridden('maxWounds')).toBe(false);
    t.set('burnShame', 9);
    t.resetAll();
    expect(t.values).toEqual(DEFAULT_TUNING);
  });

  it('ignores garbage and unknown keys in storage', () => {
    const t = new LiveTuning(memoryStorage({ 'vidmark.tuning': '{"basePower":"lots","nope":3,"maxWounds":4}' }));
    expect(t.values.basePower).toBe(DEFAULT_TUNING.basePower);
    expect(t.values.maxWounds).toBe(4);
    expect('nope' in t.values).toBe(false);
  });
});
