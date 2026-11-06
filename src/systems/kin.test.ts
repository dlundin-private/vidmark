import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import * as A from '../state/actions';
import { createNewGame } from '../state/GameState';
import { castKin, hasKin, planKin } from './kin';

const t = DEFAULT_TUNING;
const withKin = () => {
  const s = createNewGame(t.basePower);
  s.domains.push('kin');
  s.power = 5;
  return s;
};
const run = (s: ReturnType<typeof withKin>, plan: ReturnType<typeof planKin>) => {
  if (!plan.ok) throw new Error(plan.reason);
  return castKin(s, plan);
};

describe('Kin', () => {
  it('needs Kin first', () => {
    const s = createNewGame(t.basePower);
    expect(planKin(s, t, 'heal', { kind: 'self' })).toMatchObject({ ok: false });
  });

  it('Heal closes one of her wounds, and only if she has one', () => {
    const s = withKin();
    expect(planKin(s, t, 'heal', { kind: 'self' })).toMatchObject({ ok: false });
    A.addWound(s, t);
    run(s, planKin(s, t, 'heal', { kind: 'self' }));
    expect(s.wounds).toBe(0);
    expect(s.power).toBe(5 - t.kinHealCost);
  });

  it('Heal eases someone hurt or sick, like Arn', () => {
    const s = withKin();
    expect(planKin(s, t, 'heal', { kind: 'person', id: 'edda' })).toMatchObject({ ok: false });
    expect(run(s, planKin(s, t, 'heal', { kind: 'person', id: 'arn' }))).toContain('Arn');
    expect(s.flags.eased_arn).toBe(true);
    expect(planKin(s, t, 'heal', { kind: 'person', id: 'arn' })).toMatchObject({ ok: false });
  });

  it('a strengthened body takes the next wound for her, once, until she rests', () => {
    const s = withKin();
    run(s, planKin(s, t, 'bolster', { kind: 'self' }));
    A.addWound(s, t);
    expect(s.wounds).toBe(0);
    A.addWound(s, t);
    expect(s.wounds).toBe(1);
    run(s, planKin(s, t, 'bolster', { kind: 'self' }));
    A.restAtHome(s, t);
    expect(s.flags[A.FLAG_BOLSTERED]).toBeUndefined();
  });

  it('Calm quiets a person until she rests; nobody is reached in a Hollow', () => {
    const s = withKin();
    run(s, planKin(s, t, 'calm', { kind: 'person', id: 'knut' }));
    expect(s.flags.calmed_knut).toBe(true);
    A.restAtHome(s, t);
    expect(s.flags.calmed_knut).toBeUndefined();
    expect(planKin(s, t, 'calm', { kind: 'person', id: 'halvar' })).toMatchObject({ ok: false });
    expect(planKin(s, t, 'sense', { kind: 'person', id: 'halvar' })).toMatchObject({ ok: true });
  });
});

describe("gaining Kin from a Keystone", () => {
  it("Edda's Offering gives it; so does hollowing her", () => {
    const asked = createNewGame(t.basePower);
    A.recordOffering(asked, 'edda', t);
    expect(hasKin(asked)).toBe(true);
    const taken = createNewGame(t.basePower);
    A.recordHollowing(taken, 'edda', t);
    expect(hasKin(taken)).toBe(true);
  });

  it('nobody else gives a domain', () => {
    const s = createNewGame(t.basePower);
    A.recordOffering(s, 'hermit', t);
    A.recordHollowing(s, 'brita', t);
    expect(s.domains).toEqual(['craft']);
  });
});
