import storyJson from '../content/ink/main.ink';
import { DialogueBox } from './scenes/DialogueBox';
import { GameStore, browserStorage } from './state';
import { DialogueRunner } from './systems/dialogue';
import { LiveTuning } from './systems/tuning';

// The one GameStore and the live tuning, shared by every scene and the debug panel.
const storage = browserStorage();

export const tuning = new LiveTuning(storage);
export const store = new GameStore(storage, () => tuning.values);
export const dialogue = new DialogueRunner(storyJson, store);
export const dialogueBox = new DialogueBox(dialogue);

// Continue where the player left off. A broken save is kept in storage
// (not overwritten) until the player saves again, and reported in the panel.
export const loadError: string | null = store.load();
