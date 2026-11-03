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
        when: (v) => !!v.flag('crossed_cracked_ice') && !!v.flag('knows_safe_route') && v.hollowed('hermit'),
        text: 'You crossed by the way you took from the hermit. He sits in his hut and does not look at the lake.',
        sets: 'ice_road_open',
      },
      {
        id: 'route',
        when: (v) => !!v.flag('crossed_cracked_ice') && !!v.flag('knows_safe_route'),
        text: "You crossed by the hermit's old route. He no longer remembers it.",
        sets: 'ice_road_open',
      },
      {
        id: 'strengthened',
        when: (v) => !!v.flag('crossed_cracked_ice'),
        text: 'You made the ice hold and crossed. The village marks the road safe again.',
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
];
