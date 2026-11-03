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

  it("plays Maren's Winter at the statue, and notices it differs from Father's story", () => {
    const { store, runner } = setup();
    play(runner, 'gerda', ["Maren's Winter", 'Take the part']);
    expect(store.state.flags.maren_winter_part).toBe(true);
    play(runner, 'torvald', ['old story']);
    expect(store.state.flags.heard_fathers_story).toBe(true);
    const t = text(play(runner, 'place_statue'));
    expect(t).toContain('she gave up nothing');
    expect(t).toContain('nobody gives up anything at all');
    expect(store.state.flags.noticed_play_differs).toBe(true);
  });

  it('asking Gerda about the man in the boathouse counts for his quest', () => {
    const { store, runner } = setup();
    store.update((s) => A.setFlag(s, 'met_hollow', true));
    expect(text(play(runner, 'gerda', ['man in the boathouse']))).toContain("We don't say his name");
    expect(store.state.flags.asked_about_hollow).toBe(true);
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

  describe('hollowing (step 5)', () => {
    const villagers = NPCS.filter((n) => !n.startsHollow);

    it('lets Signe take everything from anyone, family included, and asks twice', () => {
      for (const n of villagers) {
        const { store, runner } = setup();
        play(runner, n.id, ['Take everything', 'Let it be']);
        expect(store.state.npcs[n.id].hollowed).toBe(false);
        play(runner, n.id, ['Take everything', 'Take everything']);
        expect(store.state.npcs[n.id].hollowed).toBe(true);
        expect(store.state.reserve).toBe(DEFAULT_TUNING.hollowingReserve);
        expect(A.echoes(store.state)).toEqual([n.id]);
      }
    });

    it('hollowing the hermit gives Signe his safe route', () => {
      const { store, runner } = setup();
      play(runner, 'hermit', ['Take everything', 'Take everything']);
      expect(store.state.flags.knows_safe_route).toBe(true);
    });

    it('the village notices', () => {
      const { runner } = setup();
      play(runner, 'lilja', ['Take everything', 'Take everything']);
      expect(text(play(runner, 'torvald'))).toContain("Lilja doesn't know me");
      expect(text(play(runner, 'olle'))).toContain('taking without a ledger');
    });

    it('once she has hollowed anyone, "Take everything" comes first in every conversation', () => {
      const { store, runner } = setup();
      const firstChoice = (who: string) => {
        runner.start(who);
        for (let step = runner.next(); step.kind !== 'end'; step = runner.next()) if (step.kind === 'choices') return step.options;
        return [];
      };
      expect(firstChoice('gerda')[0]).not.toContain('Take everything');
      store.update((s, t) => A.hollowWolf(s, t));
      for (const n of villagers) {
        const options = firstChoice(n.id);
        expect(options[0]).toContain('Take everything');
        expect(options.filter((o) => o.includes('Take everything'))).toHaveLength(1);
      }
      // Still asked twice.
      play(runner, 'gerda', ['Take everything', 'Let it be']);
      expect(store.state.npcs.gerda.hollowed).toBe(false);
    });

    it('a hungry Echo has something to say about everyone', () => {
      const { runner } = setup();
      for (const n of villagers) expect(runner.linesOf(`hunger_${n.id}`).length).toBe(1);
    });

    it('every Echo has something to say', () => {
      const { runner } = setup();
      for (const n of villagers) expect(runner.linesOf(`echo_${n.id}`).length).toBe(1);
    });

    it('a girl Signe no longer knows can still be hollowed', () => {
      const { store, runner } = setup();
      store.update((st, t) => A.burnKeepsake(st, 'swim', t));
      play(runner, 'lilja', ['Take everything', 'Take everything']);
      expect(store.state.npcs.lilja.hollowed).toBe(true);
    });
  });

  describe('Offerings are hard to give (step 5)', () => {
    it('the hermit trusts her after any help he would hear of, but not once she has emptied someone', () => {
      const { store, runner } = setup();
      play(runner, 'hermit', ['ice road']);
      store.update((s) => A.setFlag(s, 'shelter_mended', true));
      expect(text(play(runner, 'hermit', ['safe way', 'Not yet']))).toContain('put a door back on that shelter');
      const other = setup();
      play(other.runner, 'hermit', ['ice road']);
      other.store.update((s, t) => {
        A.setFlag(s, 'shelter_mended', true);
        A.recordHollowing(s, 'olle', t);
      });
      expect(text(play(other.runner, 'hermit', ['safe way']))).toContain("I don't give what's mine to strangers");
    });

    it("Gerda gives her grandmother's Maren after the play, and then cannot tell it", () => {
      const { store, runner } = setup();
      expect(() => play(runner, 'gerda', ["when she's gone"])).toThrow(/No choice/);
      store.update((s) => A.setFlag(s, 'quest_marens-winter', 'played'));
      play(runner, 'gerda', ["when she's gone", 'Take her memory']);
      expect(A.hearth(store.state)).toContain('gerda');
      const after = play(runner, 'gerda');
      expect(text(after)).toContain('A statue on the shore');
      expect(() => play(runner, 'gerda', ['statue on the shore'])).toThrow(/No choice/);
    });

    it('Lilja gives the swim once Signe knows the Tithe takes people', () => {
      const { store, runner } = setup();
      store.update((s) => A.setFlag(s, 'knows_tithe_takes_people', true));
      play(runner, 'lilja', ['stay close to home', 'Take her memory']);
      expect(A.hearth(store.state)).toContain('lilja');
      expect(A.remembers(store.state, 'lilja', 'gave_swim')).toBe(true);
    });

    it('Torvald and Olle never offer', () => {
      const { store, runner } = setup();
      for (const flag of ['quest_nets', 'shelter_mended', 'knows_tithe_takes_people', 'ice_road_open']) store.update((s) => A.setFlag(s, flag, true));
      for (const who of ['torvald', 'olle'] as const) {
        runner.start(who);
        for (let step = runner.next(); step.kind !== 'end'; step = runner.next()) {
          if (step.kind === 'choices') {
            expect(step.options.join('|')).not.toMatch(/memory/i);
            runner.choose(step.options.findIndex((o) => o.includes('Leave')));
          }
        }
        expect(A.hearth(store.state)).not.toContain(who);
      }
    });
  });

  it('Signe can keep her promise to Lilja once the ice road is open', () => {
    const { store, runner } = setup();
    play(runner, 'lilja', ['Promise']);
    expect(() => play(runner, 'lilja', ['across the ice road'])).toThrow(/No choice/);
    store.update((s) => A.setFlag(s, 'ice_road_open', true));
    expect(text(play(runner, 'lilja', ['across the ice road']))).toContain('You kept it');
    expect(store.state.promises[0]!.kept).toBe(true);
    expect(() => play(runner, 'lilja', ['across the ice road'])).toThrow(/No choice/);
  });
});
