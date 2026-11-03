import { describe, expect, it } from 'vitest';
import storyJson from '../../content/ink/main.ink';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import { NPCS } from '../../content/data/npcs';
import * as A from '../state/actions';
import { GameStore } from '../state/store';
import { DialogueRunner, type DialogueStep } from './dialogue';

function setup() {
  const store = new GameStore(null, () => DEFAULT_TUNING);
  return { store, runner: new DialogueRunner(storyJson, store) };
}

/** Plays a conversation, picking choices whose text includes the given words, in order. Returns every step. */
function play(runner: DialogueRunner, who: Parameters<DialogueRunner['start']>[0], picks: string[] = []): DialogueStep[] {
  runner.start(who);
  const steps: DialogueStep[] = [];
  const queue = [...picks];
  for (let guard = 0; guard < 200; guard++) {
    const step = runner.next();
    steps.push(step);
    if (step.kind === 'end') return steps;
    if (step.kind === 'choices') {
      const want = queue.shift() ?? 'Leave';
      const index = step.options.findIndex((o) => o.includes(want));
      if (index < 0) throw new Error(`No choice "${want}" in: ${step.options.join(' | ')}`);
      runner.choose(index);
    }
  }
  throw new Error('Conversation did not end');
}

const text = (steps: DialogueStep[]) => steps.filter((s) => s.kind === 'line').map((s) => s.text).join('\n');
const speakers = (steps: DialogueStep[]) => steps.filter((s) => s.kind === 'line').map((s) => s.speaker);

