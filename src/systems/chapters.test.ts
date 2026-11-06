import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import * as A from '../state/actions';
import { createNewGame } from '../state/GameState';
import { deserialize, serialize } from '../state/save';
import { chapterOneCanEnd, endChapterOne, startChapterTwo, summariseChapterOne } from './chapters';
import { updateQuests } from './quests';

const t = DEFAULT_TUNING;

describe('the end of chapter 1', () => {
  it('can only come once the ice road is open', () => {
    const s = createNewGame(t.basePower);
    expect(chapterOneCanEnd(s)).toBe(false);
    A.setFlag(s, 'ice_road_open', true);
    expect(chapterOneCanEnd(s)).toBe(true);
  });

  it('keeps what chapter 1 decided, takes Lilja, and forms "Why you left"', () => {
    const s = createNewGame(t.basePower);
    A.recordOffering(s, 'ebbe', t);
    A.recordHollowing(s, 'gerda', t);
    A.burnKeepsake(s, 'coat', t);
    A.makePromise(s, 'lilja_ice', 'lilja');
    A.setFlag(s, 'quest_nets', 'offering');
    A.setFlag(s, 'ice_road_open', true);
    const r = endChapterOne(s);
    expect(r).toMatchObject({ gave: ['ebbe'], hollowed: ['gerda'], burned: ['coat'], quests: { nets: 'offering' }, liljaTakenBy: 'olle', lilja: 'sister' });
    // The promise was never kept: someone else took her across.
    expect(r.promises).toEqual([{ id: 'lilja_ice', to: 'lilja', kept: false }]);
    expect(s.npcs.lilja.gone).toBe(true);
    expect(A.hasKeepsake(s, 'whyYouLeft')).toBe(true);
    expect(s.chapter).toBe(2);
    expect(s.chapters).toHaveLength(1);
  });

  it('Kronvall sends its own men when Signe emptied the Reeve', () => {
    const s = createNewGame(t.basePower);
    A.recordHollowing(s, 'olle', t);
    expect(summariseChapterOne(s).liljaTakenBy).toBe('kronvall');
  });

  it('knows how Signe knew Lilja: sister, stranger, or Hollow', () => {
    const s = createNewGame(t.basePower);
    A.burnKeepsake(s, 'swim', t);
    expect(summariseChapterOne(s).lilja).toBe('stranger');
    A.recordHollowing(s, 'lilja', t);
    expect(summariseChapterOne(s).lilja).toBe('hollow');
  });

  it("freezes chapter 1's quests once chapter 2 begins", () => {
    const s = createNewGame(t.basePower);
    A.setFlag(s, 'ice_road_open', true);
    endChapterOne(s);
    A.setFlag(s, 'met_ebbe', true);
    expect(updateQuests(s)).toEqual([]);
  });

  it('survives saving, and older saves start in chapter 1, past the intro', () => {
    const s = createNewGame(t.basePower);
    A.setFlag(s, 'ice_road_open', true);
    endChapterOne(s);
    expect(deserialize(serialize(s))).toEqual(s);
    const old = JSON.parse(serialize(createNewGame(t.basePower)));
    old.version = 4;
    delete old.state.chapter;
    delete old.state.chapters;
    const migrated = deserialize(JSON.stringify(old));
    expect(migrated.chapter).toBe(1);
    expect(migrated.flags.intro_seen).toBe(true);
  });
});

describe('more than one map', () => {
  it('puts a map aside when Signe travels, and brings it back as she left it', () => {
    const s = createNewGame(t.basePower);
    A.setTileEffect(s, 3, 4, { kind: 'strengthened', armed: false, restsLeft: 1 });
    A.setPosition(s, { x: 10, y: 12 });
    A.travel(s, 'jarnfors');
    expect(s.map).toBe('jarnfors');
    expect(s.world.tiles).toEqual({});
    expect(s.position).toBeNull();
    A.setPosition(s, { x: 45, y: 124 });
    A.travel(s, 'kallsjo');
    expect(s.world.tiles['3,4']?.effect?.kind).toBe('strengthened');
    expect(s.position).toEqual({ x: 10, y: 12 });
    expect(s.elsewhere.jarnfors?.position).toEqual({ x: 45, y: 124 });
  });

  it('starts chapter 2 without a save from a default chapter 1: nobody hollowed, the nets mended', () => {
    const s = createNewGame(t.basePower);
    startChapterTwo(s);
    expect(s.chapter).toBe(2);
    expect(s.map).toBe('jarnfors');
    expect(s.chapters[0]).toMatchObject({ hollowed: [], quests: { nets: 'mended' }, lilja: 'sister', liljaTakenBy: 'olle' });
    expect(A.hasKeepsake(s, 'whyYouLeft')).toBe(true);
    expect(deserialize(serialize(s))).toEqual(s);
  });
});

describe('the people of Järnfors in old saves', () => {
  it('adds them, unmet, to a save from before they existed', () => {
    const old = JSON.parse(serialize(createNewGame(t.basePower)));
    old.version = 6;
    for (const id of ['edda', 'brita', 'halvar', 'gudmund', 'clerk', 'arn', 'knut']) delete old.state.npcs[id];
    const s = deserialize(JSON.stringify(old));
    expect(s.npcs.edda).toEqual({ offered: false, hollowed: false, faithLost: false });
    expect(s.npcs.halvar.hollowed).toBe(true);
  });
});
