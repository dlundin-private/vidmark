import type { KeepsakeId } from './keepsakes';
import type { NpcId } from './npcs';

// Signe's memories of the people she meets: not a transcript, but the outline
// of them, how she saw them and roughly what they said. Dialogue forms them
// (remember("ebbe", "tithe") in Ink); the journal's People page shows them.
//
// How she sees people depends on who she has become (decided by Daniel):
//   blurred  when the Keepsake an impression rests on is gone, it fades to this
//   cold     when she carries Echoes, other lives crowd her own and she sees
//            what people are worth to her, not who they are
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

export interface Impression {
  key: string;
  text: string;
  blurred?: string;
  cold?: string;
  /** The Keepsake this memory rests on, when it isn't the person's own. */
  tiedTo?: KeepsakeId;
}

export interface PersonMemory {
  /** The Keepsake everything about this person rests on (Lilja: the swim). */
  tiedTo?: KeepsakeId;
  /** How she'd name them once the tie is gone. */
  blurredName?: string;
  impressions: Impression[];
}

export const MEMORIES: Record<NpcId, PersonMemory> = {
  ebbe: {
    impressions: [
      { key: 'met', text: 'Forty winters of nets, and one morning his hands forgot.', cold: 'Old hands, empty now. One memory left in him worth anything.' },
      { key: 'tithe', text: 'The Tithe took more this year. You only find out what when you reach for it.' },
      { key: 'mend_offer', text: "He'd let you try his nets. He didn't believe you could." },
      { key: 'wife', text: 'His wife on the jetty, laughing at his knots. The last thing he has of her.', cold: 'He offered his wife: the last good memory in him.' },
      { key: 'nets', text: "You mended his nets. He kept turning them over, as if he'd forgotten nets could be whole." },
      { key: 'taught', text: '"A net is made before the fish comes." He taught you more than he knew.' },
      { key: 'hollow', text: "He wouldn't talk about the man in the boathouse. \"He was one of us.\"" },
    ],
  },
  hermit: {
    impressions: [
      { key: 'met', text: "Guts his fish slowly and doesn't look up. Thinks everyone who comes wants something.", cold: 'Wary, and alone. Knows the ice better than anyone alive.' },
      { key: 'ice_road', text: 'A band of rotten ice right across the lake, every spring. He remembers where it is thick.' },
      { key: 'refused_route', text: "He won't give what's his to strangers. Do something for the village first." },
      { key: 'gave_route', text: 'He gave you the way across. Afterwards he looked at the lake as if it were any lake.', cold: 'He gave you the way across. Nothing left in him you need.' },
      { key: 'alone', text: 'Lives out here so the Tithe-men forget to count him.' },
    ],
  },
  gerda: {
    impressions: [
      { key: 'met', text: 'Old Gerda. Her eyes are worse than her ears, and she misses nothing.' },
      {
        key: 'statue',
        text: 'Her grandmother knew Maren: a skinny girl with chapped hands, before she was a saint.',
        blurred: 'Something about the statue on the shore. A girl, before she was something else.',
        tiedTo: 'story',
      },
      {
        key: 'grandmother',
        text: "Maren loved her little brother more than her own eyes. The winter she saved the lake, she stopped knowing her mother's face.",
        blurred: 'A story about a saint and her mother. It slips away when you try to hold it.',
        tiedTo: 'story',
      },
      { key: 'hollow', text: "\"We don't say his name. It would be cruel.\" His family couldn't pay, so the Tithe took him instead.", cold: 'The man in the boathouse was payment. The Tithe took all of him.' },
      { key: 'winter', text: 'She wants me as young Maren in the festival play. "You\'ve the face for it."' },
      { key: 'gave', text: "She gave you her grandmother's Maren so it wouldn't die with her. Now the statue is only a statue to her.", cold: 'She gave you the true Maren. It was worth more than she was.' },
    ],
  },
  olle: {
    impressions: [
      { key: 'met', text: 'Reeve Olle. Finishes counting a line of names before he looks up.', cold: 'The Tithe-collector. He carries other people\'s memories to Kronvall.' },
      { key: 'tithe', text: 'He believes it: a share of what we know, for the Hearth at Kronvall. Saint Maren carries us all.' },
      { key: 'too_much', text: "Sorry, he said. But a village that can't pay still owes." },
      { key: 'cant_pay', text: "If we can't pay, Kronvall decides. He wouldn't look at you when he said it." },
    ],
  },
  hollow: {
    impressions: [
      { key: 'met', text: 'The blank man in the boathouse. Someone combs his hair and washes his face.' },
      { key: 'who', text: "He doesn't answer. Not even the effort of not answering." },
      { key: 'hand', text: 'His hand was warm, and held on to nothing.', cold: 'His hand was warm. There is nothing left in him to take.' },
    ],
  },
  lilja: {
    tiedTo: 'swim',
    blurredName: 'A girl from the village',
    impressions: [
      { key: 'met', text: 'Your sister. Slides from the jetty to the reeds and never falls.', blurred: 'Bright, fearless on the ice. She seemed to know you.' },
      { key: 'careful', text: 'You told her not past the reeds. She reminded you that you taught her to swim.', blurred: 'You told her to keep off the thin ice. She said something about swimming.' },
      { key: 'promise', text: 'You promised to take her all the way across when the road is safe.', blurred: 'You promised her something. Across the ice.' },
      { key: 'gave_swim', text: "She gave you the swim, so you would always remember her. She doesn't remember learning.", blurred: 'She gave you something. You keep it without knowing why.', cold: 'She gave you the swim. It was the best thing she had.' },
      { key: 'kept_promise', text: 'You took her all the way across. On the far shore she looked back at the village and said: you kept it.', blurred: 'You walked a girl across the ice road. She seemed to think you owed her that.' },
    ],
  },
  // --- Järnfors (chapter 2) ---
  edda: {
    impressions: [
      { key: 'met', text: 'Edda, who runs the Hollow-house. "If you\'ve come to help, there\'s water to carry."', cold: 'Edda. She has Kin in her, deep. She would never give it.' },
      { key: 'heard', text: 'She had heard of me before I came: the girl from the lake who empties people.' },
      { key: 'house', text: 'The Tithe takes a whole person when a family can\'t pay. They end up in her rows of cots.' },
      { key: 'grandfather', text: 'Halvar is her grandfather. The city calls him a coward. Her grandmother doesn\'t.' },
      { key: 'dam', text: '"Everyone here asks the dam for something. It always takes someone." She is afraid of being needed.', cold: 'She is afraid of being needed. That is a lever.' },
      { key: 'lilja', text: 'Every sled stops at the Tithe-house. Ask the clerk, or the boy on the step.' },
      { key: 'helped', text: 'You carried water for her, pail after pail. Neither of you said much. "You can come again."' },
      { key: 'gave', text: 'She gave you Halvar looking at her, once, when she was small. Now she feeds him and isn\'t sure why it felt like more than duty.', cold: 'She gave you the only warm thing she had. It opened Kin in you.' },
      { key: 'bargain', text: 'She gave it on a condition: if you ever can, you give him back. You promised.' },
    ],
  },
  brita: {
    impressions: [
      { key: 'met', text: 'Brita, so old she is almost light. She feeds Halvar at the window, and knew I was from away by my step.' },
      { key: 'reeve', text: '"You look at people like a reeve. Weighing them."' },
      { key: 'refused', text: 'Halvar said no to Maren. That is all he did. She took him in front of his apprentices.' },
      { key: 'why', text: '"Because he would do it for me. Because somebody has to remember he was a man, not a story."', tiedTo: 'coat' },
      { key: 'truth', text: 'You told her the truth: too high, and he wouldn\'t build it. She had them carry her up to the crest with him.' },
      { key: 'lie', text: 'You told her he was brave, and nothing more. She thanked you.' },
      { key: 'nothing', text: 'You told her you had found nothing. "No. Nobody ever does."' },
      { key: 'gave', text: 'She gave you the morning he refused. Her hands still feed him; her face has gone quiet.' },
    ],
  },
  halvar: {
    impressions: [
      { key: 'met', text: 'Halvar, the builder. A Hollow for a hundred years, and his hands still look like a builder\'s.' },
      { key: 'hands', text: 'Old mortar in the creases of his knuckles that a century of washing hasn\'t got out.' },
      { key: 'eyes', text: 'He looks up the gorge at the dam. He has been looking at it for a hundred years.' },
    ],
  },
  gudmund: {
    impressions: [
      { key: 'met', text: 'Gudmund, the dam-master, staring at a stone as if it should explain itself.' },
      { key: 'heard', text: '"Lake girl. Keep your hands where I can see them."' },
      { key: 'forgot', text: 'He knew every drain in the dam, like his father. The Tithe took it. "Now it\'s just a wall."', cold: 'The keeping is mostly gone from him. Mostly.' },
      { key: 'gallery', text: 'The gallery runs through the inside of the dam. The roof fell in the autumn; nobody remembers how to shore it.' },
      { key: 'saint', text: '"I\'d settle for a mason who remembered his mortar."' },
      { key: 'keeping', text: 'Once you told him what the dam was saying, it all came back to him: the drains, and Halvar\'s sealed cut.' },
      { key: 'masons', text: 'He put masons on the towers at night, against the cramp-thieves.' },
      { key: 'gave', text: 'He gave you his first stone. Now a block is only a block to him.', cold: 'He gave you the feel of stone. He did not need it as much as you do.' },
    ],
  },
  clerk: {
    impressions: [
      { key: 'met', text: 'The Tithe-house clerk, ink on every finger, standing in the door as if he were the door.' },
      { key: 'heard', text: 'The Reeve\'s report reached him: "takes without a ledger".' },
      { key: 'tithe', text: 'They wait for the sled, then Kronvall. "Then they are Kronvall\'s concern, and not mine."' },
      { key: 'wiped', text: 'The names are wiped when the sled leaves. He won\'t talk about her.' },
      { key: 'struck', text: 'Calmed, he struck Arn\'s name. "He belongs to nobody now."' },
      { key: 'gave', text: 'He gave you the first child he signed away, the girl who let go of his sleeve. Now the ledger is only a book to him.' },
    ],
  },
  arn: {
    impressions: [
      { key: 'met', text: 'Arn, a boy on the Tithe-house step. Left behind because Kronvall doesn\'t pay for the dying.' },
      { key: 'left', text: '"I\'m not dead, though. I keep checking."' },
      { key: 'girl', text: 'He waited with a girl from Kallsjö who said there is a whole other sky under the ice. It was Lilja.', blurred: 'He waited with a girl from Kallsjö who talked about swimming.', tiedTo: 'swim' },
      { key: 'carried', text: 'You carried him on the mended cot all the way to Edda\'s door. He was lighter than he should be.' },
      { key: 'breathing', text: '"I can breathe all the way down." He wanted to know if it was you.' },
    ],
  },
  knut: {
    impressions: [
      { key: 'met', text: 'Knut, a forge-hand from the lower quarter, sharpening a pry-bar.' },
      { key: 'cramps', text: 'He prises the iron cramps out of the dam at night and sells them downriver. "Everyone down here knows it\'s going."' },
      { key: 'quarter', text: 'When the dam goes, the upper city gets wet feet. The lower quarter drowns.' },
      { key: 'persuaded', text: 'You told him the dam could hold. "If it holds, it\'s worth more whole." The cramps stay.' },
      { key: 'promised', text: 'You promised his family a place on the relief route. "Don\'t make me sorry."' },
    ],
  },
  torvald: {
    impressions: [
      { key: 'met', text: 'Your father, at his hole in the ice. "There\'s my girl."' },
      {
        key: 'story',
        text: 'He told the old story again. You knew every word before he said it.',
        blurred: "He told you a story about a saint. You'd never heard it. His voice caught near the end.",
        tiedTo: 'story',
      },
      { key: 'ice_road', text: 'Rotten ice halfway over, he says. "Don\'t you go trying it."' },
      { key: 'fishing', text: 'Thin catch. Nobody remembers how to salt fish any more, so half of it spoils.' },
      { key: 'told_promise', text: "You told him your promise to Lilja. \"Then you'd better keep it.\"" },
      { key: 'nets_out', text: "Ebbe's nets are out by the hole. First proper haul since autumn: we'll eat this winter.", cold: 'The nets are out. The village will eat, and stay here, within reach.' },
    ],
  },
};
