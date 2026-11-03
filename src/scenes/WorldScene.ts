import Phaser from 'phaser';
import {
  BUBBLE_MS_PER_LINE,
  MEETING_INTERVAL_MS,
  MEETING_MAX_DISTANCE,
  PERSON_IDLE_MS,
  PERSON_WALK_MS_PER_TILE,
  TILE_HEIGHT,
  TILE_WIDTH,
  WALK_MS_PER_TILE,
  WALK_STEPS_PER_TILE,
  WORLD_TOP_MARGIN,
} from '../config';
import { MEETINGS } from '../../content/data/meetings';
import { NPCS } from '../../content/data/npcs';
import { ACTIONS, CRAFTABLES } from '../../content/data/craft';
import type { NpcId } from '../../content/data/npcs';
import { PeopleSim } from '../systems/people';
import { DeathScreen, SpeechBubbles } from './Overlays';
import { IsoProjection, depthOrder, rectsOverlap, roundPoint, tilesInView, type Footprint, type Rect, type Tile } from '../iso';
import { TileWalker } from '../systems/movement';
import { findPath, type WalkGrid } from '../systems/pathfinding';
import { parseTiledMap, type MapObject, type TiledJson } from '../systems/tiledMap';
import { FLAG_KNOWS_SAFE_ROUTE, WorldModel } from '../systems/world';
import { cast, planCast, plainSpell, stepOnto, weaveSpell, type Aim, type Spell } from '../systems/craft';
import { ambientDialogue, dialogueBox, store, tuning } from '../game';
import { isBeside, pathToBeside } from '../systems/interaction';
import * as A from '../state/actions';
import { CraftHud, WEAVES_TAUGHT_FLAG, type Selection } from './CraftHud';
import { Journal } from './Journal';
import { questsWouldChange, updateQuests } from '../systems/quests';
import { personStepsOnto, wouldBreakUnderPerson, wouldBreakUnderSigne } from '../systems/craft';
import { WeaveScreen } from './WeaveScreen';
import { TILESET_KEY } from './BootScene';
import mapJson from '../../assets/maps/kallsjo.json';

const SIGNE_SPRITE = 'signe';
const MARKER_SPRITE = 'marker';
/** Tileset frame drawn by the collision debug overlay (the "blocked" tile). */
const BLOCKED_FRAME = 7;
/** Extra world pixels around the camera view that are drawn too, so edges never pop in. */
const VIEW_MARGIN = 64;
/** Tints for objects under a Craft effect. */
const TINT = { strengthened: 0xcfe6ff, weakened: 0xe0b0a8 } as const;

/** Something drawn in the entity layer and depth-sorted by its footprint. */
interface Sortable {
  sprite: Phaser.GameObjects.Image;
  footprint: () => Footprint;
  /** The map object it draws; null for Signe. */
  obj: MapObject | null;
  /** World rectangle of the sprite, for culling; null for Signe, who is always drawn. */
  bounds: Rect | null;
}

type DirectionKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key[]>;

/** Someone Signe can talk to. Where they stand comes from the PeopleSim. */
interface Person {
  id: NpcId;
  obj: MapObject;
  sprite: Phaser.GameObjects.Image;
}

// Keys walk along the iso axes: up/down move on the y axis (up-right / down-left on
// screen), left/right on the x axis (up-left / down-right).
const DIRECTIONS: Record<keyof DirectionKeys, Tile> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// The HUD and Weave screen are page-wide; they talk to whichever World scene is running.
let activeScene: WorldScene | null = null;
const weaveScreen = new WeaveScreen(store, () => activeScene?.isAtHome() ?? false);
const journal = new Journal(store);
const hud = new CraftHud({
  onSelect: (s) => activeScene?.onSelect(s),
  onOpenWeaves: () => weaveScreen.open(),
  onOpenJournal: () => journal.open(),
});
/** Overlays that pause the world while open. */
const menuOpen = () => dialogueBox.isOpen || weaveScreen.isOpen || journal.isOpen || deathScreen.isOpen;
const bubbles = new SpeechBubbles(BUBBLE_MS_PER_LINE);
const deathScreen = new DeathScreen();
const NPC_BY_NAME = new Map(NPCS.map((n) => [n.name, n.id]));

