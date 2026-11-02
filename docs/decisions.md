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
