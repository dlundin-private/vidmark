import type { NpcId } from './npcs';

// The slice's two quests (docs/design.md, "Vertical slice: content"). Each is
// read from the game state: a quest starts, its steps tick off and it ends by
// itself as things happen in the world; nothing here is ticked off by hand.
// Text is a first draft. Outcomes are told neutrally: consequences, not
// judgement (design pillar).

/** What a quest can look at. */
export interface QuestView {
  flag(name: string): boolean | number | string | undefined;
  offered(npc: NpcId): boolean;
  hollowed(npc: NpcId): boolean;
  /** Signe remembers this about someone (an impression key). */
  remembers(npc: NpcId, key: string): boolean;
}

export interface QuestStep {
  text: (v: QuestView) => string;
  done: (v: QuestView) => boolean;
  /** One of several ways; the journal shows "or" between alternatives. */
  alternative?: boolean;
}

export interface QuestOutcome {
  id: string;
  when: (v: QuestView) => boolean;
  /** Shown in the journal and when the quest ends. */
  text: string;
  /** World flag set when the quest ends this way (the world changes). */
  sets?: string;
}

export interface QuestDef {
  id: string;
  /** The chapter it belongs to (default 1). Quests of finished chapters stay as they ended. */
  chapter?: number;
  title: string;
  giver: NpcId;
  summary: string;
  starts: (v: QuestView) => boolean;
  steps: QuestStep[];
  /** Checked in order; the first that holds ends the quest. */
  outcomes: QuestOutcome[];
}

const num = (v: QuestView, name: string) => Number(v.flag(name) ?? 0);
const allNets = (v: QuestView) => num(v, 'nets_total') > 0 && num(v, 'nets_mended') >= num(v, 'nets_total');
/** Crossed where the hermit remembered thick ice: the wolves on the road never saw her (step 6). */
const byRoute = (v: QuestView) => !!v.flag('crossed_by_route');