export class WorldScene extends Phaser.Scene {
  private world!: WorldModel;
  private worldVersion = 0;
  /** Route planning: like the world, but steering around Signe's own armed traps. */
  private routing!: WalkGrid;
  private proj!: IsoProjection;
  private walker!: TileWalker;
  private signe!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.Blitter;
  private collisionOverlay!: Phaser.GameObjects.Blitter;
  private fxStrengthened!: Phaser.GameObjects.Blitter;
  private fxArmed!: Phaser.GameObjects.Blitter;
  private fxTarget!: Phaser.GameObjects.Blitter;
  private fxRoute!: Phaser.GameObjects.Blitter;
  private entityLayer!: Phaser.GameObjects.Layer;
  private sortables: Sortable[] = [];
  private sortableById = new Map<number, Sortable>();
  /** The sortables currently on (or near) screen; only these are drawn and depth-sorted. */
  private onScreen: Sortable[] = [];
  /** Objects whose look currently differs from the map (broken, moved, under an effect). */
  private changedIds = new Set<number>();
  private lastViewKey = '';
  private lastSortKey = '';
  private keys!: DirectionKeys;
  /** Last direction tapped, kept until used: a tap can go down and up within one frame. */
  private tapped: keyof DirectionKeys | null = null;
  private people: Person[] = [];
  private home: MapObject | null = null;
  private sim!: PeopleSim;
  /** Who Signe is talking with; they hold still. */
  private talkingWith: NpcId | null = null;
  /** Who or what Signe is walking over to (to talk, or to rest at home). */
  private pendingVisit: { target: () => Footprint; arrive: () => void; who: NpcId | null; onTile?: boolean } | null = null;
  /** The spell chosen in the HUD, waiting for a target. */
  private spell: Spell | null = null;
  /** Push: the object chosen, waiting for where it should stop. */
  private pushing: MapObject | null = null;

  constructor() {
    super('World');
  }

  create(): void {
    // create() runs again on every restart of this same scene object.
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the page-wide HUD needs the running scene
    activeScene = this;
    this.sortables = [];
    this.sortableById = new Map();
    this.onScreen = [];
    this.changedIds = new Set();
    this.lastViewKey = '';
    this.lastSortKey = '';
    this.tapped = null;
    this.people = [];
    this.talkingWith = null;
    this.pendingVisit = null;
    bubbles.clear();
    this.spell = null;
    this.pushing = null;
    hud.select(null);

    const map = parseTiledMap(mapJson as TiledJson);
    this.world = new WorldModel(map, () => store.state, () => this.worldVersion);
    this.routing = { width: map.width, height: map.height, isBlocked: (x, y) => this.world.isBlockedForRouting(x, y) };
    this.proj = IsoProjection.forMap(map.height, TILE_WIDTH, TILE_HEIGHT, WORLD_TOP_MARGIN);
    const size = this.proj.worldSize(map.width, map.height);

    // Draw order between layers is fixed; inside the entity layer it comes from the footprints.
    const groundLayer = this.add.layer();
    const overlayLayer = this.add.layer();
    this.entityLayer = this.add.layer();

    // Ground and overlays are blitted for the visible area only (see refreshView).
    this.ground = this.add.blitter(0, 0, TILESET_KEY);
    groundLayer.add(this.ground);
    this.fxStrengthened = this.add.blitter(0, 0, 'fx-strengthened');
    this.fxArmed = this.add.blitter(0, 0, 'fx-armed');
    this.fxTarget = this.add.blitter(0, 0, 'fx-target');
    this.fxRoute = this.add.blitter(0, 0, 'fx-route');
    this.collisionOverlay = this.add.blitter(0, 0, TILESET_KEY).setVisible(false);
    overlayLayer.add([this.fxStrengthened, this.fxArmed, this.fxRoute, this.fxTarget, this.collisionOverlay]);

    this.marker = this.add.image(0, 0, MARKER_SPRITE).setOrigin(0.5, 0).setVisible(false);
    overlayLayer.add(this.marker);

    for (const obj of map.objects) {
      const fp = obj.footprint;
      const origin = IsoProjection.footprintOrigin(fp);
      const sprite = this.add.image(0, 0, obj.sprite).setOrigin(origin.x, origin.y).setVisible(false);
      const expectedWidth = (fp.w + fp.h) * this.proj.halfW;
      if (sprite.width !== expectedWidth) {
        console.warn(`Sprite "${obj.sprite}" is ${sprite.width}px wide; a ${fp.w}x${fp.h} footprint needs ${expectedWidth}px`);
      }
      this.entityLayer.add(sprite);
      const npc = obj.npc as NpcId | null;
      // People move, so they are always sorted and their footprint comes from the simulation.
      const sortable: Sortable = npc
        ? { sprite, obj, footprint: () => this.sim.footprintOf(npc), bounds: null }
        : { sprite, obj, footprint: () => this.world.footprintOf(obj), bounds: null };
      this.sortables.push(sortable);
      this.sortableById.set(obj.id, sortable);
      if (!npc) this.applyLook(sortable);
      if (npc) this.people.push({ id: npc, obj, sprite });
      if (obj.rest) this.home = obj;
    }
    this.syncObjects();
    this.sim = new PeopleSim(
      {
        width: map.width,
        height: map.height,
        isBlocked: (x, y) => this.world.isBlockedForPeople(x, y),
        isIce: (x, y) => this.world.isIce(x, y) && !this.world.isThinIce(x, y),
        stepping: (id, _from, to) => this.personStepping(id, to),
        placePerson: (id, tile) => {
          const p = this.people.find((q) => q.id === id);
          if (p) this.world.placeDynamic(p.obj.id, tile);
        },
      },
      this.people.map((p) => {
        const def = NPCS.find((n) => n.id === p.id)!;
        return { id: p.id, home: { x: p.obj.footprint.x, y: p.obj.footprint.y }, radius: def.wander.radius, onIce: def.wander.onIce ?? false };
      }),
      MEETINGS,
      {
        msPerTile: PERSON_WALK_MS_PER_TILE,
        stepsPerTile: WALK_STEPS_PER_TILE,
        idleMs: PERSON_IDLE_MS,
        meetingIntervalMs: MEETING_INTERVAL_MS,
        meetingMaxDistance: MEETING_MAX_DISTANCE,
      },
    );

    const saved = store.state.position;
    const start = saved && !this.world.isBlocked(saved.x, saved.y) ? saved : map.spawn;
    this.walker = new TileWalker(start, WALK_MS_PER_TILE, WALK_STEPS_PER_TILE);
    this.signe = this.add.image(0, 0, SIGNE_SPRITE).setOrigin(0.5, 1);
    this.entityLayer.add(this.signe);
    this.sortables.push({ sprite: this.signe, obj: null, footprint: () => this.walker.footprint, bounds: null });
    this.placeSigne();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, size.width, size.height);
    cam.setRoundPixels(true);
    cam.startFollow(this.signe, true);

