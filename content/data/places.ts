// What Signe notes about each place on her journal map. Positions are in the
// map's "places" layer (scripts/generate-kallsjo-map.mjs). Some places can be
// looked at closely (an Ink knot, set on the map object as "inspect"); doing so
// sets a flag, and the map then shows what she learned there.
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

export interface PlaceNote {
  /** Written on the map when she finds it. */
  found: string;
  /** Set by its Ink knot when she has looked closely... */
  learnedFlag?: string;
  /** ...and then written underneath. */
  learned?: string;
  /** Shown while there is more to find out there. */
  hint?: string;
}

export const PLACES: Record<string, PlaceNote> = {
  home: { found: 'Where I sleep. Father, Lilja, the fire.' },
  jetty: { found: 'The jetty, and the reeds where the ice gets thin.' },
  boathouse: { found: 'The boathouse. Nobody talks about who sits inside.' },
  statue: {
    found: 'Saint Maren on the shore, looking out over the ice.',
    hint: 'There are words cut into the stone.',
    learnedFlag: 'read_statue',
    learned: '"She carried us." Someone has scratched beneath it: "and what did she carry?"',
  },
  ebbe: { found: "Ebbe's net racks, by the shore." },
  fishing: { found: "Father's fishing hole, out on the ice." },
  'ice-road': { found: 'The ice road, marked with spruce sprigs.' },
  'cracked-ice': { found: 'Rotten ice, right across the lake. It will not hold me.' },
  'open-water': { found: 'Black water out on the lake that never freezes over.' },
  island: {
    found: "Maren's village, on the island. Only walls left.",
    hint: 'Something is carved on a doorpost.',
    learnedFlag: 'read_doorpost',
    learned: 'Two children measured against a doorpost: "Maren", and lower down, "Jon". His marks stop.',
  },
  hermit: { found: "The hermit's hut on the point. Smoke, and nobody else for miles." },
  abandoned: {
    found: 'A whole village, empty. Doors left open. Nobody came back for anything.',
    hint: 'One shelter still has a roof. Its door is stove in.',
    learnedFlag: 'shelter_mended',
    learned: 'I mended the shelter door. I can rest here, far from home.',
  },
  'tithe-sled': {
    found: 'A Tithe sled, smashed by the road south and left.',
    hint: 'There is something papery inside, wedged under the broken boards.',
    learnedFlag: 'read_ledger',
    learned: 'The Tithe ledger. Every family in Kallsjö, and beside each name what was taken. Ours too.',
  },
  cairn: {
    found: 'A cairn at the pass north, on the way to Kronvall.',
    hint: 'Every stone has something scratched on it.',
    learnedFlag: 'read_cairn',
    learned: 'A name on every stone: people the Tithe took away whole. Some of the names I know.',
  },
  'pass-south': { found: 'The pass south, out of the valley. Snowed shut this winter.' },
  'pass-north': { found: 'The pass north, toward Kronvall.' },
};
