import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import * as A from '../state/actions';
import { createNewGame } from '../state/GameState';
import { startChapterTwo } from './chapters';
import { damOutcome, restInJarnfors, restsLeft } from './dam';
import { afterKnut, letThievesGo, thievesDue, thievesStopped } from './thieves';

const t = DEFAULT_TUNING;
const ringing = () => {
  const s = createNewGame(t.basePower);
  startChapterTwo(s);
  s.domains.push('kin');
  restInJarnfors(s, t);
  return s;
};

describe('the cramp-thieves', () => {
  it('come while the bell rings, unless something keeps them off', () => {
    const s = createNewGame(t.basePower);
    startChapterTwo(s);
    expect(thievesDue(s)).toBe(false);
    const r = ringing();
    expect(thievesDue(r)).toBe(true);
    for (const flag of ['cramps_strengthened', 'masons_posted', 'knut_persuaded']) {
      const k = ringing();
      A.setFlag(k, flag, true);
      expect(thievesDue(k)).toBe(false);
    }
  });

  it('stopping them slows the crack; letting them go costs a night and Knut leaves', () => {
    const s = ringing();
    thievesStopped(s);
    expect(restsLeft(s)).toBe(t.damRests + 1);
    expect(thievesDue(s)).toBe(false);
    const l = ringing();
    expect(letThievesGo(l)).toBe('ok');
    expect(restsLeft(l)).toBe(t.damRests - 1);
    expect(l.npcs.knut.gone).toBe(true);
  });

  it('letting them go on the last night breaks the dam', () => {
    const s = ringing();
    A.setFlag(s, 'dam_rests_left', 1);
    expect(letThievesGo(s)).toBe('broke');
    expect(damOutcome(s)).toBe('broken');
  });

  it('after the fight: an Offering from Knut, or his whole life, which the masons see', () => {
    const s = ringing();
    afterKnut(s, t, 'offer');
    expect(A.hearth(s)).toContain('knut');
    const h = ringing();
    afterKnut(h, t, 'hollow');
    expect(h.npcs.knut.hollowed).toBe(true);
    expect(h.flags.village_knows).toBe(true);
  });
});
