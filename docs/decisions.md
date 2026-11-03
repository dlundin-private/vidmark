# Decisions and drafts

Choices the design doc ([design.md](design.md)) doesn't make. Each one is marked by who decided it. **Draft** means Claude proposed it and it stands until Daniel changes it. Newest first within each section.

## Rules

| Decision | Status | Where |
| --- | --- | --- |
| "Your name" stays hidden in the journal until late in the full game: the reveal should land as "even this can be spent", it must not be burned by accident early, and it mirrors Maren, who burned her name last. In the slice, the debug panel can reveal and burn it, to test what losing it does. | Decided by Daniel, 2026-11-02 | `content/data/keepsakes.ts` (`hiddenUntilLate`), debug panel |
| "Why you left" exists from the start but can only be burned or used after it forms at the end of chapter 1. In the slice it never forms, so it can't be burned there. | Decided by Daniel, 2026-11-02 | `content/data/keepsakes.ts` (`formedLater`) |
| Spending uses refillable Power first, then the one-time reserve. | Draft | `src/state/actions.ts` |
| Losing a Hearth member (hollowed or faith lost) lowers max Power at once. | Draft | `src/state/actions.ts` |
| The boathouse Hollow was hollowed by someone else, so Signe carries no Echo of him. | Draft | `src/state/actions.ts` |

## People's domains

Only Ebbe's domain follows from the design (his memory teaches Mend). In the slice, Signe holds only Craft, so a domain matters mostly for what an Offering from that person can teach her.

| Person | Domain | Status | Reasoning |
| --- | --- | --- | --- |
| Ebbe | Craft | From the design | His memory of mending nets teaches Mend. |
| The hermit | Kin | Draft | A life alone with the forest, the lake and its fish. It also fits "guide the fish", the ice road's Kin solution. |
| Old Gerda | Thought | Draft | She keeps what her grandmother told her about Maren: a life spent with remembered words. |
| Reeve Olle | Thought | Draft | He keeps the Tithe: ledgers, names and who owes which memories. |
| The Hollow | Craft | Draft | Whatever he held is gone; Craft only matters if the design later reveals who he was. |
| Lilja | Kin | Draft | Bright and fearless on the ice; the swim, her bond with Signe, is a Kin memory. |
| Torvald | Craft | Draft | A fisherman's life of boats and nets. He tells the story, but the story is Signe's Thought Keepsake, not his domain. |

## Tuning starting values

All in `content/data/tuning.ts`, changeable live in the debug panel.

| Value | Start | Status |
| --- | --- | --- |
| Max Power with no Offerings | 2 | Draft (the design has no base value) |
| Max Power per Offering | 1 | From the design |
| Reserve from one hollowing | 5 | From the design ("for example 5") |
| Burn: swim / coat / story | 4 / 3 / 3 | Draft |
| Burn: shame / why you left / your name | 6 / 5 / 6 | Draft, following "pain pays best" |
| Wounds before Signe falls | 3 | From the design |

## Craft, Power and Weaves (step 4)

The design gives the four actions, their costs and the Weave parts. Everything below fills gaps; all numbers are in `content/data/tuning.ts` and the debug panel.

