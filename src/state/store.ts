import type { Tuning } from '../../content/data/tuning';
import { createNewGame, type GameState } from './GameState';
import { REST_KEY, SAVE_KEY, SaveError, deserialize, serialize, type SaveStorage } from './save';

type Listener = (state: Readonly<GameState>) => void;

/**
 * Holds the one GameState. Scenes read `state` and change it only through
 * `update(action)`, which notifies listeners; saving serialises `state`.
 */
export class GameStore {
  private current: GameState;
  private listeners = new Set<Listener>();
  private replacedCount = 0;

  constructor(
    private readonly storage: SaveStorage | null,
    private readonly tuning: () => Tuning,
  ) {
    this.current = createNewGame(tuning().basePower);
  }

  get state(): Readonly<GameState> {
    return this.current;
  }

  /** The tuning values in effect right now (defaults plus debug panel overrides). */
  get tuningValues(): Tuning {
    return this.tuning();
  }

  /** Changes whenever the whole state is replaced (new game or load), so scenes know to rebuild. */
  get generation(): number {
    return this.replacedCount;
  }

  /** Runs an action from actions.ts on the state and notifies listeners. */
  update<R>(action: (state: GameState, tuning: Tuning) => R): R {
    const result = action(this.current, this.tuning());
    this.emit();
    return result;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  newGame(): void {
    this.storage?.removeItem(REST_KEY);
    this.current = createNewGame(this.tuning().basePower);
    this.replacedCount++;
    this.emit();
  }

  /** Runs an action that changes where Signe is (travel): scenes rebuild, as after a load. */
  rebuild(action: (state: GameState, tuning: Tuning) => void): void {
    action(this.current, this.tuning());
    this.replacedCount++;
    this.emit();
  }

  get hasStorage(): boolean {
    return this.storage !== null;
  }

  hasSave(): boolean {
    return this.storage?.getItem(SAVE_KEY) != null;
  }

  save(): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(SAVE_KEY, serialize(this.current));
      return true;
    } catch {
      return false;
    }
  }

  /** Loads the saved game. Returns an error message, or null on success (or when there is no save). */
  load(): string | null {
    const text = this.storage?.getItem(SAVE_KEY);
    if (text == null) return null;
    return this.loadFrom(text);
  }

  /** Loads a save from JSON text (e.g. pasted into the debug panel). Returns an error message or null. */
  loadFrom(text: string): string | null {
    try {
      this.current = deserialize(text);
      this.replacedCount++;
      this.emit();
      return null;
    } catch (e) {
      return e instanceof SaveError ? e.message : 'The save could not be read.';
    }
  }

  /** Remembers the game as it is now, at a rest, for death to return to. */
  saveRestPoint(): void {
    try {
      this.storage?.setItem(REST_KEY, serialize(this.current));
    } catch {
      // Storage full or blocked: death falls back to a new game.
    }
  }

  /**
   * Death: back to the last rest (decided by Daniel). With no rest yet, the
   * game starts over. Also overwrites the autosave, so a reload can't skip it.
   */
  returnToLastRest(): void {
    const text = this.storage?.getItem(REST_KEY);
    if (text == null || this.loadFrom(text) !== null) this.newGame();
    this.save();
  }

  exportJson(): string {
    return serialize(this.current);
  }

  deleteSave(): void {
    this.storage?.removeItem(SAVE_KEY);
  }

  private emit(): void {
    for (const l of this.listeners) l(this.current);
  }
}