    // The game fills the window; a rotation or resize changes how much world the camera shows.
    const onResize = (size: Phaser.Structs.Size) => {
      this.cameras.resize(size.width, size.height);
      this.lastViewKey = "";
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.keys = this.createKeys();
    this.input.keyboard?.on('keydown-C', () => {
      this.collisionOverlay.setVisible(!this.collisionOverlay.visible);
      this.lastViewKey = '';
    });
    for (const key of ['keydown-E', 'keydown-SPACE', 'keydown-ENTER']) {
      this.input.keyboard?.on(key, () => this.talkToSomeoneBeside());
    }

    // A new game or a loaded save replaces the whole state: rebuild the scene from it.
    // Any other change (Craft, rest, the debug panel) updates the world in place.
    const generation = store.generation;
    const unsubscribe = store.subscribe(() => {
      if (store.generation !== generation) return this.scene.restart();
      this.worldVersion++;
      if (A.hasFallen(store.state, tuning.values) && !deathScreen.isOpen) this.die();
      this.checkQuests();
      this.syncObjects();
      this.lastViewKey = '';
      hud.render(store.state, tuning.values);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      if (activeScene === this) activeScene = null;
    });
    hud.render(store.state, tuning.values);
    if (A.hasFallen(store.state, tuning.values)) this.die();

    // How many nets are torn is a fact of the map; quests and dialogue count against it.
    const racks = map.objects.filter((o) => o.type === 'net-rack' && o.broken).length;
    if (store.state.flags.nets_total !== racks) store.update((s) => A.setFlag(s, 'nets_total', racks));
    this.checkQuests();
  }

  private checkingQuests = false;

  /** Quests start and end from what happens in the world; announce each change. */
  private checkQuests(): void {
    if (this.checkingQuests || !questsWouldChange(store.state)) return; // updateQuests changes the store, which calls us again
    this.checkingQuests = true;
    try {
      const events = store.update(updateQuests);
      for (const e of events) hud.announce(e.kind === 'started' ? `New quest: ${e.quest.title}` : `Quest done: ${e.quest.title}`, e.text);
      if (events.length > 0) store.save();
    } finally {
      this.checkingQuests = false;
    }
  }

