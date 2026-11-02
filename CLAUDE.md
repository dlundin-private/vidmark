# CLAUDE.md — Vidmark (working title)

A single-player, pixel-perfect isometric RPG where **magic is memory**. Every bit of power costs someone a piece of who they are, possibly the protagonist. This repo currently builds the **vertical slice**: one village in Kallsjö, playable from Signe's awakening to the ice road.

The full design lives in `docs/design.md` (exported from the design doc). Read it before any design-related change. If code and design disagree, ask; don't silently pick one.

## Design pillars (never break these)

- **Magic is the moral core.** How Signe gains power (asking or taking) shapes the game. No karma meter, no "good/evil" UI.
- **Nothing is forced.** Every crisis has an alternative to hollowing, and every alternative costs something real. Failing is allowed and the game continues.
- **Consequences, not judgement.** The game never tells the player they were bad. They discover what they no longer have.
- **No fetch quests.** Every quest changes the world visibly, reveals lore, or both.
- **Fully dark, mature tone** on the hollowing path. Restrained presentation, no gore for its own sake.

## Vocabulary (use these exact terms in code and text)

| Term | Meaning |
| --- | --- |
| Domain | Kin (living), Craft (made), Thought (mind). One per person; new domains come only from people |
| Offering | Someone gives Signe a memory. Adds to her Hearth |
| Hollowing | Taking everything from someone. They become a Hollow |
| Hearth | The people who have offered to Signe; the source of her Power |
| Power | The magic resource spent on abilities and Weaves |
| Keepsake | One of Signe's six fixed memories; can be burned for Power or consumed into a Weave |
| Weave | A crafted spell: action + target + modifiers, optionally anchored in a memory |
| Echo | What remains of a hollowed person inside Signe |
| Keystone | A person holding a domain Signe lacks (not in the slice) |

Protagonist: **Signe**. Sister: **Lilja**. Father: **Torvald**. Slice NPCs: **Ebbe** (net-mender), **the hermit**, **Old Gerda**, **Reeve Olle** (Tithe-collector), **the Hollow** in the boathouse.

## Slice scope

- Starting domain is **Craft** only.
- Craft actions: Strengthen, Weaken, Push, Mend.
- Weave crafting: action + target + one modifier. Training for Mend and Weaken.
- Two quests: *The net-mender's hands* and *The ice road*. One avoidable fight: starving wolves on the ice road.
- Keepsakes: *the swim*, *the coat*, *the story* and *the shame* are in the journal and burnable; burning *the swim* makes Signe greet Lilja as a stranger. *Why you left* forms only at the end of chapter 1, so it can't be burned in the slice. *Your name* stays hidden until late in the full game; in the slice, the debug panel can reveal and burn it for testing. See `docs/decisions.md`.
- Out of scope: Kin, Thought, cross-domain Weaves, Keystones, other regions.

## Tech stack

- **Phaser 3** (latest 3.x) + **TypeScript** (strict), built with **Vite**.
- **Tiled** maps, isometric orientation, 32×16 px tiles, exported as JSON into `assets/maps/`.
- **Ink** (`inkjs`) for all dialogue. Stories in `content/ink/`, compiled to JSON at build time.
- Local saves only (JSON). No backend, no analytics, no external services.

## Architecture rules

- **One game state.** All persistent state (Keepsakes, Hearth, Power, wounds, NPC states, world flags, skills, saved Weaves) lives in a single typed `GameState` object in `src/state/`. Scenes read and change state only through functions in that module. Saving = serialising that object.
- **Data-driven content.** NPCs, quests, abilities, Weave parts and Keepsakes are defined in data files under `content/`, not hard-coded in scenes.
- **Ink reads state.** Ink variables and external functions are bound to `GameState` so dialogue can check Keepsakes, hollowed NPCs and promises. Dialogue never stores its own copy of state.
- **Grid first.** World positions are tile coordinates; screen positions are derived. One shared iso conversion module (`src/iso/`) used by movement, rendering, combat and picking.
- **Pixel-perfect.** `pixelArt: true`, `roundPixels: true`, integer zoom only, nearest-neighbour filtering, camera positions rounded to whole pixels.
- **Depth sorting** by tile position (and object footprint), never by manual depth numbers in scenes.

## Folder layout

```
src/
  main.ts          Phaser config and boot
  scenes/          Boot, World, Combat, UI overlays
  iso/             tile <-> screen conversion, picking, depth
  state/           GameState type, actions, save/load
  systems/         movement, pathfinding, magic, combat, dialogue bridge
content/
  ink/             dialogue sources
  data/            npcs, quests, abilities, weave parts, keepsakes (JSON/TS)
assets/
  maps/            Tiled maps (.tmx sources + .json exports)
  sprites/         pixel art (placeholders allowed)
docs/
  design.md        exported design doc
```

## How to work in this repo

- Build **one step of the build order at a time** (see `docs/design.md`, "Vertical slice: tech setup"). Don't start the next step unasked.
- Placeholder art is fine and expected: generate simple coloured iso tiles and shapes in code or as small PNGs. Keep placeholders replaceable by real art with the same file names and sizes.
- Write small unit tests (Vitest) for pure logic: iso conversion, pathfinding, state actions, Power costs, combat rules.
- Keep `npm run dev`, `npm run build`, `npm test` working after every change.
- Commit in small, described steps. Never commit generated build output.
- Numbers for Power, costs and wounds are tuning values: keep them in one config file (`content/data/tuning.ts`).
- When a design question comes up that the docs don't answer, stop and ask instead of inventing lore or rules.
