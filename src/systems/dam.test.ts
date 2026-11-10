import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import * as A from '../state/actions';
import { createNewGame } from '../state/GameState';
import { startChapterTwo } from './chapters';
import { bellRinging, damOutcome, knitCost, restInJarnfors, restsLeft, saveDam } from './dam';
import { showing } from './world';

const t = DEFAULT_TUNING;
const inJarnfors = () => {
  const s = createNewGame(t.basePower);
  startChapterTwo(s);
  return s;
};
const ring = (s: ReturnType<typeof inJarnfors>) => {
  s.domains.push('kin');
  expect(restInJarnfors(s, t)).toBe('rang');
};

describe('the dam crisis', () => {
  it('rings once Signe has Kin, two side quests done, or on her third rest there', () => {
    const s = inJarnfors();
    expect(restInJarnfors(s, t)).toBeNull();
    expect(restInJarnfors(s, t)).toBeNull();
    expect(restInJarnfors(s, t)).toBe('rang');
    expect(restsLeft(s)).toBe(t.damRests);
    const k = inJarnfors();
    ring(k);
  });

  it('breaks after three rests if nothing is done', () => {
    const s = inJarnfors();
    ring(s);
    expect(restInJarnfors(s, t)).toBe('ticked');
    expect(restInJarnfors(s, t)).toBe('ticked');
    expect(restInJarnfors(s, t)).toBe('broke');
    expect(damOutcome(s)).toBe('broken');
    expect(bellRinging(s)).toBe(false);
    expect(restInJarnfors(s, t)).toBeNull();
  });

  it('knitting needs Kin, an anchor and Power; Järnfors givers lend theirs', () => {
    const s = inJarnfors();
    ring(s);
    expect(knitCost(s, t)).toBe(t.damKnitCost);
    A.recordOffering(s, 'brita', t);
    A.recordOffering(s, 'gudmund', t);
    expect(knitCost(s, t)).toBe(t.damKnitCost - 2);
    s.power = 0;
    s.reserve = 0;
    expect(saveDam(s, t, 'knit', { kind: 'keepsake', id: 'coat' })).toMatchObject({ ok: false });
    s.reserve = 10;
    expect(saveDam(s, t, 'knit', { kind: 'keepsake', id: 'coat' })).toMatchObject({ ok: true });
    expect(s.keepsakes.coat.status).toBe('consumed');
    expect(damOutcome(s)).toBe('knit');
    expect(A.heldWeaves(s)).toEqual([]);
  });

  it('an Echo anchored in the dam leaves her', () => {
    const s = inJarnfors();
    A.recordHollowing(s, 'knut', t);
    ring(s);
    s.reserve += 10;
    expect(A.echoes(s)).toEqual(['knut']);
    saveDam(s, t, 'knit', { kind: 'echo', npc: 'knut' });
    expect(A.echoes(s)).toEqual([]);
  });

  it("holding it with Gudmund's keeping needs the keeping; raw Craft needs more Power than she has", () => {
    const s = inJarnfors();
    ring(s);
    expect(saveDam(s, t, 'taken')).toMatchObject({ ok: false });
    s.power = 2;
    expect(saveDam(s, t, 'held')).toMatchObject({ ok: false });
    A.burnKeepsake(s, 'shame', t);
    expect(saveDam(s, t, 'held')).toMatchObject({ ok: true });
  });

  it('the relief cut opens only once the plug, the walls and the carts are done', () => {
    const s = inJarnfors();
    ring(s);
    expect(saveDam(s, t, 'relief')).toMatchObject({ ok: false });
    for (const f of ['plug_weakened', 'cut_walls_strengthened', 'cut_carts_cleared']) A.setFlag(s, f, true);
    expect(saveDam(s, t, 'relief')).toMatchObject({ ok: true });
  });

  it('a negated show condition hides something once the flag is set', () => {
    expect(showing('!dam_broken', {})).toBe(true);
    expect(showing('!dam_broken', { dam_broken: true })).toBe(false);
  });
});