  /** A villager steps onto a tile: Signe's trap ice catches them. */
  private personStepping(id: NpcId, to: Tile): boolean {
    if (!wouldBreakUnderPerson(this.world, to)) return false; // the common case: no state change, no redraw
    const through = store.update((s, t) => personStepsOnto(this.world, s, t, id, to));
    if (through) {
      const name = NPCS.find((n) => n.id === id)!.name;
      bubbles.play([{ who: id, text: 'The ice! Help, the ice—' }]);
      hud.say(`${name} went through the ice and dragged themself out, soaked and bleeding.`, 6000);
      store.save();
    }
    return through;
  }

  update(_time: number, delta: number): void {
    const busy = menuOpen();
    hud.setVisible(!dialogueBox.isOpen && !deathScreen.isOpen && !journal.isOpen);
    if (!busy) this.handleKeys();
    this.updatePeople(delta);
    const before = this.walker.tile;
    const entered = this.walker.update(delta);
    if (entered.length > 0) this.onEntered(before, entered);
    if (!this.walker.isMoving) {
      this.marker.setVisible(false);
      if (entered.length > 0) this.autosave();
      const visit = this.pendingVisit;
      this.pendingVisit = null;
      const t = this.walker.tile;
      const there = visit && (visit.onTile ? onFootprint(t, visit.target()) : isBesideFootprint(t, visit.target()));
      if (visit && there) visit.arrive();
    }
    this.placeSigne();
    this.refreshView();
    this.sortDepth();
  }

  /** Beside her house: where she rests, shapes Weaves and refocuses. */
  isAtHome(): boolean {
    return !!this.home && !this.walker.isMoving && isBesideFootprint(this.walker.tile, this.world.footprintOf(this.home));
  }

  // --- Craft ------------------------------------------------------------------

  /** The HUD picked an action or Weave (or cleared it). */
  onSelect(selection: Selection | null): void {
    this.pushing = null;
    this.pendingVisit = null;
    this.spell = selection ? this.spellFor(selection) : null;
    if (this.spell) {
      this.pendingVisit = null;
      const what = selection?.kind === 'action' ? ACTIONS.find((a) => a.id === selection.action)!.description : 'Your Weave is ready.';
      hud.say(`${what} Tap where to use it. Tap the button again to cancel.`, 0);
    } else {
      hud.say('', 1);
    }
    this.lastViewKey = '';
  }

  private spellFor(selection: Selection): Spell | null {
    if (selection.kind === 'action') return plainSpell(selection.action, 'object');
    const w = store.state.weaves.find((x) => x.id === selection.id);
    return w ? weaveSpell(w) : null;
  }

  /** A tap while a spell is chosen: aim it, check it, and cast it. */
  private aimAt(worldX: number, worldY: number): void {
    const spell = this.spell!;
    const tile = this.proj.pick({ x: worldX, y: worldY });
    const signe = this.walker.planningTile;
    const t = tuning.values;
    let plan;

    if (this.pushing) {
      plan = planCast(this.world, store.state, t, spell, { kind: 'object', id: this.pushing.id }, signe, tile);
    } else {
      const object = this.craftableAt(worldX, worldY, tile);
      // A plain Strengthen or Weaken works on whatever was tapped: an object, or the ice.
      let s = spell;
      if (spell.modifier === null && spell.target === 'object' && !object && (spell.action === 'strengthen' || spell.action === 'weaken')) {
        s = { ...spell, target: 'surface' };
      }
      const aim: Aim = s.target === 'object' && object ? { kind: 'object', id: object.id } : { kind: 'tile', x: tile.x, y: tile.y };
      plan = planCast(this.world, store.state, t, s, aim, signe);
      if (plan.ok && s.action === 'push') {
        this.pushing = plan.object!;
        hud.say(`Push the ${plan.object!.type.replace(/-/g, ' ')}: tap where it should stop. 1 Power per ${t.pushTilesPerPower} tiles.`, 0);
        return;
      }
    }

    if (!plan.ok && plan.code === 'range' && !this.pushing) return this.walkIntoReach(worldX, worldY, tile, reach(spell));
    if (!plan.ok) {
      hud.say(plan.reason);
      return;
    }
    if (A.availablePower(store.state) < plan.cost) {
      hud.say(`That needs ${plan.cost} Power. You have ${A.availablePower(store.state)}.`);
      return;
    }
    const done = plan;
    const message = store.update((s, tt) => cast(this.world, s, tt, done));
    store.save();
    hud.select(null); // clears the "tap what to work on" prompt, so say the result after
    hud.say(`${message} (−${plan.cost} Power)`);
  }