| Rule | Status |
| --- | --- |
| Signe reaches 3 tiles with Craft; the Range modifier makes it 8. | Draft |
| Craft only works on made things: crates, sleds, net racks, boats, ice markers, houses, the statue. Not trees, people or mountains. | Draft, from the domain ("Made") |
| **Strengthen** makes an object or ice resilient: it can't be weakened while the effect lasts. | Draft, from the design |
| **Weaken** on an object makes it brittle: the next push breaks it. On ice it cracks the ice open to black water at once. It refuses the ice under Signe or under a person. | Draft. The design says ice "cracks under whoever stands on it"; breaking it under people waits for the wolf fight. |
| **Push** moves an object straight away from Signe along one axis; she must stand in line with it. You tap where it should stop. 1 Power per 2 tiles, as designed. | Draft |
| **Mend** repairs broken things. Nets need Mend I, a boat Mend II, a house Mend III. The Size modifier lets Mend repair one size bigger. | Draft |
| A Weave's cost = the action's cost, +1 for an area target, +1 for a modifier. Trained skills make their Weaves 1 cheaper per level above I, never below 1. | Draft |
| Targets: an object, a surface (one tile of ice), or an area (3 × 3). Size makes a surface 3 × 3 and an area 5 × 5. | Draft |
| **Trigger** (Weaken on ice only): the ice looks whole and breaks under the next step. Signe sees her own traps as faint cracks, and tap-to-walk routes around them; the arrow keys can still walk onto them. Breaking through costs her a wound and she climbs back out where she came from. | Draft, from the design's example ("ice that breaks when a wolf steps on it") |
| **Duration**: an effect lasts one rest longer. Ordinary effects fade at the next rest; broken ice refreezes after one rest. | Draft |
| Only some modifiers fit each action: Trigger only for Weaken on ice, Size not for Push, and so on. The Weave screen shows only those that fit. | Draft |
| **Training**: Mend and Weaken level up from use on distinct things (3 for level II, 7 for III). Using them on the same thing again teaches nothing. | Draft, from the design ("not grinding") |
| An Offering from Ebbe raises Mend by one level; hollowing him would raise it by two. | Draft. **Question:** the design says Ebbe's memory teaches Mend, but the memory he offers is of his wife. Should that memory teach Mend, or should another memory of his do it? |
| **Anchoring** consumes a memory into a Weave for good: its effects never fade. A Keepsake is lost as if burned; an Offering costs a point of max Power for good; an Echo lives on in the Weave. Anchored Weaves can't be deleted. "Your name" is never offered. | Draft, from the design |
| **Resting** happens at Signe's home: tap the house. Power refills (the reserve doesn't), one wound heals, Craft effects tick down, broken ice refreezes. | Draft |
| At 3 wounds Signe dies. The game goes back to her last rest at home; everything since is undone. With no rest yet, it starts over. | Decided by Daniel |
| Death is told as a memory she had wrong: "No. That isn't how it went. You're remembering it wrong", then "Remember it again". The text is in `content/ink/death.ink`, three variants per line. | Daniel's idea, wording drafted by Claude |

## Quests, the journal and the cracked ice

Daniel asked for story progress to be visible as quests, and to see his givers (the Hearth).

