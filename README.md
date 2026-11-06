# Vidmark

*Working title.* A single-player, pixel-art isometric RPG where **magic is memory**. Every bit of power Signe gains costs someone a piece of who they are, and sometimes that someone is her.

**Play:** https://dlundin-private.github.io/vidmark/ (works on phones; turn the phone sideways)

This repo builds the **vertical slice**: one village by the frozen lake in Kallsjö, from Signe's awakening to the ice road. The full design is in [docs/design.md](docs/design.md).

## Status

Chapter 1 is playable from start to end. All 7 build steps are done: Kallsjö, a 256×256 valley with a frozen lake, birch forest, mountains, an ice road and Signe's village to walk around; the game state with save/load; conversations with everyone in the slice that react to what Signe has lost; and Craft magic: Strengthen, Weaken, Push and Mend, Weave crafting, training and resting; and the two ways to get Power from people, asking (Offerings) and taking (hollowing), plus burning Keepsakes; the one fight, starving wolves on the ice road; and a village that visibly changes with what Signe did. Next: playtesting. All art is placeholder, and all dialogue is a first draft.

| Step | What | Status |
| --- | --- | --- |
| 1 | Isometric map, movement and depth sorting | Done |
| 2 | Game state and save/load | Done |
| 3 | Ink dialogue wired to the game state | Done |
| 4 | Craft abilities, Power, Weave crafting and skill training | Done |
| 5 | Offering, hollowing and Keepsake burning | Done |
| 6 | Turn-based combat and the wolf fight | Done |
| 7 | Both quests, world changes and playtesting | Built; playtesting next |

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Walk to a tile | Click or tap it | |
| Talk to someone | Click or tap them | Stand beside them, press E, Space or Enter |
| Continue / choose | Tap the box / tap a choice | Space or Enter / number keys |
| Step one tile | | WASD or arrow keys (hold to keep walking) |
| Show blocked tiles | | C |
| Use Craft | Tap an action at the bottom, then tap what to work on | 1–4, then click; Esc cancels |
| Cast a saved Weave | Tap it at the bottom, then tap where | 5–9 |
| See or refocus Weaves (once Ebbe has taught you) | Weaves…, or tap your house | V |
| Quests, Hearth, Keepsakes | Journal | J |
| Rest (refill Power) | Tap Signe's home | |
| In a fight: move | Tap a tile up to 3 away (one action) | |
| In a fight: take everything from a wolf | Tap the wolf beside you | |
| In a fight: end your turn | End turn, at the top | |
| Debug panel | Gear button, top right | ` (backtick) |

Keys move along the isometric axes: W/↑ goes up-right, S/↓ down-left, A/← up-left and D/→ down-right.

The game saves in the browser whenever Signe stops walking or finishes a conversation, and picks up there next time.

To see dialogue react to loss, burn a Keepsake in the debug panel and talk to someone: burn *the swim* and Signe greets Lilja as a stranger; burn *the story* and Torvald's tale is new to her; burn *your name* and nobody says it.

## Craft

Signe holds Craft, the domain of made things. Each action costs Power (the dots, top left):

- **Strengthen** makes a thing or a patch of ice resilient.
- **Weaken** makes a thing brittle, or cracks the ice open.
- **Push** slides a crate or sled away from her: 1 Power per 2 tiles.
- **Mend** repairs what's broken: Ebbe's torn nets need Mend I, the stove-in boat Mend II.

In the Weave screen she combines an action, a target (object, one tile of ice, or a 3 × 3 area) and one modifier (Duration, Range, Size, Trigger) into a saved Weave, for example Weaken + surface + Trigger: ice that breaks under the next step. A Weave can be anchored in a memory, which makes it permanent and consumes the memory for good.

Power refills when she rests at home. Mend and Weaken grow surer with use on new things.

Signe can take three wounds. The third kills her, and the game goes back to the last time she rested at home: resting is also where she'll pick up again.

## Quests

Both slice quests are in, with their progress in the journal and a banner when one starts or ends:

- **The net-mender's hands** (Ebbe): mend his two torn net racks, or accept the memory he offers. Either way, he then teaches Signe to prepare Weaves.
- **The ice road**: a band of cracked ice cuts the road across the lake. Make it hold with Strengthen (an area Weave covers the road's width), or get the safe route from the hermit's memory; then cross. Or take everything from the hermit, route included.

Signe carries three Weaves at once; the rest she knows. Shaping new ones and changing which she carries happens by the fire at home.

The journal's **People** page holds what Signe remembers of everyone she has met: not what they said exactly, but what stayed with her. Each question can be asked once. Burning a Keepsake blurs the memories that rest on it, and carrying Echoes turns them cold.

The journal's **Hearth** page shows who has given Signe a memory, what they gave and the Power each adds, stacked like a pyramid on her own.

### Two more quests

- **The Hollow in the boathouse**: who was he, and what does the Tithe do when a village can't pay?
- **Maren's Winter**: play young Maren in Gerda's festival play at the statue.

## Asking and taking

- **Offerings** are hard to give and not a reward. Each giver has a reason: Ebbe because it's the only way to feed the village, the hermit once he trusts Signe (she has helped the village in a way he'd hear of), Old Gerda so her grandmother's Maren doesn't die with her (after the play), and Lilja so Signe will always remember her (once Signe knows the Tithe takes people). Torvald and Reeve Olle never offer. A giver no longer has what they gave.
- **Hollowing**: every conversation ends with *Take everything*, for anyone, family included. It always asks a second time. It gives +10 Power once, and everything they knew: their skill, the hermit's route, what Olle knows of the Tithe, Gerda's Maren. A Hollow stops moving and greys out, the village talks about it, and what is left of them, an **Echo**, speaks up inside Signe now and then.
- **The hunger**: once she has hollowed anyone, *Take everything* comes first in every conversation, each Echo makes a rest refill 1 less Power, and when she is low on Power an Echo points out who is close and full of memories.
- **Burning Keepsakes**: in the journal's Keepsakes page, or from the prompt when a cast needs more Power than she has. The confirmation only names what she gains.
- **Lilja's promise** can be kept once the ice road is open.

## The wolf fight

Cross the cracked ice anywhere except the hermit's safe route and starving wolves come out along the road on the far side. The fight is turn-based, on the same map:

- Signe gets two actions a turn: move up to three tiles, use Craft, or take everything from a wolf beside her.
- Red dots show where each wolf will run on its turn; a red square is where it will bite. Each bite is a wound, and three wounds is death.
- A wolf goes through ice Signe weakens under it, or through her armed trap ice on its run, and is gone. A crate or marker pushed into a wolf hits it; two hits and it runs. Once half the pack is down, the rest flee.
- Out of Power, she can burn a Keepsake or take everything from the wolf beside her (+2 Power, once, and a wordless Echo).
- There is no running away. A reload in the middle of the fight brings the pack back.

Crossing by the hermit's route avoids the wolves altogether.

## The village changes

- Mend Ebbe's nets (or take his memory) and his nets go out by Torvald's fishing hole.
- Play Maren's Winter and burnt-out torches stand at the statue.
- Once the hermit gives his route, he leaves his hut and sits by the village fire.
- When the ice road opens, fresh spruce markers line it across the cracked band, Lilja plays out on it and Reeve Olle walks it toward Kronvall.
- After the wolf fight, the hole where a wolf went through stays open, and tracks run north where the pack fled.
- Hollow someone while another villager is close by and they see it. Then the village knows: everyone says so, and nobody offers Signe a memory again.

## Chapter 2: Järnfors (being built)

After chapter 1, the road north leads to Järnfors: a builders' city in a gorge under Maren's Dam. Steps 1 and 2 of its build are done: travel, the district to walk and sketch, places with lore, and seven people to meet whose words follow what Signe did in Kallsjö. Kin, the quests, the dam crisis and the fight come next (docs/decisions.md). To jump straight there, use **Start chapter 2** in the debug panel.

## The beginning and the end

A new game opens with a short film that introduces Signe. Chapter 1 ends once the ice road is open and Signe rests at home: in the morning the Tithe has taken Lilja across it. A closing film tells how Signe got there (who gave, who she emptied, what she burned, the promise) and points north to chapter 2, Järnfors, which is drafted in `docs/chapter-2-jarnfors.md` but not built. The save keeps what chapter 1 decided.

## Sound

Every sound is synthesised in the browser. Sound starts muted; turn it on with the speaker button at the top right.

## The map

Signe sketches what she has seen into her journal whenever she stops. If she walks too long without stopping, the start of the way is lost. The journal's **Map** page shows her sketch and the places she has found: Maren's village on the island, an empty village on the west shore with a shelter to mend and rest in, a wrecked Tithe sled, the cairn at the pass north, and more.

## The village

People move about near their spots, and now and then two of them walk over to each other and talk for a moment (speech bubbles), then go back.

## Testing and tuning

The debug panel shows the game state (Power, wounds, Hearth, echoes, Keepsakes) and lets you poke it, save, load, start over, and copy or paste a save as JSON. Its **Tuning** section changes Power, burn and wound values live; changes stay in that browser and are highlighted. Copy values that feel right into [content/data/tuning.ts](content/data/tuning.ts), where every tuning value lives.

Open design choices and drafted content are listed in [docs/decisions.md](docs/decisions.md).

## Development

Needs Node.js 24.

```bash
npm install
npm run dev       # dev server with hot reload
npm test          # unit tests (Vitest)
npm run lint      # type check + ESLint
npm run build     # production build into dist/
```

Every push to `main` is tested, built and published to GitHub Pages by [.github/workflows/pages.yml](.github/workflows/pages.yml).

### Placeholder art and the map

The sprites in `assets/sprites/` and the map in `assets/maps/kallsjo.json` are generated:

```bash
npm run gen:art   # placeholder PNGs
npm run gen:map   # the 256x256 Kallsjö map, plus docs/map-overview.svg
```

[docs/map-overview.svg](docs/map-overview.svg) shows the whole layout with labels. The map is a normal Tiled JSON map, so once the layout is final it can be edited in [Tiled](https://www.mapeditor.org/) instead of regenerated. Real art can replace any sprite as long as it keeps the file name and size. An object sprite is exactly as wide as its footprint's diamond (`(w + h) × 16` px), with the footprint's front corner on the bottom edge.

## Tech

- [Phaser 3](https://phaser.io/) with strict TypeScript, built with [Vite](https://vite.dev/)
- Isometric [Tiled](https://www.mapeditor.org/) maps, 32×16 px tiles
- Fills any screen in either orientation at a whole number of device pixels per game pixel (the short side shows about 270 game pixels), so pixels stay sharp
- [Ink](https://www.inklestudios.com/ink/) dialogue via inkjs, bound to the game state
- Depth sorting by tile footprint, so characters walk correctly in front of and behind multi-tile buildings
- Only what's on screen is drawn and sorted, so the 256×256 map with 8,000 objects runs at full speed

## Layout

```
src/
  main.ts       Phaser config, boot and pixel-perfect scaling
  config.ts     resolution, tile size, walking speed
  scenes/       Boot and World scenes, dialogue box, debug panel
  iso/          tile <-> screen conversion, picking, depth sorting
  systems/      pathfinding, movement, Tiled maps, dialogue bridge, live tuning
  state/        GameState, actions, save/load
content/
  data/         tuning, Keepsakes, people
  ink/          dialogue in Ink, compiled at build time
assets/         maps and sprites
docs/           design doc
scripts/        placeholder art and map generators
```

Working with Claude Code? Start with [CLAUDE.md](CLAUDE.md): it holds the design pillars, vocabulary and architecture rules.