  /**
   * The craftable object under a tap. Forgiving, for fingers: an opaque pixel
   * first, then anywhere inside an object's picture (a net rack is mostly
   * gaps), then whatever stands on the tapped tile.
   */
  private craftableAt(x: number, y: number, tile: Tile): MapObject | undefined {
    const craftable = (s: Sortable) => !!s.obj && s.obj.type in CRAFTABLES;
    const hit = this.spriteAt(x, y, craftable);
    if (hit) return hit;
    const inside = this.onScreen.filter((s) => craftable(s) && s.bounds && x >= s.bounds.x && x < s.bounds.x + s.bounds.width && y >= s.bounds.y && y < s.bounds.y + s.bounds.height);
    inside.sort((a, b) => b.sprite.depth - a.sprite.depth);
    if (inside[0]?.obj) return inside[0].obj;
    const onTile = this.world.objectAt(tile.x, tile.y);
    return onTile && onTile.type in CRAFTABLES ? onTile : undefined;
  }

  /** Out of reach: walk until the target is within reach, then cast. */
  private walkIntoReach(worldX: number, worldY: number, tile: Tile, distance: number): void {
    const object = this.spell?.target === 'object' || this.spell?.modifier === null ? this.craftableAt(worldX, worldY, tile) : undefined;
    const goal: Footprint = object ? this.world.footprintOf(object) : { x: tile.x, y: tile.y, w: 1, h: 1 };
    const path = besidePath(this.routing, this.walker.planningTile, goal);
    if (!path || path.length === 0) {
      hud.say('Too far away, and there is no way closer.');
      return;
    }
    // Stop at the first tile from which the target is within reach.
    const near = (t: Tile) => {
      const dx = t.x < goal.x ? goal.x - t.x : t.x >= goal.x + goal.w ? t.x - (goal.x + goal.w - 1) : 0;
      const dy = t.y < goal.y ? goal.y - t.y : t.y >= goal.y + goal.h ? t.y - (goal.y + goal.h - 1) : 0;
      return dx + dy <= distance;
    };
    const stop = path.findIndex(near);
    const route = stop >= 0 ? path.slice(0, stop + 1) : path;
    this.walker.setPath(route);
    const end = route.at(-1)!;
    this.pendingVisit = { target: () => ({ x: end.x, y: end.y, w: 1, h: 1 }), arrive: () => this.spell && this.aimAt(worldX, worldY), who: null, onTile: true };
    hud.say('Walking closer…', 1500);
  }

  /** Signe moved onto new tiles: her own armed ice gives way under her. */
  private onEntered(before: Tile, entered: Tile[]): void {
    let previous = before;
    for (const tile of entered) {
      this.noteCrossing(previous, tile);
      const through = wouldBreakUnderSigne(this.world, tile) && store.update((s, t) => stepOnto(this.world, s, t, tile));
      if (through) {
        this.walker.teleport(previous);
        if (deathScreen.isOpen) return;
        hud.say(this.world.isThinIce(tile.x, tile.y) || this.world.band && tile.y >= this.world.band.y0 && tile.y <= this.world.band.y1
          ? 'The cracked ice gives way. You haul yourself out, soaked and cut. It will need to be made to hold, or crossed where it is thick.'
          : 'The ice gives way. You haul yourself out, soaked and cut.');
        this.autosave();
        return;
      }
      previous = tile;
    }
  }

  /** Stepping off the cracked-ice band on the far side means Signe crossed it (the ice road quest). */
  private noteCrossing(from: Tile, to: Tile): void {
    const band = this.world.band;
    if (!band || store.state.flags.crossed_cracked_ice) return;
    const northward = from.y === band.y0 && to.y === band.y0 - 1;
    const southward = from.y === band.y1 && to.y === band.y1 + 1;
    if ((northward || southward) && this.world.isIce(to.x, to.y)) {
      store.update((s) => A.setFlag(s, 'crossed_cracked_ice', true));
    }
  }

  /**
   * The last wound: Signe dies, and the game goes back to her last rest at
   * home (decided by Daniel), told as a memory she had wrong.
   */
  private die(): void {
    this.walker.setPath([]);
    this.pendingVisit = null;
    hud.select(null);
    const lines = ambientDialogue.linesOf('death').map((l) => l.text);
    deathScreen.show(lines, () => store.returnToLastRest());
  }

  // --- People ---------------------------------------------------------------------