describe('dialogue', () => {
  it('has a conversation for every person, and each one can be left', () => {
    const { runner } = setup();
    for (const n of NPCS) expect(play(runner, n.id).at(-1)).toEqual({ kind: 'end' });
  });

  it('splits speaker names from narration', () => {
    const { runner } = setup();
    const steps = play(runner, 'ebbe');
    expect(speakers(steps)).toContain('Ebbe');
    expect(speakers(steps)).toContain(null);
  });

  it('remembers meetings in GameState, not in Ink', () => {
    const { store, runner } = setup();
    play(runner, 'ebbe');
    expect(store.state.flags.met_ebbe).toBe(true);
    expect(text(play(runner, 'ebbe'))).toContain('Back again.');
  });

  it('records an Offering through dialogue, and Ebbe then lacks the memory', () => {
    const { store, runner } = setup();
    play(runner, 'ebbe', ['another way', 'Accept']);
    expect(A.hearth(store.state)).toEqual(['ebbe']);
    // Next time he first teaches Weaves (his quest is done), then he is just missing her.
    expect(text(play(runner, 'ebbe'))).toContain('a net is made before the fish comes');
    expect(store.state.flags.weaves_taught).toBe(true);
    expect(text(play(runner, 'ebbe'))).toContain('someone used to sit with me');
  });

  it('Ebbe notices when Signe mends his nets, one rack and then both', () => {
    const { store, runner } = setup();
    play(runner, 'ebbe');
    store.update((s) => {
      A.setFlag(s, 'nets_total', 2);
      A.setFlag(s, 'nets_mended', 1);
    });
    expect(text(play(runner, 'ebbe', ['Tell him']))).toContain("The other's still in rags");
    expect(text(play(runner, 'ebbe'))).toContain('One of them');
    store.update((s) => A.setFlag(s, 'nets_mended', 2));
    const all = play(runner, 'ebbe', ['Tell him']);
    expect(text(all)).toContain('Every net on the racks, whole');
    expect(text(all)).toContain('the village eats this winter');
    // Once the nets are whole, he no longer asks for help or offers his memory.
    const later = play(runner, 'ebbe');
    expect(text(later)).toContain('The nets are holding');
    const options = later.find((s) => s.kind === 'choices');
    expect(options && options.kind === 'choices' && options.options.join()).not.toMatch(/mend the nets|another way/);
  });

  it('Ebbe teaches Weaves right after hearing Signe mended all his nets', () => {
    const { store, runner } = setup();
    store.update((s) => {
      A.setFlag(s, 'nets_total', 2);
      A.setFlag(s, 'nets_mended', 2);
    });
    expect(text(play(runner, 'ebbe', ['Tell him']))).toContain('You can now craft Weaves');
    expect(store.state.flags.weaves_taught).toBe(true);
  });

  it('the hermit gives the safe route only once Signe has helped the village', () => {
    const { store, runner } = setup();
    play(runner, 'hermit', ['ice road']);
    expect(store.state.flags.heard_ice_road).toBe(true);
    expect(text(play(runner, 'hermit', ['safe way']))).toContain("I don't give what's mine to strangers");
    store.update((s) => A.setFlag(s, 'quest_nets', 'mended'));
    play(runner, 'hermit', ['safe way', 'Take his memory']);
    expect(store.state.flags.knows_safe_route).toBe(true);
    expect(A.hearth(store.state)).toContain('hermit');
    expect(text(play(runner, 'hermit'))).toContain("Can't think what I told them");
  });

  it('people hurt by trap ice say so', () => {
    const { store, runner } = setup();
    store.update((s, t) => A.hurtByTrap(s, 'lilja', t));
    expect(text(play(runner, 'lilja'))).toContain('The ice just opened');
  });

  it('someone in the Hearth who is hurt by a trap loses faith', () => {
    const { store } = setup();
    store.update((s, t) => A.recordOffering(s, 'ebbe', t));
    store.update((s, t) => A.hurtByTrap(s, 'ebbe', t));
    expect(A.hearth(store.state)).toEqual([]);
  });

  it('does not change state when a choice is only offered, not taken', () => {
    const { store, runner } = setup();
    play(runner, 'ebbe', ['another way', 'Refuse']);
    expect(A.hearth(store.state)).toEqual([]);
  });

  describe('reads Keepsakes', () => {
    it('Signe knows Lilja while she has the swim', () => {
      const { runner } = setup();
      const t = text(play(runner, 'lilja'));
      expect(t).toContain('I slid all the way');
      expect(t).not.toContain('Are you lost?');
    });

    it('greets Lilja as a stranger once the swim is burned', () => {
      const { store, runner } = setup();
      store.update((s, t) => A.burnKeepsake(s, 'swim', t));
      expect(text(play(runner, 'lilja'))).toContain('Are you lost?');
    });

    it("no longer knows her father's story once it is burned", () => {
      const before = setup();
      expect(text(play(before.runner, 'torvald', ['old story']))).toContain('You know every word');
      const after = setup();
      after.store.update((s, t) => A.burnKeepsake(s, 'story', t));
      expect(text(play(after.runner, 'torvald', ['old story']))).toContain("You've never heard it before");
    });

    it('asks each question only once; what she learned stays in her memory of the person', () => {
      const { store, runner } = setup();
      play(runner, 'olle', ['Tithe']);
      expect(store.state.impressions.olle).toEqual(['met', 'tithe']);
      const again = play(runner, 'olle');
      const options = again.find((s) => s.kind === 'choices');
      expect(options && options.kind === 'choices' && options.options.join()).not.toContain('Ask about the Tithe');
    });

    it('stops using her name once it is burned, including her speaker label', () => {
      const { store, runner } = setup();
      expect(text(play(runner, 'lilja'))).toContain('Signe!');
      store.update((s, t) => A.burnKeepsake(s, 'name', t));
      const steps = play(runner, 'lilja', ['careful']);
      expect(text(steps)).not.toContain('Signe');
      expect(speakers(steps)).not.toContain('Signe');
    });
  });

  it('reads hollowed people', () => {
    const { store, runner } = setup();
    store.update((s, t) => A.recordHollowing(s, 'hermit', t));
    expect(text(play(runner, 'hermit'))).toContain('There is nobody behind the eyes');
  });

  it('records promises and lets others react to them', () => {
    const { store, runner } = setup();
    expect(() => play(runner, 'torvald', ['promise to Lilja'])).toThrow(/No choice/);
    play(runner, 'lilja', ['Promise']);
    expect(store.state.promises).toEqual([{ id: 'lilja_ice', to: 'lilja', kept: null }]);
    expect(text(play(runner, 'torvald', ['promise to Lilja']))).toContain('keep it');
  });
});
