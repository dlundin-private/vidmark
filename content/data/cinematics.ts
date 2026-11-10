import type { ChapterOneRecord, ChapterRecord, ChapterTwoRecord } from '../../src/state/GameState';
import { KEEPSAKES } from './keepsakes';
import { NPCS, type NpcId } from './npcs';

// The words of the intro and of the end of chapter 1. Each beat names its
// picture (src/scenes/tableaux.ts). The intro introduces Signe without giving
// the magic away (Daniel); the end reflects what she did in chapter 1.
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

export type Picture = 'nightLake' | 'village' | 'girlOnIce' | 'coatByDoor' | 'waking' | 'dawnRoad' | 'emptyBed' | 'ledger' | 'warmPoint' | 'northPass' | 'gorgeDam' | 'damHolds' | 'damGone';

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

export function chapterOneEnding(r: ChapterOneRecord, ctx: EndingContext): Beat[] {
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

/** Films played the first time Signe reaches a map, by map name. They may read the last chapter's record. */
export const ARRIVALS: Record<string, (last: ChapterRecord | undefined) => Beat[]> = {
  jarnfors: (last) => [
    {
      picture: 'gorgeDam',
      title: 'Järnfors',
      lines: [
        'Four days north on the Tithe road, the valley closes into a gorge.',
        'At its head a wall of stone holds back a frozen lake. Below it, a city of stairs and forges.',
        ...(last?.chapter === 1 && last.lilja === 'sister'
          ? ['The sled tracks you have followed all the way go in at the south gate.']
          : last?.chapter === 1 && last.lilja === 'stranger'
            ? ['Torvald said they would have taken the girl this way.']
            : []),
      ],
    },
  ],
};

/** "Why you left", as it forms (Daniel: she goes for a stranger if the swim is gone). */
export function whyYouLeft(lilja: ChapterOneRecord['lilja']): string {
  if (lilja === 'stranger') return 'to bring home the girl they took.';
  if (lilja === 'hollow') return 'to bring Lilja home, even if nobody is in there to bring.';
  return 'to bring Lilja home.';
}

/** The end of chapter 2: the dam as Signe left it, her page, and the road north (Claude's draft). */
export function chapterTwoEnding(r: ChapterTwoRecord): Beat[] {
  const beats: Beat[] = [];
  const dam: Record<ChapterTwoRecord['dam'], string[]> = {
    knit: ['The bell is quiet.', 'A pale scar runs across the crest like a mended bone. It will outlast you, and everyone who watched you make it.'],
    taken: ['The bell is quiet.', "The dam holds the way it held a hundred years ago: with a builder's whole life. Gudmund sits at the window now, beside Halvar."],
    relief: ['The bell is quiet.', "The lower quarter is under brown water. The people who lived there sleep in the apprentices' hall, and say your name, or don't."],
    held: ['The bell is quiet.', 'You held it with what you had, and with what you burned to have it. Your hands still remember the weight.'],
    broken: ['The dam went at dawn.', 'Järnfors is rooftops in brown water. Nobody blames you. People just say: when the dam went.'],
  };
  beats.push({ picture: r.dam === 'broken' ? 'damGone' : 'damHolds', lines: dam[r.dam] });

  const page: string[] = [];
  page.push(
    {
      asked: 'Edda gave you the moment her grandfather looked at her, and with it, Kin.',
      bargain: 'Edda gave you Kin on one condition: if you ever can, you give him back. You promised.',
      taken: 'You took Kin from Edda, and everything else she was. Brita feeds two at the window now.',
      none: 'You leave without Kin. Edda kept what she had.',
    }[r.kin],
  );
  if (r.brita === 'truth') page.push("Halvar's name stands beside Maren's on the statue, where everyone can read it.");
  if (r.brita === 'lie') page.push('You told Brita he was brave. Only that.');
  if (r.arnSafe) page.push("Arn sleeps in the warm at the Hollow-house. He isn't dead. He checks.");
  const knut: Record<ChapterTwoRecord['knut'], string | null> = {
    spared: 'Knut went back down to the lower quarter with nothing in his hands.',
    gave: 'Knut bought his family a way out with the morning his forge first answered to him.',
    hollowed: 'Knut sits blank by a cold forge. The masons saw.',
    let: "You let the thieves take the iron. Knut's family was gone before the water.",
    avoided: 'The cramps stayed in the stone. Nobody had to stop anyone.',
    never: null,
  };
  if (knut[r.knut]) page.push(knut[r.knut]!);
  const name = (id: string) => (id === 'clerk' ? 'the clerk' : id.charAt(0).toUpperCase() + id.slice(1));
  // Edda's gift is already told above, as how Signe came by Kin.
  const others = r.gave.filter((id) => id !== 'edda');
  if (others.length) page.push(`Here, ${others.map(name).join(', ')} gave you something they could not get back.`);
  if (r.hollowed.length) page.push(`Here, you emptied ${r.hollowed.map(name).join(', ')}.`);
  if (r.villageKnew) page.push('Word of what you are goes up the road ahead of you.');
  page.push(r.liljaTrace ? 'A boy remembered her: a whole other sky, under the ice. She came this way.' : 'Somewhere ahead, on the same road, is the girl they took.');
  beats.push({ picture: 'ledger', lines: page });

  beats.push({
    picture: 'northPass',
    title: 'Chapter 3: Runhem',
    lines: ['North of the gorge the Tithe road climbs on, toward Runhem of the storytellers, and Kronvall beyond.', 'Not yet written. Everything you did is kept.'],
  });
  return beats;
}