| Decision | Status |
| --- | --- |
| Quests are read from the game state (flags, Offerings, hollowing): they start, tick off steps and end by themselves; an ending is kept for good. Defined in `content/data/quests.ts`. | Draft |
| The net-mender's hands starts on meeting Ebbe and ends when both nets are mended, or when he gives his memory (or, later, if he is hollowed). | Draft, from the design |
| **Weaves are taught by Ebbe** once his quest ends, either way: "a net is made before the fish comes". The Weaves button appears only then. | Decided by Daniel (taught by a person); Ebbe and the line are Claude's draft |
| The ice road is broken by a band of cracked ice, three tiles deep, across the whole lake, so it can't be walked around on the ice. Cracked ice breaks under Signe (a wound) unless strengthened. Villagers keep off it. | Draft |
| The quest starts when Torvald or the hermit tells Signe about the cracked ice, or when she goes through it. It ends when she crosses the band on foot: by strengthened ice, or by the hermit's route. Then the road is open again and drawn as road. | Draft |
| **The hermit's safe route** is a memory he gives as an Offering: one column through the band, east of the road, which Signe then sees marked. He offers it only after the nets quest is done ("do something for this village first"). | Draft |
| **Villagers can fall through Signe's trap ice**: they climb out hurt, remember it (their dialogue says so), and someone in her Hearth loses faith. | Decided by Daniel |
| Ebbe's memory of his wife teaches Mend: it's a memory of his knots. | Decided by Daniel |
| Old Gerda's hint about Maren's first burn stays as it is. | Decided by Daniel |
| The journal has three pages: Quests, Hearth (a pyramid of givers on Signe's own Power, plus anyone who lost faith and the Echoes she carries) and Keepsakes ("Your name" stays hidden). | Draft |
| The game fills the screen at a whole-pixel scale in either orientation; the short side shows about 270 game pixels. HUD buttons are at least 48 px tall on touch screens. | Daniel asked for it to fit the screen; the numbers are a draft |
| Tapping with a Craft action is forgiving: anywhere on an object's picture counts. Out of reach, Signe walks closer and then casts. | Draft, from Daniel's playtest |

## People moving and meeting

Daniel asked for people to move about near their spots, and for nearby people to walk over to each other, talk a little and part again.

| Decision | Status |
| --- | --- |
| Each person wanders within a few tiles of their spot (in `content/data/npcs.ts`): Lilja 5 tiles and only on the ice, Olle and the hermit 4, Ebbe 3, Gerda 2. Torvald stays at his fishing hole and the Hollow doesn't move. | Draft |
| Every 14–30 seconds, two people whose spots are near each other may meet: one walks over (whoever wanders further; Torvald is always visited, never leaves his hole), they say two or three lines in speech bubbles, then both go back. Pairs are in `content/data/meetings.ts`, lines in `content/ink/meetings.ink`. | Draft |
| Nobody walks into Signe or her next steps. Someone Signe is talking to, or walking over to, holds still. | Draft |
| Villagers can fall through Signe's trap ice: see "Quests, the journal and the cracked ice". | Decided by Daniel |
| Where people stand isn't saved: after a reload they're back at their spots. | Draft |
| Ebbe notices when Signe mends his nets, one rack or both. Once both are whole he no longer asks for help or offers his memory. Gerda's meeting with him mentions it too. | Draft (dialogue), from Daniel's playtest note |

## The Kallsjö map (step 1, rebuilt)

Daniel asked for a much bigger world with roads, mountains and forest, and for people to stand where their dialogue puts them. Decided by Daniel: 256 × 256 tiles, mountains as an impassable backdrop (flat ground, no climbing), Lilja on the ice by the jetty, layout drafted by Claude for approval. See [map-overview.svg](map-overview.svg).

| Decision | Status |
| --- | --- |
| The lake fills the middle of the valley (about 136 tiles across); birch forest rings it; mountains ring the forest. | Draft, from the design ("the lake is the centre of the map") |
| Signe's village sits on the near (south-west) shore, with her home, Old Gerda's house, Ebbe's hut and net racks, two boathouses, two more houses, a jetty with reeds, and Saint Maren's statue on the shore. | Draft |
| The ice road runs straight across the lake from the village to the far shore, marked with poles and spruce sprigs, and continues through a pass north. | Draft. The design doesn't say where the ice road leads. |
| A road leaves the village through a pass south: the way out of the valley. A shore track runs east around the lake to the hermit's hut on a headland. | Draft |
| Maren's ruined birth village is three ruined walls on an island in the lake, reachable over the ice. | Draft, from the design |
| Torvald fishes at a hole in the ice near the start of the ice road. Lilja plays on the ice at the end of the jetty. Ebbe stands at his net racks, Gerda by the statue near her house, Olle by his sled in the street, the Hollow at the boathouse door, the hermit outside his hut. | Torvald and Lilja decided by Daniel; the rest draft |
| A second hole of open water lies out on the lake, away from the road. | Draft |
| Only one of the design's "fishing villages" ringing the lake is built; the slice has one village. | Draft |

## Dialogue drafts (step 3)

All lines in `content/ink/` are Claude's first drafts. They stay within the design doc's facts, except for the details below, which are invented and need your call.

| Where | Invented detail | Why it's there |
| --- | --- | --- |
| Ebbe | He has mended nets for "forty winters". His memory of his wife: on the jetty, the first spring, laughing at his bad knots. | The design says he offers his last memory of his wife; it needed a concrete memory. |
| Old Gerda | Her grandmother says Maren loved her little brother, and that the winter Maren saved the lake she stopped knowing her mother's face. | Gerda is the slice's lore source. This hints at Maren's first burn (her mother's face, to save her brother) and contradicts Torvald's story. It may reveal too much too early. |
| Torvald | His story has "the saint, the starving lake, the miracle on the ice". | The design only calls it a garbled history of the predecessor. |
| Reeve Olle | He calls the Tithe "a share of what you know, for the Hearth at Kronvall" and says "Saint Maren carries all of us". If a village can't pay, "Kronvall decides". | Shows he believes in his duty without spoiling the end of chapter 1. |
| The hermit | He lives apart because "out here they forget to count" heads for the Tithe. | Gives him a reason to be alone. |
| Lilja | Signe's promise to take her across the ice once the road is safe. | A promise to exercise the promise system; chapter 5 tests promises. |
| The Hollow | Placed outside the boathouse door, since the boathouse has no interior yet. | Placeholder until step 7. |

## Dialogue system (step 3)

| Decision | Status |
| --- | --- |
| A line written `Name: text` is spoken by that person; anything else is narration. | Draft |
| Once "your name" is burned, nobody says "Signe" and her speaker label disappears. | Draft, from the design ("the game stops using your name") |
| Dialogue shows in an HTML box over the game, not in pixel text, so it stays readable on phones. | Draft |
| Each conversation starts fresh from GameState; "have we met" is a world flag (`met_ebbe`), never Ink state. | From CLAUDE.md |
| The game saves after every conversation, as well as whenever Signe stops walking. | Draft |
| Tap someone to walk beside them and talk; or stand beside them and press E, Space or Enter. | Draft |
