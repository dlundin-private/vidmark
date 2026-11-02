import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING, type Tuning } from '../../content/data/tuning';
import * as A from './actions';
import { createNewGame } from './GameState';

const t: Tuning = { ...DEFAULT_TUNING, basePower: 2, powerPerOffering: 1, hollowingReserve: 5, burnSwim: 4, burnShame: 6, maxWounds: 3 };
const fresh = () => createNewGame(t.basePower);

describe('a new game', () => {
  it('starts with Craft, full base Power, no reserve and no wounds', () => {
    const s = fresh();
    expect(s.domains).toEqual(['craft']);
    expect([s.power, s.reserve, s.wounds]).toEqual([2, 0, 0]);
    expect(A.hearth(s)).toEqual([]);
  });

  it('holds five Keepsakes; "why you left" forms later', () => {
    const s = fresh();
    expect(A.hasKeepsake(s, 'swim')).toBe(true);
    expect(A.hasKeepsake(s, 'name')).toBe(true);
    expect(A.hasKeepsake(s, 'whyYouLeft')).toBe(false);
    A.formKeepsake(s, 'whyYouLeft');
    expect(A.hasKeepsake(s, 'whyYouLeft')).toBe(true);
  });

  it('has the boathouse Hollow already hollowed, without an echo in Signe', () => {
    const s = fresh();
    expect(s.npcs.hollow.hollowed).toBe(true);
    expect(A.echoes(s)).toEqual([]);
  });
});

describe('Power', () => {
  it('spends refillable Power before the reserve', () => {
    const s = fresh();
    A.addReserve(s, 3);
    expect(A.spendPower(s, 3)).toBe(true);
    expect([s.power, s.reserve]).toEqual([0, 2]);
  });

  it('refuses to spend more than is available, changing nothing', () => {
    const s = fresh();
    expect(A.spendPower(s, 3)).toBe(false);
    expect(s.power).toBe(2);
  });

  it('refills Power on rest, but never the reserve', () => {
    const s = fresh();
    A.addReserve(s, 5);
    A.spendPower(s, 7);
    A.rest(s, t);
    expect([s.power, s.reserve]).toEqual([2, 0]);
  });
});

describe('Offering and the Hearth', () => {
  it('adds the giver to the Hearth and raises max Power at once', () => {
    const s = fresh();
    A.recordOffering(s, 'ebbe', t);
    expect(A.hearth(s)).toEqual(['ebbe']);
    expect(A.maxPower(s, t)).toBe(3);
    expect(s.power).toBe(3);
  });

  it('loses that Power when the giver loses faith', () => {
    const s = fresh();
    A.recordOffering(s, 'ebbe', t);
    A.setFaithLost(s, 'ebbe', true, t);
    expect(A.hearth(s)).toEqual([]);
    expect(s.power).toBe(2);
  });

  it('ignores Offerings from a Hollow', () => {
    const s = fresh();
    A.recordOffering(s, 'hollow', t);
    expect(A.hearth(s)).toEqual([]);
  });
});

describe('hollowing', () => {
  it('gives a one-time reserve and an echo', () => {
    const s = fresh();
    A.recordHollowing(s, 'hermit', t);
    expect(s.reserve).toBe(5);
    expect(A.echoes(s)).toEqual(['hermit']);
  });

  it('removes a Hearth member and their share of max Power', () => {
    const s = fresh();
    A.recordOffering(s, 'ebbe', t);
    A.recordHollowing(s, 'ebbe', t);
    expect(A.hearth(s)).toEqual([]);
    expect(s.power).toBe(2);
    expect(s.reserve).toBe(5);
  });

  it('pays only once per person', () => {
    const s = fresh();
    A.recordHollowing(s, 'hermit', t);
    A.recordHollowing(s, 'hermit', t);
    expect(s.reserve).toBe(5);
  });
});

describe('burning Keepsakes', () => {
  it('gives its tuned reserve once, then it is gone', () => {
    const s = fresh();
    expect(A.burnKeepsake(s, 'swim', t)).toBe(4);
    expect(A.hasKeepsake(s, 'swim')).toBe(false);
    expect(A.burnKeepsake(s, 'swim', t)).toBe(0);
    expect(s.reserve).toBe(4);
  });

  it('pays more for painful Keepsakes', () => {
    const s = fresh();
    expect(A.burnKeepsake(s, 'shame', t)).toBeGreaterThan(A.burnKeepsake(s, 'coat', t));
  });

  it('cannot burn a Keepsake that has not formed yet', () => {
    expect(A.burnKeepsake(fresh(), 'whyYouLeft', t)).toBe(0);
  });
});

describe('wounds', () => {
  it('falls at max wounds and never goes past it', () => {
    const s = fresh();
    for (let i = 0; i < 5; i++) A.addWound(s, t);
    expect(s.wounds).toBe(3);
    expect(A.hasFallen(s, t)).toBe(true);
    A.healWound(s);
    expect(A.hasFallen(s, t)).toBe(false);
  });
});
