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

  // --- Järnfors (chapter 2; scripts/generate-jarnfors-map.mjs) ---
  'south-gate': { found: 'The south gate of Järnfors, where the Tithe road comes in.' },
  'dam-crest': { found: "Maren's Dam. A wall of stone across the gorge, a frozen lake behind it." },
  'dam-statue': {
    found: 'Saint Maren on the crest, one hand on the stone.',
    hint: 'There are words on the plinth.',
    learnedFlag: 'read_dam_statue',
    learned: '"She held the water." Scratched beneath: "with whose hands?"',
  },
  gallery: {
    found: 'An iron door in the dam face.',
    hint: 'It stands half open.',
    learnedFlag: 'seen_gallery',
    learned: 'A passage into the dam, fallen in a few paces along. Water drips behind the stones.',
  },
  'hollow-house': {
    found: 'The Hollow-house, where the city tends its blank people.',
    learnedFlag: 'seen_hollow_house',
    learned: 'Two rows of cots. An old woman feeding someone at the window upstairs.',
  },
  'apprentices-hall': {
    found: "The apprentices' hall. Halvar taught the dam here.",
    hint: 'Marks are cut into the lintel.',
    learnedFlag: 'read_lintel',
    learned: 'Nine marks, one for each apprentice. The ninth is scratched out.',
  },
  inn: { found: 'The inn. A bed, a fire, and nobody who knows me.' },
  'tithe-house': {
    found: 'The Tithe-house, barred, where people wait for the sled north.',
    learnedFlag: 'seen_tithe_house',
    learned: 'The slate of names by the door has just been wiped.',
  },
  'mason-yard': { found: "Gudmund's yard: blocks and crates for the dam." },
  'lower-quarter': { found: 'The lower quarter, packed along the river below the dam.' },
  'relief-cut': {
    found: 'A channel hidden in the west wall, running down from the dam.',
    learnedFlag: 'found_relief_cut',
    learned: 'Sealed at the top with a plug of mortared blocks. One letter cut into it: H.',
  },
};
