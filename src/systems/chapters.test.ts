import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import * as A from '../state/actions';
import { createNewGame } from '../state/GameState';
import { deserialize, serialize } from '../state/save';
import { chapterOneCanEnd, endChapterOne, summariseChapterOne } from './chapters';
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
