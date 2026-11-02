# Vidmark

*Working title.* A single-player, pixel-art isometric RPG where **magic is memory**. Every bit of power Signe gains costs someone a piece of who they are, and sometimes that someone is her.

**Play:** https://dlundin-private.github.io/vidmark/ (works on phones; turn the phone sideways)

This repo builds the **vertical slice**: one village by the frozen lake in Kallsjö, from Signe's awakening to the ice road. The full design is in [docs/design.md](docs/design.md).

## Status

Build steps 1–3 of 7 are done: an isometric test map Signe can walk around, the game state with save/load, and conversations with everyone in the slice that react to what Signe has lost. There's no magic or combat to play yet. All art is placeholder, and all dialogue is a first draft.

| Step | What | Status |
| --- | --- | --- |
| 1 | Isometric map, movement and depth sorting | Done |
| 2 | Game state and save/load | Done |
| 3 | Ink dialogue wired to the game state | Done |
| 4 | Craft abilities, Power, Weave crafting and skill training | Next |
| 5 | Offering, hollowing and Keepsake burning | |
| 6 | Turn-based combat and the wolf fight | |
| 7 | Both quests, world changes and playtesting | |

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Walk to a tile | Click or tap it | |
| Talk to someone | Click or tap them | Stand beside them, press E, Space or Enter |
| Continue / choose | Tap the box / tap a choice | Space or Enter / number keys |
| Step one tile | | WASD or arrow keys (hold to keep walking) |
| Show blocked tiles | | C |
| Debug panel | Gear button, top right | ` (backtick) |

Keys move along the isometric axes: W/↑ goes up-right, S/↓ down-left, A/← up-left and D/→ down-right.

The game saves in the browser whenever Signe stops walking or finishes a conversation, and picks up there next time.

To see dialogue react to loss, burn a Keepsake in the debug panel and talk to someone: burn *the swim* and Signe greets Lilja as a stranger; burn *the story* and Torvald's tale is new to her; burn *your name* and nobody says it.

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

### Placeholder art and the test map

The sprites in `assets/sprites/` and the map in `assets/maps/test-map.json` are generated:

```bash
npm run gen:art   # placeholder PNGs
npm run gen:map   # 24x24 isometric Tiled map
```

The map is a normal Tiled JSON map, so it can be edited in [Tiled](https://www.mapeditor.org/) from here on. Real art can replace any sprite as long as it keeps the file name and size. An object sprite is exactly as wide as its footprint's diamond (`(w + h) × 16` px), with the footprint's front corner on the bottom edge.

## Tech

- [Phaser 3](https://phaser.io/) with strict TypeScript, built with [Vite](https://vite.dev/)
- Isometric [Tiled](https://www.mapeditor.org/) maps, 32×16 px tiles
- Fixed 480×270 resolution, scaled by whole device pixels only so pixels stay sharp on any screen
- [Ink](https://www.inklestudios.com/ink/) dialogue via inkjs, bound to the game state
- Depth sorting by tile footprint, so characters walk correctly in front of and behind multi-tile buildings

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
scripts/        placeholder art and test map generators
```

Working with Claude Code? Start with [CLAUDE.md](CLAUDE.md): it holds the design pillars, vocabulary and architecture rules.
