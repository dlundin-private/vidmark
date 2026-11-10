import { describe, expect, it } from 'vitest';
import { MEMORIES } from '../../content/data/impressions';
import { DEFAULT_TUNING } from '../../content/data/tuning';
import * as A from '../state/actions';
import { createNewGame } from '../state/GameState';
import { rememberedPeople } from './impressions';

const t = DEFAULT_TUNING;
const lilja = (s: ReturnType<typeof createNewGame>) => rememberedPeople(s).find((p) => p.id === 'lilja')!;

describe("Signe's memories of people", () => {
  it('lists only people she has met, in the order she formed impressions', () => {
    const s = createNewGame(2);
    expect(rememberedPeople(s)).toEqual([]);
    A.remember(s, 'ebbe', 'met');
    A.remember(s, 'ebbe', 'tithe');
    A.remember(s, 'ebbe', 'tithe');
    const [ebbe] = rememberedPeople(s);
    expect(ebbe!.lines.map((l) => l.text)).toEqual([MEMORIES.ebbe.impressions[0]!.text, MEMORIES.ebbe.impressions[1]!.text]);
  });

  it('blurs Lilja, name and all, once the swim is burned', () => {
    const s = createNewGame(2);
    A.remember(s, 'lilja', 'met');
    expect(lilja(s).name).toBe('Lilja');
    A.burnKeepsake(s, 'swim', t);
    expect(lilja(s).name).toBe('A girl from the village');
    expect(lilja(s).lines[0]).toMatchObject({ blurred: true, text: MEMORIES.lilja.impressions[0]!.blurred });
  });

  it("blurs only the Maren lore when the story is burned, not the rest of Gerda", () => {
    const s = createNewGame(2);
    A.remember(s, 'gerda', 'met');
    A.remember(s, 'gerda', 'statue');
    A.burnKeepsake(s, 'story', t);
    const gerda = rememberedPeople(s).find((p) => p.id === 'gerda')!;
    expect(gerda.lines.map((l) => l.blurred)).toEqual([false, true]);
  });

  it('turns cold once she carries an Echo', () => {
    const s = createNewGame(2);
    A.remember(s, 'ebbe', 'met');
    A.recordHollowing(s, 'hermit', t);
    expect(rememberedPeople(s)[0]!.lines[0]).toMatchObject({ cold: true, text: MEMORIES.ebbe.impressions[0]!.cold });
  });

  it('says where people stand with her', () => {
    const s = createNewGame(2);
    A.remember(s, 'ebbe', 'met');
    A.recordOffering(s, 'ebbe', t);
    expect(rememberedPeople(s)[0]!.standing).toBe('In your Hearth.');
    A.setFaithLost(s, 'ebbe', true, t);
    expect(rememberedPeople(s)[0]!.standing).toBe('Lost faith in you.');
  });
});

describe('every memory the dialogue forms', () => {
  it('has words in the journal', () => {
    // The Ink sources as text (not compiled), through Vite like the game's build.
    const files = Object.values(import.meta.glob<string>('../../content/ink/**/*.ink', { query: '?raw', import: 'default', eager: true }));
    expect(files.length).toBeGreaterThan(5);
    const missing: string[] = [];
    for (const text of files) {
      for (const m of text.matchAll(/remember\("(\w+)", "(\w+)"\)/g)) {
        const person = MEMORIES[m[1] as keyof typeof MEMORIES];
        if (!person?.impressions.some((i) => i.key === m[2])) missing.push(`${m[1]}:${m[2]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
