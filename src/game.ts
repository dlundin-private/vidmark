import { GameStore, browserStorage } from './state';
import { LiveTuning } from './systems/tuning';

// The one GameStore and the live tuning, shared by every scene and the debug panel.
const storage = browserStorage();

export const tuning = new LiveTuning(storage);
export const store = new GameStore(storage, () => tuning.values);

// Continue where the player left off. A broken save is kept in storage
// (not overwritten) until the player saves again, and reported in the panel.
export const loadError: string | null = store.load();
