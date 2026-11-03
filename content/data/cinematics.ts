import type { ChapterRecord } from '../../src/state/GameState';
import { KEEPSAKES } from './keepsakes';
import { NPCS, type NpcId } from './npcs';

// The words of the intro and of the end of chapter 1. Each beat names its
// picture (src/scenes/tableaux.ts). The intro introduces Signe without giving
// the magic away (Daniel); the end reflects what she did in chapter 1.
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

export type Picture = 'nightLake' | 'village' | 'girlOnIce' | 'coatByDoor' | 'waking' | 'dawnRoad' | 'emptyBed' | 'ledger' | 'warmPoint' | 'northPass';

export interface Beat {
  picture: Picture;
  lines: string[];
  title?: string;
}

export const INTRO: readonly Beat[] = [
  { picture: 'nightLake', lines: ['Kallsjö.', 'The lake froze before the first snow this year, and it will not let go until spring.'] },
  { picture: 'village', lines: ['Every winter the Reeve comes with the Tithe, and the village pays its share.', 'This winter it paid more than its share. Nobody can quite say what is missing.'] },
  { picture: 'girlOnIce', lines: ['Your sister slides from the jetty to the reeds and never falls.', 'You taught her that. You are almost sure you did.'] },
  { picture: 'coatByDoor', lines: ['There is a coat by the door that was never yours.', 'You keep it. You could not say why.'] },
  { picture: 'waking', lines: ['You wake to the ice talking to itself in the dark.', 'Your name is Signe.'] },
];

/** Facts about the world at the end that the record doesn't hold. */
export interface EndingContext {
  torvaldHollowed: boolean;
}

const name = (id: NpcId) => NPCS.find((n) => n.id === id)!.name;
const list = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

export function chapterOneEnding(r: ChapterRecord, ctx: EndingContext): Beat[] {
  const beats: Beat[] = [];

  // Who came for her.
  beats.push({
    picture: 'dawnRoad',
    lines:
      r.liljaTakenBy === 'kronvall'
        ? [
            'In the morning the road you opened is quiet.',
            'The Reeve never came back to Kronvall, so Kronvall sent its own: strangers with no ledger, and no sorry.',
            'They took the blank Reeve too, as Kronvall’s property.',
          ]
        : ['In the morning the road you opened is quiet.', 'Reeve Olle came before light, with the sled. Kallsjö could not pay.', 'Paid in full: one, whole.'],
  });

  // What was taken, as Signe knew her.
  beats.push({
    picture: 'emptyBed',
    lines:
      r.lilja === 'hollow'
        ? ['They took the blank girl too.', 'She went without looking back. She didn’t know to.']
        : r.lilja === 'stranger'
          ? ctx.torvaldHollowed
            ? ['A girl from the village is gone.', 'Nobody asks you to bring her home. You find that you mean to anyway.']
            : ['A girl from the village is gone.', 'Torvald is on his knees in the snow, asking you to bring his daughter home.', 'You don’t know her. You say yes.']
          : ['Lilja’s bed is empty.', 'Her mittens are still drying by the stove.'],
  });

  // How Signe got here: her own page.
  const page: string[] = [];
  page.push(r.gave.length ? `${list(r.gave.map(name))} gave you something they could not get back.` : 'Nobody gave you anything.');
  const emptied = [...r.hollowed.map(name), ...(r.wolvesHollowed ? [r.wolvesHollowed === 1 ? 'a wolf' : `${r.wolvesHollowed} wolves`] : [])];
  if (emptied.length) page.push(`You emptied ${list(emptied)}. You carry them still.`);
  const burned = r.burned.map((id) => KEEPSAKES.find((k) => k.id === id)!.title.toLowerCase());
  if (burned.length) page.push(`You burned ${list(burned)}. The pages are blank where they were.`);
  const nets = r.quests.nets;
  if (nets === 'mended') page.push('Ebbe’s nets are out on the ice.');
  if (nets === 'offering') page.push('Ebbe gave up his wife so the village could eat.');
  if (nets === 'hollowed') page.push('Ebbe sits by torn nets and doesn’t know what they are for.');
  if (r.quests['marens-winter'] === 'noticed') page.push('The play and your father’s story don’t agree about Maren. Someone remembers it wrong.');
  const promise = r.promises.find((p) => p.id === 'lilja_ice');
  if (promise?.kept) page.push('You kept your promise. On the far shore she looked back at the village, small across the white.');
  else if (promise) page.push('You promised to take her all the way across the ice. Someone else did.');
  if (r.villageKnew) page.push('The village knows what you are. No door opens as you go.');
  beats.push({ picture: 'ledger', lines: page });

  // Why you left.
  beats.push({
    picture: 'warmPoint',
    lines: ['Something settles in you, heavy and certain.', `Why you left: ${whyYouLeft(r.lilja)}`],
  });

  beats.push({
    picture: 'northPass',
    title: 'Chapter 2: Järnfors',
    lines: ['The road north goes to Järnfors, and the great dam.', 'Not yet written. Everything you did is kept.'],
  });
  return beats;
}

/** "Why you left", as it forms (Daniel: she goes for a stranger if the swim is gone). */
export function whyYouLeft(lilja: ChapterRecord['lilja']): string {
  if (lilja === 'stranger') return 'to bring home the girl they took.';
  if (lilja === 'hollow') return 'to bring Lilja home, even if nobody is in there to bring.';
  return 'to bring Lilja home.';
}