export const QUESTS: readonly QuestDef[] = [
  {
    id: 'nets',
    title: "The net-mender's hands",
    giver: 'ebbe',
    summary: 'Ebbe has forgotten how to mend nets. Without nets, the village goes hungry this winter.',
    starts: (v) => !!v.flag('met_ebbe') || num(v, 'nets_mended') > 0,
    steps: [
      { text: (v) => `Mend Ebbe's torn nets (${num(v, 'nets_mended')} of ${num(v, 'nets_total') || 2})`, done: allNets },
      { text: () => 'Or accept the memory Ebbe offers', done: (v) => v.offered('ebbe'), alternative: true },
    ],
    outcomes: [
      { id: 'hollowed', when: (v) => v.hollowed('ebbe'), text: "Ebbe sits by his nets. He doesn't know what they are for." },
      { id: 'mended', when: allNets, text: "Ebbe's nets are whole again. The village will eat this winter." },
      { id: 'offering', when: (v) => v.offered('ebbe'), text: 'Ebbe gave you his last memory of his wife.' },
    ],
  },
  {
    id: 'ice-road',
    title: 'The ice road',
    giver: 'hermit',
    summary: 'The road across the lake is breaking up. A band of cracked ice cuts it in two, halfway over.',
    starts: (v) => !!v.flag('heard_ice_road') || !!v.flag('fell_through_cracked_ice'),
    steps: [
      {
        text: () => 'Find a way across the cracked ice: make it hold, or find someone who remembers a safe way',
        done: (v) => !!v.flag('strengthened_cracked_ice') || !!v.flag('knows_safe_route'),
      },
      { text: () => 'Cross the cracked ice on foot', done: (v) => !!v.flag('crossed_cracked_ice') },
    ],
    outcomes: [
      {
        id: 'hollowed',
        when: (v) => byRoute(v) && v.hollowed('hermit'),
        text: 'You crossed by the way you took from the hermit. He sits in his hut and does not look at the lake.',
        sets: 'ice_road_open',
      },
      {
        id: 'route',
        when: byRoute,
        text: "You crossed by the hermit's old route. He no longer remembers it.",
        sets: 'ice_road_open',
      },
      {
        id: 'strengthened',
        // Crossing anywhere else brings the starving wolves out onto the road; it ends once they are gone.
        when: (v) => !!v.flag('crossed_cracked_ice') && !!v.flag('wolves_gone'),
        text: 'You made the ice hold, crossed, and the wolves gave up the road. The village marks it safe again.',
        sets: 'ice_road_open',
      },
    ],
  },
  // The two chapter-1 side quests beyond the slice's two (design: "Side quests").
  {
    id: 'hollow',
    title: 'The Hollow in the boathouse',
    giver: 'hollow',
    summary: 'The village tends a blank man in the boathouse, and nobody talks about him.',
    starts: (v) => !!v.flag('met_hollow'),
    steps: [
      { text: () => 'Ask someone in the village who he was', done: (v) => !!v.flag('asked_about_hollow') },
      { text: () => 'Find what the Tithe wrote down', done: (v) => !!v.flag('read_ledger') },
      { text: () => 'Find where the Tithe takes people', done: (v) => !!v.flag('read_cairn') },
    ],
    outcomes: [
      {
        id: 'learned',
        when: (v) => !!v.flag('asked_about_hollow') && !!v.flag('read_ledger') && !!v.flag('read_cairn'),
        text: "When a village can't pay, the Tithe takes a person instead: whole, or everything they were.",
        sets: 'knows_tithe_takes_people',
      },
    ],
  },
  {
    id: 'marens-winter',
    title: "Maren's Winter",
    giver: 'gerda',
    summary: 'Every year the village plays how Saint Maren saved the lake. Old Gerda needs a young Maren.',
    starts: (v) => !!v.flag('maren_winter_part'),
    steps: [
      { text: () => 'Hear the story the way Father tells it', done: (v) => !!v.flag('heard_fathers_story') || v.remembers('torvald', 'story') },
      { text: () => 'Play your part, at the statue on the shore', done: (v) => !!v.flag('played_maren') },
    ],
    outcomes: [
      { id: 'hollowed', when: (v) => v.hollowed('gerda') && !v.flag('played_maren'), text: 'There is no play this year. Nobody else remembers the lines.' },
      {
        id: 'noticed',
        when: (v) => !!v.flag('played_maren') && !!v.flag('noticed_play_differs'),
        text: "The play and Father's story don't agree about what Maren gave. Someone is remembering it wrong.",
      },
      { id: 'played', when: (v) => !!v.flag('played_maren'), text: 'You played young Maren. The village clapped. It was only a play.' },
    ],
  },

  // --- Järnfors (chapter 2): the three side quests (docs/chapter-2-jarnfors.md). Drafts.
  {
    id: 'britas-bowl',
    chapter: 2,
    title: "Brita's bowl",
    giver: 'brita',
    summary: 'Brita feeds a man who looks past her, twice a day. She asks one thing: was he a coward?',
    starts: (v) => v.remembers('brita', 'refused'),
    steps: [
      { text: () => 'Read what the city says, on the statue on the crest', done: (v) => !!v.flag('read_dam_statue') },
      { text: () => "Read the marks on the apprentices' hall", done: (v) => !!v.flag('read_lintel') },
      { text: () => 'Find what Halvar left at his drawing table', done: (v) => !!v.flag('read_drawing_table') },
      { text: () => 'Tell Brita what you found', done: (v) => !!v.flag('brita_told') },
    ],
    outcomes: [
      { id: 'hollowed', when: (v) => v.hollowed('brita'), text: 'Two Hollows at the window now. Nobody asks the question any more.' },
      { id: 'truth', when: (v) => v.flag('brita_told') === 'truth', text: "He said no because the dam was built too high. Brita had herself carried up to the crest with him, and someone scratched HALVAR beside Maren's name." },
      { id: 'lie', when: (v) => v.flag('brita_told') === 'lie', text: 'You told her he was brave, and nothing else. She thanked you, and fed him.' },
      { id: 'nothing', when: (v) => v.flag('brita_told') === 'nothing', text: 'You told her you found nothing. She nodded as if she had expected that, and fed him.' },
    ],
  },
  {
    id: 'keeping',
    chapter: 2,
    title: 'The keeping',
    giver: 'gudmund',
    summary: "Gudmund's masons patch cracks they no longer understand. The gallery inside the dam has fallen in.",
    starts: (v) => v.remembers('gudmund', 'forgot'),
    steps: [
      { text: () => 'Look into the gallery in the dam face', done: (v) => !!v.flag('seen_gallery') },
      { text: () => 'Learn the dam again: mend the fallen gallery (Mend II)', done: (v) => !!v.flag('gallery_mended') },
      { text: () => "Or find the apprentices' tally-sticks", done: (v) => !!v.flag('read_tally'), alternative: true },
      { text: () => 'Tell Gudmund what the dam is saying', done: (v) => !!v.flag('keeping_restored') },
    ],
    outcomes: [
      { id: 'hollowed', when: (v) => v.hollowed('gudmund'), text: 'The whole keeping is in you now, every drain. The masons have nobody to tell them.' },
      { id: 'mended', when: (v) => !!v.flag('keeping_restored') && !!v.flag('gallery_mended'), text: 'The gallery is open again. Lanterns at the door; the masons go in at dawn and listen to the wall.' },
      { id: 'tally', when: (v) => !!v.flag('keeping_restored'), text: "From the apprentices' sticks, Gudmund reads the drains again. Lanterns at the gallery door, and masons at dawn." },
    ],
  },
  {
    id: 'tithe-house',
    chapter: 2,
    title: 'The Tithe-house',
    giver: 'arn',
    summary: 'A sick boy, Arn, was left on the Tithe-house step when the last sled went north.',
    starts: (v) => v.remembers('arn', 'left'),
    steps: [
      { text: () => 'Get Arn out of the cold: mend the broken cot by the door and carry him to the Hollow-house', done: (v) => v.flag('arn_safe') === 'carried' },
      { text: () => 'Or get the clerk to strike his name', done: (v) => v.flag('arn_safe') === 'struck', alternative: true },
      { text: () => 'See what the Tithe-house keeps', done: (v) => !!v.flag('read_edda_debt') },
    ],
    outcomes: [
      { id: 'hollowed', when: (v) => v.hollowed('clerk'), text: 'The clerk sits blank in his own doorway. Arn walked to the Hollow-house on his own.' },
      { id: 'carried', when: (v) => v.flag('arn_safe') === 'carried' && !!v.flag('read_edda_debt'), text: 'You carried Arn to the Hollow-house. Edda put him in the warm, and you found what she pays.' },
      { id: 'struck', when: (v) => v.flag('arn_safe') === 'struck' && !!v.flag('read_edda_debt'), text: "The clerk struck Arn's name. He belongs to nobody now, and Edda took him in." },
    ],
  },

  {
    id: 'flood-bell',
    chapter: 2,
    title: 'The flood-bell',
    giver: 'gudmund',
    summary: 'A crack has opened in the crest of the dam. The bell is ringing, and the masons give it three nights.',
    starts: (v) => !!v.flag('flood_bell'),
    steps: [
      { text: (v) => `Save the dam before it breaks (${Number(v.flag('dam_rests_left') ?? 0)} rests left)`, done: (v) => !!v.flag('dam_outcome') && v.flag('dam_outcome') !== 'broken' },
      { text: () => 'Knit the stone at the crack, with Kin and Craft together, anchored in something of yours', done: (v) => v.flag('dam_outcome') === 'knit', alternative: true },
      { text: () => "Or open Halvar's relief cut: weaken the plug, clear the carts, strengthen the walls at its mouth", done: (v) => v.flag('dam_outcome') === 'relief', alternative: true },
      { text: () => 'Or hold the crack with everything you have', done: (v) => v.flag('dam_outcome') === 'held' || v.flag('dam_outcome') === 'taken', alternative: true },
    ],
    outcomes: [
      { id: 'knit', when: (v) => v.flag('dam_outcome') === 'knit', text: 'You knit the stone like bone. It holds, and the pale scar on the crest will outlast you.' },
      { id: 'taken', when: (v) => v.flag('dam_outcome') === 'taken', text: "You held it with Gudmund's keeping, the way Maren held it with Halvar's. It holds." },
      { id: 'relief', when: (v) => v.flag('dam_outcome') === 'relief', text: 'You let the lake out down Halvar\'s cut. The dam holds. The lower quarter is under water; nobody drowned, but the poor lost everything.' },
      { id: 'held', when: (v) => v.flag('dam_outcome') === 'held', text: 'You held it with everything you had, and what you burned to have it. It holds.' },
      { id: 'broken', when: (v) => v.flag('dam_outcome') === 'broken', text: 'The dam went at dawn. The city is rooftops in brown water. Nobody blames you. People just say: when the dam went.' },
    ],
  },
];
