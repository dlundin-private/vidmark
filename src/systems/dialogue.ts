import { Story } from 'inkjs';
import { KEEPSAKES, type KeepsakeId } from '../../content/data/keepsakes';
import { NPCS, type NpcId } from '../../content/data/npcs';
import * as A from '../state/actions';
import type { GameStore } from '../state/store';

/** One step of a conversation, for the dialogue box to show. */
export type DialogueStep =
  | { kind: 'line'; speaker: string | null; text: string }
  | { kind: 'choices'; options: string[] }
  | { kind: 'end' };

const SIGNE = 'Signe';

/**
 * Runs Ink conversations against the GameStore. Ink reads and changes the game
 * only through the external functions bound here (declared in
 * content/ink/externals.ink); a fresh Story per conversation means dialogue
 * keeps no state of its own between conversations.
 */
export class DialogueRunner {
  private story: Story | null = null;

  constructor(
    private readonly storyJson: string,
    private readonly store: GameStore,
  ) {}

  /** Starts the conversation for a person (their knot in content/ink). */
  start(who: NpcId): void {
    const story = new Story(this.storyJson);
    story.onError = (message) => {
      throw new Error(`Ink error in "${who}": ${message}`);
    };
    this.bind(story);
    story.ChoosePathString(who);
    this.story = story;
  }

  get active(): boolean {
    return this.story !== null;
  }

  /** The next thing to show: a line, a set of choices, or the end. */
  next(): DialogueStep {
    const story = this.story;
    if (!story) return { kind: 'end' };
    while (story.canContinue) {
      const raw = story.Continue()?.trim() ?? '';
      if (raw) return this.toLine(raw);
    }
    if (story.currentChoices.length > 0) {
      return { kind: 'choices', options: story.currentChoices.map((c) => c.text) };
    }
    this.story = null;
    return { kind: 'end' };
  }

  choose(index: number): void {
    this.story?.ChooseChoiceIndex(index);
  }

  stop(): void {
    this.story = null;
  }

  /** "Ebbe: Hello." -> speaker Ebbe. Signe's label disappears once her name is burned. */
  private toLine(raw: string): DialogueStep {
    const match = /^([^:]{1,24}): (.+)$/.exec(raw);
    if (match && SPEAKERS.has(match[1]!)) {
      const speaker = match[1]!;
      const hideName = speaker === SIGNE && !A.hasKeepsake(this.store.state, 'name');
      return { kind: 'line', speaker: hideName ? null : speaker, text: match[2]! };
    }
    return { kind: 'line', speaker: null, text: raw };
  }

  private bind(story: Story): void {
    const s = () => this.store.state;
    const keepsake = (id: unknown) => checkId(id, KEEPSAKE_IDS, 'Keepsake') as KeepsakeId;
    const npc = (id: unknown) => checkId(id, NPC_IDS, 'person') as NpcId;

    // Reads are safe for Ink's lookahead.
    story.BindExternalFunction('has_keepsake', (id: unknown) => A.hasKeepsake(s(), keepsake(id)), true);
    story.BindExternalFunction('is_hollowed', (id: unknown) => s().npcs[npc(id)].hollowed, true);
    story.BindExternalFunction('has_offered', (id: unknown) => s().npcs[npc(id)].offered, true);
    story.BindExternalFunction('in_hearth', (id: unknown) => A.hearth(s()).includes(npc(id)), true);
    story.BindExternalFunction('name_known', () => A.hasKeepsake(s(), 'name'), true);
    story.BindExternalFunction('flag', (name: unknown) => A.getFlag(s(), String(name)) ?? false, true);
    story.BindExternalFunction('promise_made', (id: unknown) => s().promises.some((p) => p.id === id), true);
    story.BindExternalFunction('power', () => A.availablePower(s()), true);

    // Changes must only happen when the line is really reached, not during lookahead.
    story.BindExternalFunction('set_flag', (name: unknown, value: unknown) => {
      this.store.update((st) => A.setFlag(st, String(name), toFlag(value)));
    }, false);
    story.BindExternalFunction('make_promise', (id: unknown, who: unknown) => {
      this.store.update((st) => A.makePromise(st, String(id), npc(who)));
    }, false);
    story.BindExternalFunction('offer', (who: unknown) => {
      this.store.update((st, t) => A.recordOffering(st, npc(who), t));
    }, false);
  }
}

const SPEAKERS = new Set([SIGNE, ...NPCS.map((n) => n.name)]);
const KEEPSAKE_IDS = new Set<string>(KEEPSAKES.map((k) => k.id));
const NPC_IDS = new Set<string>(NPCS.map((n) => n.id));

/** Typos in Ink ids fail loudly instead of quietly reading as false. */
function checkId(id: unknown, valid: Set<string>, what: string): string {
  if (typeof id !== 'string' || !valid.has(id)) throw new Error(`Ink used an unknown ${what} id: ${String(id)}`);
  return id;
}

function toFlag(value: unknown): boolean | number | string {
  return typeof value === 'number' || typeof value === 'string' ? value : Boolean(value);
}
