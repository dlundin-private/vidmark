# Decisions and drafts

Choices the design doc ([design.md](design.md)) doesn't make. Each one is marked by who decided it. **Draft** means Claude proposed it and it stands until Daniel changes it. Newest first within each section.

## Rules

| Decision | Status | Where |
| --- | --- | --- |
| "Why you left" exists from the start but can only be burned or used after it forms at the end of chapter 1. In the slice it never forms, so it can't be burned there. | Decided by Daniel, 2026-11-02 | `content/data/keepsakes.ts` (`formedLater`) |
| "Your name" is hidden in the journal until late in the game. | Open, see below | `content/data/keepsakes.ts` (`hiddenUntilLate`) |
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