  private updatePeople(delta: number): void {
    const frozen = new Set<NpcId>();
    if (this.talkingWith) frozen.add(this.talkingWith);
    if (this.pendingVisit?.who) frozen.add(this.pendingVisit.who);
    this.sim.update(delta, {
      signe: this.walker.planningTile,
      signeRoute: this.walker.route,
      frozen,
      meet: (m) => {
        const lines = ambientDialogue.linesOf(m.knot);
        if (lines.length === 0) return 0;
        return bubbles.play(lines.map((l) => ({ who: NPC_BY_NAME.get(l.speaker ?? '') ?? m.a, text: l.text })));
      },
    });
    for (const p of this.people) {
      const v = this.sim.visualOf(p.id);
      const at = roundPoint(this.proj.footprintBottom({ x: v.x, y: v.y, w: 1, h: 1 }));
      p.sprite.setPosition(at.x, at.y);
    }
    bubbles.update(delta, (who) => this.screenPointAbove(who), menuOpen());
  }

  /** CSS-pixel point just above someone's head, or null if they are off screen. */
  private screenPointAbove(who: string): { x: number; y: number } | null {
    const p = this.people.find((q) => q.id === who);
    if (!p) return null;
    const cam = this.cameras.main;
    const wx = p.sprite.x;
    const wy = p.sprite.y - p.sprite.height + 6;
    const v = cam.worldView;
    if (wx < v.x || wx > v.x + v.width || wy < v.y - 20 || wy > v.y + v.height) return null;
    const rect = this.game.canvas.getBoundingClientRect();
    const k = rect.width / cam.width;
    return { x: rect.left + (wx - v.x) * k, y: rect.top + (wy - v.y) * k };
  }

  private offerRest(): void {
    const weavesTaught = !!store.state.flags[WEAVES_TAUGHT_FLAG];
    hud.ask('Rest at home? Power refills, a wound heals, and Craft effects fade.', [
      ...(weavesTaught ? [{ label: 'Refocus Weaves', run: () => weaveScreen.open() }] : []),
      {
        label: 'Rest',
        run: () => {
          store.update(A.restAtHome);
          this.autosave();
          store.saveRestPoint(); // where death returns to
          hud.say('You rest by the fire. Power restored. You will remember this.');
        },
      },
      { label: 'Not now', run: () => undefined },
    ]);
  }

  /** Updates the sprites of objects that changed: broken or mended, moved, strengthened or weakened. */
  private syncObjects(): void {
    const now = new Set(Object.keys(store.state.world.objects).map(Number));
    for (const id of new Set([...now, ...this.changedIds])) {
      const s = this.sortableById.get(id);
      if (s) this.applyLook(s);
    }
    this.changedIds = now;
  }

  /** Texture (whole or broken), tint (Craft effect) and position of one object. */
  private applyLook(s: Sortable): void {
    if (!s.obj) return;
    const whole = s.obj.sprite.replace(/-broken$/, '');
    const broken = `${whole}-broken`;
    const key = this.world.isBroken(s.obj) && this.textures.exists(broken) ? broken : whole;
    if (s.sprite.texture.key !== key) s.sprite.setTexture(key);
    const effect = this.world.objectEffect(s.obj);
    if (effect) s.sprite.setTint(TINT[effect.kind]);
    else s.sprite.clearTint();
    this.placeObject(s);
  }

