import { DEFAULT_TUNING, type Tuning, type TuningKey } from '../../content/data/tuning';
import type { SaveStorage } from '../state/save';

const OVERRIDES_KEY = 'vidmark.tuning';

/**
 * Live tuning: the defaults from content/data/tuning.ts plus any values changed
 * in the debug panel. Overrides are kept per browser, separate from the save,
 * so tuning experiments survive starting a new game.
 */
export class LiveTuning {
  private overrides: Partial<Tuning> = {};

  constructor(private readonly storage: SaveStorage | null) {
    try {
      const raw = storage?.getItem(OVERRIDES_KEY);
      if (raw) this.overrides = sanitize(JSON.parse(raw));
    } catch {
      this.overrides = {};
    }
  }

  get values(): Tuning {
    return { ...DEFAULT_TUNING, ...this.overrides };
  }

  isOverridden(key: TuningKey): boolean {
    return key in this.overrides;
  }

  set(key: TuningKey, value: number): void {
    if (!Number.isFinite(value)) return;
    if (value === DEFAULT_TUNING[key]) delete this.overrides[key];
    else this.overrides[key] = value;
    this.persist();
  }

  resetAll(): void {
    this.overrides = {};
    this.persist();
  }

  private persist(): void {
    try {
      this.storage?.setItem(OVERRIDES_KEY, JSON.stringify(this.overrides));
    } catch {
      // Storage full or blocked: overrides still apply for this session.
    }
  }
}

function sanitize(raw: unknown): Partial<Tuning> {
  const out: Partial<Tuning> = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const key of Object.keys(DEFAULT_TUNING) as TuningKey[]) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
  }
  return out;
}
