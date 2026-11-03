import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import * as A from '../state/actions';
import { createNewGame } from '../state/GameState';
import { questStatuses, updateQuests } from './quests';

const t = DEFAULT_TUNING;
const status = (s: ReturnType<typeof createNewGame>, id: string) => questStatuses(s).find((q) => q.def.id === id)!;

describe("The net-mender's hands", () => {
  it('starts when Signe meets Ebbe, and shows net progress', () => {
    const s = createNewGame(2);
    expect(updateQuests(s)).toEqual([]);
    A.setFlag(s, 'met_ebbe', true);
    A.setFlag(s, 'nets_total', 2);
    const events = updateQuests(s);
    expect(events.map((e) => e.kind)).toEqual(['started']);
    A.setFlag(s, 'nets_mended', 1);
    updateQuests(s);
    expect(status(s, 'nets').steps[0]!.text).toContain('1 of 2');
    expect(status(s, 'nets').outcome).toBeNull();
  });

  it('ends when both nets are mended, and stays ended', () => {
    const s = createNewGame(2);
    A.setFlag(s, 'met_ebbe', true);
    A.setFlag(s, 'nets_total', 2);
    A.setFlag(s, 'nets_mended', 2);
    const events = updateQuests(s);
    expect(events.map((e) => e.kind)).toEqual(['started', 'completed']);
    expect(status(s, 'nets').outcome?.id).toBe('mended');
    A.setFlag(s, 'nets_mended', 1);
    expect(updateQuests(s)).toEqual([]);
    expect(status(s, 'nets').outcome?.id).toBe('mended');
  });

  it('ends differently if Ebbe gives his memory instead', () => {
    const s = createNewGame(2);
    A.setFlag(s, 'met_ebbe', true);
    A.recordOffering(s, 'ebbe', t);
    updateQuests(s);
    expect(status(s, 'nets').outcome?.id).toBe('offering');
  });
});

describe('The Hollow in the boathouse', () => {
  it('needs asking, the ledger and the cairn, in any order', () => {
    const s = createNewGame(2);
    A.setFlag(s, 'met_hollow', true);
    A.setFlag(s, 'read_cairn', true);
    A.setFlag(s, 'read_ledger', true);
    updateQuests(s);
    expect(status(s, 'hollow').outcome).toBeNull();
    A.setFlag(s, 'asked_about_hollow', true);
    updateQuests(s);
    expect(status(s, 'hollow').outcome?.id).toBe('learned');
    expect(s.flags.knows_tithe_takes_people).toBe(true);
  });
});

describe("Maren's Winter", () => {
  it('notices the play differs only if she still has the story', () => {
    const kept = createNewGame(2);
    for (const f of ['maren_winter_part', 'played_maren', 'noticed_play_differs']) A.setFlag(kept, f, true);
    updateQuests(kept);
    expect(status(kept, 'marens-winter').outcome?.id).toBe('noticed');

    const burned = createNewGame(2);
    for (const f of ['maren_winter_part', 'played_maren']) A.setFlag(burned, f, true);
    updateQuests(burned);
    expect(status(burned, 'marens-winter').outcome?.id).toBe('played');
  });
});

describe('The ice road', () => {
  it('starts on hearing about it, or on going through the cracked ice', () => {
    const s = createNewGame(2);
    A.setFlag(s, 'fell_through_cracked_ice', true);
    expect(updateQuests(s).map((e) => e.quest.id)).toEqual(['ice-road']);
  });

  it("ends by the hermit's route or by strengthening, and opens the road", () => {
    const viaRoute = createNewGame(2);
    for (const f of ['heard_ice_road', 'knows_safe_route', 'crossed_cracked_ice']) A.setFlag(viaRoute, f, true);
    updateQuests(viaRoute);
    expect(status(viaRoute, 'ice-road').outcome?.id).toBe('route');
    expect(viaRoute.flags.ice_road_open).toBe(true);

    const viaCraft = createNewGame(2);
    for (const f of ['heard_ice_road', 'strengthened_cracked_ice', 'crossed_cracked_ice']) A.setFlag(viaCraft, f, true);
    updateQuests(viaCraft);
    expect(status(viaCraft, 'ice-road').outcome?.id).toBe('strengthened');
  });

  it('ticks off finding a way before the crossing', () => {
    const s = createNewGame(2);
    A.setFlag(s, 'heard_ice_road', true);
    A.setFlag(s, 'strengthened_cracked_ice', true);
    updateQuests(s);
    expect(status(s, 'ice-road').steps.map((x) => x.done)).toEqual([true, false]);
    expect(status(s, 'ice-road').outcome).toBeNull();
  });
});

describe('quests that end with someone hollowed', () => {
  it('the ice road, crossed by the way taken from the hermit', () => {
    const s = createNewGame(2);
    A.setFlag(s, 'heard_ice_road', true);
    A.recordHollowing(s, 'hermit', t);
    A.setFlag(s, 'knows_safe_route', true);
    A.setFlag(s, 'crossed_cracked_ice', true);
    updateQuests(s);
    expect(status(s, 'ice-road').outcome?.id).toBe('hollowed');
    expect(s.flags.ice_road_open).toBe(true);
  });

  it("Maren's Winter, when Gerda is hollowed before the play", () => {
    const s = createNewGame(2);
    A.setFlag(s, 'maren_winter_part', true);
    updateQuests(s);
    A.recordHollowing(s, 'gerda', t);
    updateQuests(s);
    expect(status(s, 'marens-winter').outcome?.id).toBe('hollowed');
  });
});