  /** Anchors an object's sprite on its (possibly pushed) footprint. */
  private placeObject(s: Sortable): void {
    const p = this.proj.footprintBottom(s.footprint());
    s.sprite.setPosition(p.x, p.y);
    const b = s.sprite.getBounds();
    s.bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  // --- Drawing ------------------------------------------------------------------

  /**
   * Draws the ground, Craft overlays and the objects around the camera;
   * everything else stays hidden. Runs when the camera has moved far enough
   * to matter, or the world changed.
   */
  private refreshView(): void {
    const cam = this.cameras.main;
    cam.preRender(); // make worldView match this frame's follow position
    const v = cam.worldView;
    const signe = this.walker.tile;
    const key = `${Math.floor(v.x / VIEW_MARGIN)},${Math.floor(v.y / VIEW_MARGIN)},${v.width},${v.height},${this.collisionOverlay.visible},${signe.x},${signe.y}`;
    if (key === this.lastViewKey) return;
    this.lastViewKey = key;

    // The margin is at least one key step, so the area drawn always covers the real view.
    const view: Rect = { x: v.x - VIEW_MARGIN, y: v.y - VIEW_MARGIN, width: v.width + 2 * VIEW_MARGIN, height: v.height + 2 * VIEW_MARGIN };
    for (const b of [this.ground, this.collisionOverlay, this.fxStrengthened, this.fxArmed, this.fxRoute, this.fxTarget]) b.clear();
    const knowsRoute = !!store.state.flags[FLAG_KNOWS_SAFE_ROUTE];
    const reach = this.spell ? (this.spell.modifier === 'range' ? tuning.values.craftRangeExtended : tuning.values.craftRange) : -1;
    for (const t of tilesInView(this.proj, view, this.world.width, this.world.height)) {
      const top = this.proj.toWorld(t.x, t.y);
      const x = top.x - this.proj.halfW;
      const frame = this.world.groundFrame(t.x, t.y);
      if (frame >= 0) this.ground.create(x, top.y, frame);
      const effect = this.world.tileEffect(t.x, t.y);
      if (effect?.kind === 'strengthened') this.fxStrengthened.create(x, top.y);
      if (effect?.armed) this.fxArmed.create(x, top.y);
      if (knowsRoute && this.world.isSafeRoute(t.x, t.y)) this.fxRoute.create(x, top.y);
      if (reach >= 0 && Math.abs(t.x - signe.x) + Math.abs(t.y - signe.y) <= reach) this.fxTarget.create(x, top.y);
      if (this.collisionOverlay.visible && this.world.isBlocked(t.x, t.y)) this.collisionOverlay.create(x, top.y, BLOCKED_FRAME);
    }

    for (const s of this.onScreen) s.sprite.setVisible(false);
    this.onScreen = this.sortables.filter((s) => !s.bounds || rectsOverlap(s.bounds, view));
    for (const s of this.onScreen) s.sprite.setVisible(true);
    this.lastSortKey = '';
  }

  /** Re-sorts what's on screen when the set changed, or Signe or anyone else moved. */
  private sortDepth(): void {
    const key = [this.walker.footprint, ...this.people.map((p) => this.sim.footprintOf(p.id))]
      .map((f) => `${f.x},${f.y},${f.w},${f.h}`)
      .join('|');
    if (key === this.lastSortKey) return;
    this.lastSortKey = key;
    const footprints = this.onScreen.map((s) => s.footprint());
    depthOrder(footprints).forEach((index, rank) => this.onScreen[index]!.sprite.setDepth(rank));
  }

  /** Puts Signe's feet on her (interpolated) tile, on whole pixels. */
  private placeSigne(): void {
    const v = this.walker.visual;
    const p = roundPoint(this.proj.footprintBottom({ x: v.x, y: v.y, w: 1, h: 1 }));
    this.signe.setPosition(p.x, p.y);
  }

  // --- Walking and talking --------------------------------------------------------

  /** Saves whenever Signe comes to a stop. */
  private autosave(): void {
    store.update((s) => A.setPosition(s, this.walker.tile));
    store.save();
  }

  private talkTo(who: Person): void {
    this.tapped = null;
    this.talkingWith = who.id;
    const knewBefore = store.state.impressions[who.id]?.length ?? 0;
    dialogueBox.open(who.id, () => {
      this.tapped = null;
      this.talkingWith = null;
      if ((store.state.impressions[who.id]?.length ?? 0) > knewBefore) {
        const name = NPCS.find((n) => n.id === who.id)!.name;
        hud.say(`You'll remember this about ${name}. (Journal: People)`, 3500);
      }
      // Conversations change the game (Offerings, promises, flags): keep them.
      this.autosave();
    });
  }

  private talkToSomeoneBeside(): void {
    if (menuOpen() || this.walker.isMoving) return;
    const who = this.people.find((p) => isBeside(this.walker.tile, this.sim.tileOf(p.id)));
    if (who) this.talkTo(who);
  }

  /** The sprite drawn under a world point, frontmost first, ignoring transparent pixels. */
  private spriteAt(x: number, y: number, accept: (s: Sortable) => boolean): MapObject | undefined {
    const hits = this.onScreen.filter((s) => {
      if (!s.obj || !accept(s)) return false;
      const { sprite } = s;
      const px = Math.floor(x - (sprite.x - sprite.displayOriginX));
      const py = Math.floor(y - (sprite.y - sprite.displayOriginY));
      if (px < 0 || py < 0 || px >= sprite.width || py >= sprite.height) return false;
      return this.textures.getPixelAlpha(px, py, sprite.texture.key) > 0;
    });
    hits.sort((a, b) => b.sprite.depth - a.sprite.depth);
    return hits[0]?.obj ?? undefined;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (menuOpen()) return;
    if (this.spell) return this.aimAt(pointer.worldX, pointer.worldY);
    this.pendingVisit = null;
    const tile = this.proj.pick({ x: pointer.worldX, y: pointer.worldY });
    const tapped = this.spriteAt(pointer.worldX, pointer.worldY, (s) => !!s.obj?.npc || !!s.obj?.rest) ?? this.world.objectAt(tile.x, tile.y);
    const person = tapped?.npc ? this.people.find((p) => p.id === tapped.npc) : undefined;
    if (person) return this.walkBeside(() => this.sim.footprintOf(person.id), () => this.talkTo(person), person.id);
    if (tapped?.rest) {
      const home = tapped;
      return this.walkBeside(() => this.world.footprintOf(home), () => this.offerRest());
    }
    this.walkTo(tile);
  }

  /** Walks next to something (or someone, who then waits), then does `arrive`; at once if already there. */
  private walkBeside(target: () => Footprint, arrive: () => void, who: NpcId | null = null): void {
    const path = besidePath(this.routing, this.walker.planningTile, target());
    if (!path) return;
    if (path.length === 0 && !this.walker.isMoving) return arrive();
    this.walker.setPath(path);
    this.pendingVisit = { target, arrive, who };
    const end = path.at(-1) ?? this.walker.planningTile;
    const top = this.proj.toWorld(end.x, end.y);
    this.marker.setPosition(top.x, top.y).setVisible(true);
  }

  private walkTo(target: Tile): void {
    const path = findPath(this.routing, this.walker.planningTile, target);
    if (!path) return; // Blocked, outside the map or unreachable: do nothing.
    this.walker.setPath(path);
    const top = this.proj.toWorld(target.x, target.y);
    this.marker.setPosition(top.x, top.y).setVisible(path.length > 0 || this.walker.isMoving);
  }

  private handleKeys(): void {
    if (this.tapped || this.keys.up.concat(this.keys.down, this.keys.left, this.keys.right).some((k) => k.isDown)) {
      this.pendingVisit = null;
    }
    const directions = Object.keys(this.keys) as (keyof DirectionKeys)[];
    const down = directions.find((d) => this.keys[d].some((k) => k.isDown));
    if (this.walker.isMoving) {
      // A key takes over from a click route: stop after the current step.
      const plan = this.walker.planningTile;
      const dest = this.walker.destination;
      if ((down || this.tapped) && (dest.x !== plan.x || dest.y !== plan.y)) this.walker.setPath([]);
      return;
    }
    // A tap during a step is taken as soon as the step ends.
    const held = down ?? this.tapped;
    this.tapped = null;
    if (!held) return;
    const from = this.walker.tile;
    const dir = DIRECTIONS[held];
    const next = { x: from.x + dir.x, y: from.y + dir.y };
    // Keys can walk onto armed ice; only route planning steers around it.
    if (!this.world.isBlocked(next.x, next.y)) {
      this.walker.setPath([next]);
      this.marker.setVisible(false);
    }
  }

  private createKeys(): DirectionKeys {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const add = (dir: keyof DirectionKeys, ...codes: number[]) =>
      codes.map((c) => kb.addKey(c).on(Phaser.Input.Keyboard.Events.DOWN, () => (this.tapped = dir)));
    return {
      up: add('up', K.W, K.UP),
      down: add('down', K.S, K.DOWN),
      left: add('left', K.A, K.LEFT),
      right: add('right', K.D, K.RIGHT),
    };
  }
}

function onFootprint(t: Tile, f: Footprint): boolean {
  return t.x >= f.x && t.x < f.x + f.w && t.y >= f.y && t.y < f.y + f.h;
}

/** How far a spell reaches. */
function reach(spell: Spell): number {
  return spell.modifier === 'range' ? tuning.values.craftRangeExtended : tuning.values.craftRange;
}

/** Beside any tile of a footprint (talking to someone, standing at a door). */
function isBesideFootprint(t: Tile, f: Footprint): boolean {
  for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (isBeside(t, { x, y })) return true;
  return false;
}

/** The shortest route to stand beside a footprint. */
function besidePath(grid: WalkGrid, from: Tile, f: Footprint): Tile[] | null {
  if (isBesideFootprint(from, f)) return [];
  let best: Tile[] | null = null;
  for (let y = f.y; y < f.y + f.h; y++) {
    for (let x = f.x; x < f.x + f.w; x++) {
      const path = pathToBeside(grid, from, { x, y });
      if (path && path.length > 0 && (!best || path.length < best.length)) best = path;
    }
  }
  return best;
}
