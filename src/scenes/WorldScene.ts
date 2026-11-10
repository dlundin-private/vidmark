import Phaser from 'phaser';
import {
  BUBBLE_MS_PER_LINE,
  ECHO_INTERVAL_MS,
  SNOWFLAKES,
  HOLLOW_TINT,
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
import { NPCS, type SpotName } from '../../content/data/npcs';
import { KEEPSAKES } from '../../content/data/keepsakes';
import { ACTIONS, CRAFTABLES } from '../../content/data/craft';
import type { NpcId } from '../../content/data/npcs';
import { PeopleSim } from '../systems/people';
import { DeathScreen, SpeechBubbles } from './Overlays';
import { IsoProjection, depthOrder, rectsOverlap, roundPoint, tilesInView, type Footprint, type Rect, type Tile } from '../iso';
import { TileWalker } from '../systems/movement';
import { findPath, type WalkGrid } from '../systems/pathfinding';
import { parseTiledMap, type MapObject } from '../systems/tiledMap';
import { FLAG_KNOWS_SAFE_ROUTE, WorldModel } from '../systems/world';
import { SketchMemory } from '../state/explored';
import { PLACES } from '../../content/data/places';
import { cast, planCast, plainSpell, stepOnto, weaveSpell, type Aim, type Spell } from '../systems/craft';
import { ambientDialogue, dialogueBox, store, tuning } from '../game';
import { isBeside, pathToBeside } from '../systems/interaction';
import * as A from '../state/actions';
import { CraftHud, WEAVES_TAUGHT_FLAG, type Selection } from './CraftHud';
import { Journal } from './Journal';
import { questsWouldChange, updateQuests, view as questView } from '../systems/quests';
import { personStepsOnto, wouldBreakUnderPerson, wouldBreakUnderSigne } from '../systems/craft';
import { WeaveScreen } from './WeaveScreen';
import { FightView } from './FightView';
import { WolfFight, encodeTrackStarts, trackTiles, wolfStarts, type FightEvent } from '../systems/combat';
import { TILESET_KEY } from './BootScene';
import { mapJson } from '../systems/maps';
import { sound, type Surface } from '../audio/sound';
import { Cinematic, type Art, type Painter, type Tableau } from './Cinematic';
import * as T from './tableaux';
import { ARRIVALS, INTRO, chapterOneEnding, chapterTwoEnding, type Beat, type Picture } from '../../content/data/cinematics';
import { chapterOneCanEnd, chapterTwoCanEnd, endChapterOne, endChapterTwo } from '../systems/chapters';
import { kinDef, type KinAction } from '../../content/data/kin';
import { castKin, planKin, type KinTarget } from '../systems/kin';
import { damOutcome, flood, restInJarnfors, restsLeft, type DamOutcome } from '../systems/dam';
import { FLAG_THIEVES, afterKnut, letThievesGo, thievesDue, thievesStopped } from '../systems/thieves';

type FightKind = 'wolves' | 'thieves';
/** Knut is the first of the three thieves. */
const KNUT_UNIT = 0;

const SIGNE_SPRITE = 'signe';
/** The wolf fight is on (saved, so a reload brings the pack back), and it is over. */
const FLAG_WOLVES_HUNTING = 'wolves_hunting';
/** The cramp-thieves fight is on (chapter 2): a reload brings Signe back up onto the crest. */
const FLAG_THIEVES_FIGHTING = 'thieves_fighting';
const FLAG_WOLVES_GONE = 'wolves_gone';
/** Where the fled wolves turned; their tracks run north from there. */
const FLAG_WOLF_TRACKS = 'wolf_tracks';
const MARKER_SPRITE = 'marker';
/** Tileset frame drawn by the collision debug overlay (the "blocked" tile). */
const BLOCKED_FRAME = 7;
/** Tileset frame of the wooden jetty (her steps sound different on it). */
const WOOD_FRAME = 11;
/** Järnfors' paving and dam stone. */
const STONE_FRAME = 14;
const DAM_FRAME = 15;
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
const film = new Cinematic();
/** Overlays that pause the world while open. */
const menuOpen = () => dialogueBox.isOpen || weaveScreen.isOpen || journal.isOpen || deathScreen.isOpen || film.isOpen;

const PICTURES: Record<Picture, { paint: Painter; snow: boolean }> = {
  nightLake: { paint: T.nightLake, snow: true },
  village: { paint: T.village, snow: true },
  girlOnIce: { paint: T.girlOnIce, snow: true },
  coatByDoor: { paint: T.coatByDoor, snow: false },
  waking: { paint: T.waking, snow: false },
  dawnRoad: { paint: T.dawnRoad, snow: true },
  emptyBed: { paint: T.emptyBed, snow: false },
  ledger: { paint: T.ledger, snow: false },
  warmPoint: { paint: T.warmPoint, snow: false },
  northPass: { paint: T.northPass, snow: true },
  gorgeDam: { paint: T.gorgeDam, snow: true },
  damHolds: { paint: T.damHolds, snow: true },
  damGone: { paint: T.damGone, snow: false },
};
const tableaux = (beats: readonly Beat[]): Tableau[] => beats.map((b) => ({ ...PICTURES[b.picture], lines: b.lines, ...(b.title ? { title: b.title } : {}) }));
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
  private fxTracks!: Phaser.GameObjects.Blitter;
  /** Falling snow, in world pixels around the camera. */
  private snow: { bob: Phaser.GameObjects.Bob; x: number; y: number; speed: number; sway: number }[] = [];
  private snowTime = 0;
  private tracks: { from: string; tiles: Set<string> } = { from: '', tiles: new Set() };
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
  private sim!: PeopleSim;
  /** Steps walked since she last stopped to sketch. */
  private sketchMemory = new SketchMemory();
  private stillMs = 0;
  private sketchIcon!: Phaser.GameObjects.Image;
  private sketchIconUntil = 0;
  /** Who Signe is talking with; they hold still. */
  private talkingWith: NpcId | null = null;
  /** Ms until an Echo next speaks up. */
  private echoIn = between(ECHO_INTERVAL_MS);
  /** Who or what Signe is walking over to (to talk, or to rest at home). */
  private pendingVisit: { target: () => Footprint; arrive: () => void; who: NpcId | null; onTile?: boolean } | null = null;
  /** The spell chosen in the HUD, waiting for a target. */
  private spell: Spell | null = null;
  /** Push: the object chosen, waiting for where it should stop. */
  private pushing: MapObject | null = null;
  /** The wolf fight on the ice road, while it lasts (build step 6). */
  private fight: { kind: FightKind; logic: WolfFight; view: FightView; sortables: Sortable[] } | null = null;
  private overlayLayer!: Phaser.GameObjects.Layer;

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
    this.bucketsBuilt = false;
    this.tapped = null;
    this.people = [];
    this.talkingWith = null;
    this.pendingVisit = null;
    this.sketchMemory = new SketchMemory();
    this.stillMs = 0;
    bubbles.clear();
    this.spell = null;
    this.pushing = null;
    this.fight = null;
    hud.select(null);

    const map = parseTiledMap(mapJson(store.state.map));
    this.world = new WorldModel(map, () => store.state, () => this.worldVersion);
    this.routing = { width: map.width, height: map.height, isBlocked: (x, y) => this.world.isBlockedForRouting(x, y) };
    this.proj = IsoProjection.forMap(map.height, TILE_WIDTH, TILE_HEIGHT, WORLD_TOP_MARGIN);
    const size = this.proj.worldSize(map.width, map.height);

    // Draw order between layers is fixed; inside the entity layer it comes from the footprints.
    const groundLayer = this.add.layer();
    const overlayLayer = this.add.layer();
    this.overlayLayer = overlayLayer;
    this.entityLayer = this.add.layer();
    const topLayer = this.add.layer();

    // Ground and overlays are blitted for the visible area only (see refreshView).
    this.ground = this.add.blitter(0, 0, TILESET_KEY);
    groundLayer.add(this.ground);
    this.fxStrengthened = this.add.blitter(0, 0, 'fx-strengthened');
    this.fxArmed = this.add.blitter(0, 0, 'fx-armed');
    this.fxTarget = this.add.blitter(0, 0, 'fx-target');
    this.fxRoute = this.add.blitter(0, 0, 'fx-route');
    this.fxTracks = this.add.blitter(0, 0, 'fx-tracks');
    this.collisionOverlay = this.add.blitter(0, 0, TILESET_KEY).setVisible(false);
    overlayLayer.add([this.fxTracks, this.fxStrengthened, this.fxArmed, this.fxRoute, this.fxTarget, this.collisionOverlay]);

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
      // Only meetings between people who are on this map.
      MEETINGS.filter((m) => this.people.some((p) => p.id === m.a) && this.people.some((p) => p.id === m.b)),
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
    this.sketchIcon = this.add.image(0, 0, 'fx-sketch').setOrigin(0.5, 1).setVisible(false);
    topLayer.add(this.sketchIcon);
    this.snow = [];
    for (const [key, share] of [['fx-flake', 0.7], ['fx-flake-near', 0.3]] as const) {
      const blitter = this.add.blitter(0, 0, key);
      topLayer.add(blitter);
      const near = key === 'fx-flake-near';
      for (let i = 0; i < Math.round(SNOWFLAKES * share); i++) {
        this.snow.push({ bob: blitter.create(0, 0), x: Math.random(), y: Math.random(), speed: near ? 0.09 : 0.05, sway: Math.random() * Math.PI * 2 });
      }
    }
    journal.setMap({
      width: map.width,
      height: map.height,
      frame: (x, y) => this.world.groundFrame(x, y),
      objectAt: (x, y) => this.world.objectAt(x, y)?.type,
      places: map.places,
      signe: () => this.walker.tile,
    });
    // Whatever she can see where she wakes up goes straight into the journal.
    store.update((s, t) => A.sketchSeen(s, [this.walker.tile], t.sightRadius, map, map.places));

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
    // The first time she reaches a map with its own arrival film (Järnfors).
    const arrival = ARRIVALS[store.state.map];
    if (arrival && !store.state.flags[`arrived_${store.state.map}`]) {
      const record = store.state.chapters.at(-1);
      film.play(tableaux(arrival(record)), this.art(), () => {
        store.update((s) => A.setFlag(s, `arrived_${s.map}`, true));
        store.save();
      });
    }
    // A new game opens with the intro (once).
    if (!store.state.flags.intro_seen) {
      film.play(tableaux(INTRO), this.art(), () => {
        store.update((s) => A.setFlag(s, 'intro_seen', true));
        store.save();
      });
    }
    // Reloaded in the middle of the wolf fight: the pack is still out there.
    if (store.state.flags[FLAG_WOLVES_HUNTING] && !store.state.flags[FLAG_WOLVES_GONE]) this.startFight();
    if (store.state.flags[FLAG_THIEVES_FIGHTING] && !store.state.flags[FLAG_THIEVES]) this.startFight('thieves');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.fight?.view.destroy());

    // How many nets are torn is a fact of the map; quests and dialogue count against it.
    const racks = map.objects.filter((o) => o.type === 'net-rack' && o.broken).length;
    if (racks > 0 && store.state.flags.nets_total !== racks) store.update((s) => A.setFlag(s, 'nets_total', racks));
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
      if (events.length > 0) sound.play('chime');
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
      sound.play('crack');
      sound.play('splash');
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
    // In a fight, Signe moves by taps, one action at a time; keys would walk past the turns.
    if (this.fight) this.tapped = null;
    else if (!busy) this.handleKeys();
    this.updatePeople(delta);
    const before = this.walker.tile;
    const entered = this.walker.update(delta);
    if (entered.length > 0) this.onEntered(before, entered);
    this.stillMs = this.walker.isMoving ? 0 : this.stillMs + delta;
    if (this.stillMs > 450 && this.sketchMemory.pending > 0 && !menuOpen()) this.sketch();
    this.sketchIcon.setVisible(this.time.now < this.sketchIconUntil);
    if (this.sketchIcon.visible) this.sketchIcon.setPosition(this.signe.x + 7, this.signe.y - this.signe.height - 1);
    if (!this.walker.isMoving) {
      this.marker.setVisible(false);
      if (entered.length > 0) this.autosave();
      const visit = this.pendingVisit;
      this.pendingVisit = null;
      const t = this.walker.tile;
      const there = visit && (visit.onTile ? onFootprint(t, visit.target()) : isBesideFootprint(t, visit.target()));
      if (visit && there) visit.arrive();
    }
    if (this.fight) this.updateFight(delta);
    this.updateSnow(delta);
    this.updateAmbience();
    this.placeSigne();
    this.refreshView();
    this.sortDepth();
  }

  /** Beside her house: where she rests, shapes Weaves and refocuses. */
  isAtHome(): boolean {
    if (this.walker.isMoving) return false;
    return this.world.objects.some((o) => o.rest && !this.world.isBroken(o) && isBesideFootprint(this.walker.tile, this.world.footprintOf(o)));
  }

  // --- Craft ------------------------------------------------------------------

  /** The HUD picked an action or Weave (or cleared it). */
  onSelect(selection: Selection | null): void {
    this.pushing = null;
    this.pendingVisit = null;
    this.kin = selection?.kind === 'kin' ? selection.action : null;
    if (this.kin) {
      this.spell = null;
      hud.say(`${kinDef(this.kin).description} Tap yourself, or someone close. Tap the button again to cancel.`, 0);
      this.lastViewKey = '';
      return;
    }
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
    if (selection.kind === 'kin') return null;
    if (selection.kind === 'action') return plainSpell(selection.action, 'object');
    const w = store.state.weaves.find((x) => x.id === selection.id);
    return w ? weaveSpell(w) : null;
  }

  /** Kin chosen in the HUD, waiting for someone to use it on. */
  private kin: KinAction | null = null;

  /** A tap while a Kin ability is chosen: Signe herself, a person close by, or a wolf in a fight. */
  private aimKin(worldX: number, worldY: number): void {
    const action = this.kin!;
    const tile = this.proj.pick({ x: worldX, y: worldY });
    const t = tuning.values;
    const here = this.walker.tile;
    const wolf = this.fight?.logic.wolfAt(tile.x, tile.y);
    const hit = this.spriteAt(worldX, worldY, (s) => !!s.obj?.npc);
    const person = hit?.npc ? this.people.find((p) => p.id === hit.npc) : this.people.find((p) => { const pt = this.sim.tileOf(p.id); return pt.x === tile.x && pt.y === tile.y; });
    // Her own tile first, then whoever was tapped; her tall picture only as a last resort (it covers the tile behind her).
    const onOwnTile = tile.x === here.x && tile.y === here.y;
    let target: KinTarget;
    if (wolf) target = { kind: 'creature', id: wolf.id };
    else if (onOwnTile) target = { kind: 'self' };
    else if (person) target = { kind: 'person', id: person.id };
    else if (this.signe.getBounds().contains(worldX, worldY)) target = { kind: 'self' };
    else {
      hud.say('Kin works on the living. Tap yourself, or someone close.');
      return;
    }
    if (target.kind !== 'self') {
      const at = target.kind === 'creature' ? wolf!.at : this.sim.tileOf((target as { id: NpcId }).id);
      if (distance(here, at) > t.craftRange) {
        hud.say(this.fight ? 'Too far. Kin needs you close; moving takes an action.' : 'Too far. Kin needs you close.');
        return;
      }
    }
    const plan = planKin(store.state, t, action, target);
    if (!plan.ok) {
      hud.say(plan.reason);
      return;
    }
    if (A.availablePower(store.state) < plan.cost) return this.outOfPower(`That needs ${plan.cost} Power. You have ${A.availablePower(store.state)}.`);
    const message = store.update((s) => castKin(s, plan));
    store.save();
    hud.select(null);
    sound.play(action === 'sense' ? 'echo' : 'mend');
    if (action === 'sense' && target.kind === 'person') {
      const hollow = store.state.npcs[target.id].hollowed;
      const lines = ambientDialogue.linesOf(hollow ? 'sense_hollow' : `sense_${target.id}`).map((l) => l.text);
      hud.say(`${lines.join(' ')} (−${plan.cost} Power)`, 9000);
    } else {
      hud.say(`${message} (−${plan.cost} Power)`);
    }
    if (this.fight) {
      if (action === 'calm' && target.kind === 'creature') this.fight.logic.calm(target.id);
      this.fight.logic.spend();
      this.playFight([]);
    }
  }

  /** Not enough Power: offer what she can always spend (Keepsakes; in a fight, the wolf beside her). */
  private outOfPower(text: string): void {
    const options = [
      ...(KEEPSAKES.some((k) => !k.hiddenUntilLate && A.hasKeepsake(store.state, k.id)) ? [{ label: 'Burn a Keepsake…', run: () => journal.open('keepsakes') }] : []),
      ...(this.fight?.logic.wolfBeside() && (this.fight.kind !== 'thieves' || this.fight.logic.wolfBeside()!.id === KNUT_UNIT)
        ? [{ label: this.fight.kind === 'thieves' ? 'Take everything from Knut' : 'Take everything from the wolf', run: () => this.askHollowWolf() }]
        : []),
    ];
    if (options.length > 0) hud.ask(text, options);
    else hud.say(text);
  }

  /** A tap while a spell is chosen: aim it, check it, and cast it. */
  private aimAt(worldX: number, worldY: number): void {
    const spell = this.spell!;
    const tile = this.proj.pick({ x: worldX, y: worldY });
    const signe = this.walker.planningTile;
    const t = tuning.values;
    let plan;

    if (this.pushing) {
      plan = planCast(this.world, store.state, t, spell, { kind: 'object', id: this.pushing.id }, signe, tile, this.wolfAt());
    } else {
      const object = this.craftableAt(worldX, worldY, tile);
      // Craft works on made things, never on the living (Daniel: keep the domain rule). Say what Push can do instead.
      if (spell.action === 'push' && !object && this.fight?.logic.wolfAt(tile.x, tile.y)) {
        hud.say('Craft moves made things, not living ones. Stand in line with a crate, the sled or a marker and push it into the wolf.', 5000);
        return;
      }
      // A plain Strengthen or Weaken works on whatever was tapped: an object, or the ice.
      let s = spell;
      if (spell.modifier === null && spell.target === 'object' && !object && (spell.action === 'strengthen' || spell.action === 'weaken')) {
        s = { ...spell, target: 'surface' };
      }
      const aim: Aim = s.target === 'object' && object ? { kind: 'object', id: object.id } : { kind: 'tile', x: tile.x, y: tile.y };
      plan = planCast(this.world, store.state, t, s, aim, signe, undefined, this.wolfAt());
      if (plan.ok && s.action === 'push') {
        this.pushing = plan.object!;
        hud.say(`Push the ${plan.object!.type.replace(/-/g, ' ')}: tap where it should stop. 1 Power per ${t.pushTilesPerPower} tiles.`, 0);
        return;
      }
    }

    if (!plan.ok && plan.code === 'range' && this.fight) {
      hud.say('Out of reach. Moving closer takes an action.');
      return;
    }
    if (!plan.ok && plan.code === 'range' && !this.pushing) return this.walkIntoReach(worldX, worldY, tile, reach(spell));
    if (!plan.ok) {
      hud.say(plan.reason);
      return;
    }
    if (A.availablePower(store.state) < plan.cost) {
      const text = `That needs ${plan.cost} Power. You have ${A.availablePower(store.state)}.`;
      // Out of Power: the Keepsakes are the one thing she can always spend.
      // In a fight, taking everything from the wolf beside her is always offered too (design).
      return this.outOfPower(text);
    }
    const done = plan;
    const message = store.update((s, tt) => cast(this.world, s, tt, done));
    store.save();
    hud.select(null); // clears the "tap what to work on" prompt, so say the result after
    hud.say(`${message} (−${plan.cost} Power)`);
    sound.play(done.spell.action);
    if (done.spell.action === 'weaken' && done.tiles && done.spell.modifier !== 'trigger') sound.play('crack');
    if (this.fight) this.afterFightCast(done);
  }

  // --- The wolf fight (build step 6) ------------------------------------------------

  /** Northward off the cracked ice, anywhere but the hermit's route, while the road is still theirs. */
  private meetsWolves(from: Tile, to: Tile): boolean {
    const band = this.world.band;
    const f = store.state.flags;
    if (!band || this.fight || f[FLAG_WOLVES_GONE] || f.ice_road_open) return false;
    return from.y === band.y0 && to.y === band.y0 - 1 && to.x !== this.world.map.numbers.safeRouteX;
  }

  private startFight(kind: FightKind = 'wolves'): void {
    const t = tuning.values;
    const n = this.world.map.numbers;
    let starts: Tile[];
    if (kind === 'thieves') {
      // Up onto the crest at night, west of the spillway; the three of them east of it, prying.
      this.walker.teleport({ x: n.thievesSigneX!, y: n.thievesSigneY! });
      starts = [0, 1, 2].map((i) => ({ x: n[`thief${i}X`]!, y: n[`thief${i}Y`]! }));
    } else {
      const free = (x: number, y: number) => this.world.isIce(x, y) && !this.world.isBlocked(x, y) && !this.world.isThinIce(x, y);
      starts = wolfStarts(this.walker.tile, t.wolfCount, free);
    }
    const logic = new WolfFight(
      {
        width: this.world.width,
        height: this.world.height,
        isBlocked: (x, y) => this.world.isBlocked(x, y),
        isTrap: (x, y) => {
          const e = this.world.tileEffect(x, y);
          return e?.armed === true && e.kind === 'weakened';
        },
      },
      this.walker.tile,
      starts,
      t,
      // Knut leads the thieves: he yields, he doesn't run.
      kind === 'thieves' ? new Set([KNUT_UNIT]) : new Set(),
    );
    const view = new FightView(
      this,
      this.proj,
      logic,
      this.entityLayer,
      this.overlayLayer,
      () => {
        if (!this.canActInFight()) return;
        logic.endTurn();
        view.refresh();
      },
      kind === 'thieves' ? (id) => (id === KNUT_UNIT ? 'npc-knut' : 'thief') : undefined,
      kind === 'thieves' ? 'Thieves' : 'Wolves',
    );
    const sortables: Sortable[] = view.sortables().map((s) => ({ sprite: s.sprite, footprint: s.footprint, obj: null, bounds: null }));
    this.fight = { kind, logic, view, sortables };
    this.spell = null;
    hud.select(null);
    const flag = kind === 'thieves' ? FLAG_THIEVES_FIGHTING : FLAG_WOLVES_HUNTING;
    const resumed = !!store.state.flags[flag];
    store.update((s) => A.setFlag(s, flag, true));
    store.save(); // a reload in the middle of the fight brings it back
    if (kind === 'thieves') {
      sound.play('hit');
      hud.announce(
        resumed ? 'Knut is still on the crest' : 'The cramp-thieves',
        'Knut and two others from the lower quarter, pry-bars and a lantern, working the iron out of the stone. Weaken a plank under one and he drops to the ledge below.',
      );
    } else {
      sound.play('howl');
      hud.announce(
        resumed ? 'The wolves are still out there' : 'Starving wolves',
        'They come out of the snow along the road, ribs like fence rails. Red marks show where each will run, and where it will bite.',
      );
    }
    this.lastViewKey = '';
  }

  /** A night while the bell rings: the thieves are on the crest. Go up, or let them. */
  private thievesAtNight(): void {
    hud.ask('In the night, iron is screaming up on the crest: someone is prying the cramps out of the dam.', [
      { label: 'Go up to the crest', run: () => this.startFight('thieves') },
      {
        label: 'Let them',
        run: () => {
          const result = store.update((s) => letThievesGo(s));
          store.save();
          if (result === 'broke') return this.damDecided('broken');
          hud.say("By morning they're gone, and their families with them. The crack is wider: a night less.", 6000);
        },
      },
    ]);
  }

  /** After the thieves: Knut on his knees. Spare him, ask him for something, or take everything (design). */
  private afterThieves(): void {
    if (store.state.npcs.knut.hollowed) return;
    hud.ask('Knut is on his knees on the stone, his bar thrown down. "Go on, then."', [
      { label: 'Spare him', run: () => { store.update((s, t) => afterKnut(s, t, 'spare')); store.save(); hud.say('You let him go. He looks back once from the stairs.', 4000); } },
      {
        label: 'Ask him for something',
        run: () => {
          store.update((s, t) => afterKnut(s, t, 'offer'));
          store.save();
          hud.say('He gives you the morning the forge first answered to him. To buy his family a way out of the water.', 6000);
        },
      },
      {
        label: 'Take everything',
        run: () => {
          store.update((s, t) => afterKnut(s, t, 'hollow'));
          sound.play('hollow');
          store.save();
          hud.say(`The masons on the towers see it. +${tuning.values.hollowingReserve} Power, once. Your Hearth will refill less from now on.`, 7000);
        },
      },
    ]);
  }

  /** Taps in a fight: move (one action, a few tiles), or reach for the wolf beside her. */
  private fightTap(tile: Tile): void {
    const { logic } = this.fight!;
    const wolf = logic.wolfAt(tile.x, tile.y);
    if (wolf) {
      const thieves = this.fight!.kind === 'thieves';
      if (logic.wolfBeside() === wolf && (!thieves || wolf.id === KNUT_UNIT)) return this.askHollowWolf();
      hud.say(thieves ? 'He keeps his bar between you. Craft works from here; your hands do not.' : 'It keeps just out of reach. Craft works from here; your hands do not.');
      return;
    }
    const path = logic.movePath(tile);
    if (!path) {
      hud.say(`One move takes you at most ${tuning.values.combatMoveTiles} tiles, and not through a wolf.`);
      return;
    }
    this.walker.setPath(path);
    logic.moved(path.at(-1)!);
    this.fight!.view.refresh();
  }

  private canActInFight(): boolean {
    const f = this.fight;
    return !!f && f.logic.phase === 'signe' && !f.view.animating && !this.walker.isMoving;
  }

  private wolfAt(): ((x: number, y: number) => boolean) | undefined {
    const logic = this.fight?.logic;
    return logic ? (x, y) => !!logic.wolfAt(x, y) : undefined;
  }

  /** A cast in a fight: an action; a pushed thing may strike a wolf, broken ice may take one. */
  private afterFightCast(plan: Extract<ReturnType<typeof planCast>, { ok: true }>): void {
    const { logic } = this.fight!;
    const events: FightEvent[] = [];
    if (plan.hits) {
      const w = logic.wolfAt(plan.hits.x, plan.hits.y);
      if (w) events.push(...logic.hit(w.id));
    }
    for (const w of logic.hunting) if (this.world.isBrokenIce(w.at.x, w.at.y)) events.push(...logic.remove(w.id, 'drowned'));
    logic.spend();
    this.playFight(events);
  }

  private askHollowWolf(): void {
    const { logic, view } = this.fight!;
    const wolf = logic.wolfBeside();
    if (!wolf || !this.canActInFight()) return;
    if (this.fight!.kind === 'thieves') {
      if (wolf.id !== KNUT_UNIT) return;
      hud.ask('Knut is right beside you, bar raised. You could take everything he is.', [
        {
          label: 'Take everything',
          run: () => {
            if (!this.fight || logic.wolfBeside() !== wolf) return;
            store.update((s, t) => afterKnut(s, t, 'hollow'));
            sound.play('hollow');
            const events = logic.remove(wolf.id, 'hollowed');
            logic.spend();
            hud.say(`His whole life, forge and children and all. The masons on the towers see it. +${tuning.values.hollowingReserve} Power, once.`, 6000);
            view.hollowed(wolf.id, () => this.playFight(events));
          },
        },
        { label: 'Let it be', run: () => undefined },
      ]);
      return;
    }
    hud.ask('The wolf is right beside you, all ribs and teeth. You could take everything it is.', [
      {
        label: 'Take everything',
        run: () => {
          if (!this.fight || logic.wolfBeside() !== wolf) return;
          store.update((s, t) => A.hollowWolf(s, t));
          sound.play('hollow');
          const events = logic.remove(wolf.id, 'hollowed');
          logic.spend();
          hud.say(`Hunger, cold, the pack: it pours into you. +${tuning.values.wolfHollowingReserve} Power, once.`, 5000);
          view.hollowed(wolf.id, () => this.playFight(events));
        },
      },
      { label: 'Let it be', run: () => undefined },
    ]);
  }

  /** Shows fight events, applying what they do to Signe and the ice as each lands. */
  private playFight(events: FightEvent[]): void {
    const fight = this.fight;
    if (!fight) return;
    fight.view.play(events, (e) => this.fightEvent(e), () => {
      if (fight.logic.isOver) this.endFight();
      else fight.view.refresh();
    });
  }

  private fightEvent(e: FightEvent): void {
    const t = tuning.values;
    if (this.fight?.kind === 'thieves') return this.thiefEvent(e);
    if (e.kind === 'hit') sound.play('hit');
    if (e.kind === 'bite') {
      sound.play('bite');
      store.update((s, tt) => {
        for (let i = 0; i < t.wolfBiteWounds; i++) A.addWound(s, tt);
      });
      if (!deathScreen.isOpen) hud.say('Teeth in your arm. You tear free.', 2500);
    }
    if (e.kind === 'drowned') {
      sound.play('crack');
      sound.play('splash');
      // It stays open: a dark patch on the road where a wolf went through (step 7).
      store.update((s) => A.breakIce(s, e.at.x, e.at.y, Number.MAX_SAFE_INTEGER));
      hud.say('The ice opens under the wolf. It does not come up.', 3000);
    }
    if (e.kind === 'fled') hud.say('A wolf turns tail and runs for the far shore.', 2500);
  }

  /** The thieves: bars instead of teeth, planks instead of ice, and nobody drowns (design). */
  private thiefEvent(e: FightEvent): void {
    if (e.kind === 'hit') sound.play('hit');
    if (e.kind === 'bite') {
      sound.play('hit');
      store.update((s, tt) => A.addWound(s, tt));
      if (!deathScreen.isOpen) hud.say('A pry-bar catches your shoulder.', 2500);
    }
    if (e.kind === 'drowned') {
      sound.play('crack');
      store.update((s) => A.breakIce(s, e.at.x, e.at.y, Number.MAX_SAFE_INTEGER));
      hud.say(e.wolf === KNUT_UNIT ? 'The plank goes under Knut. He drops to the ledge below, hurt, and stays there.' : 'The plank goes under him. He drops to the ledge below, hurt, and stays there.', 3500);
    }
    if (e.kind === 'fled') hud.say('A thief throws down his bar and runs for the stairs.', 2500);
    if (e.kind === 'yielded') hud.say('Knut throws down his bar.', 2500);
  }

  private updateFight(delta: number): void {
    const fight = this.fight!;
    fight.view.update(delta);
    // After a move (or going through the ice and back), she is where the walker is.
    if (!this.walker.isMoving) fight.logic.signe = { ...this.walker.tile };
    if (fight.logic.phase === 'wolves' && !fight.view.animating && !this.walker.isMoving && !menuOpen()) {
      this.playFight(fight.logic.wolvesAct());
    }
  }

  private endFight(): void {
    const fight = this.fight!;
    if (fight.kind === 'thieves') {
      store.update((s) => {
        A.setFlag(s, FLAG_THIEVES_FIGHTING, false);
        thievesStopped(s);
      });
      store.save();
      hud.announce('The thieves are gone', 'The cramps stay in the stone tonight. The crack slows: the masons give it one more night.');
      fight.view.destroy();
      this.fight = null;
      this.lastViewKey = '';
      return this.afterThieves();
    }
    const fled = fight.logic.wolves.filter((w) => w.state === 'fled').map((w) => w.at);
    store.update((s) => {
      A.setFlag(s, FLAG_WOLVES_HUNTING, false);
      A.setFlag(s, FLAG_WOLVES_GONE, true);
      A.setFlag(s, FLAG_WOLF_TRACKS, encodeTrackStarts(fled));
    });
    store.save();
    hud.announce('The wolves are gone', 'The rest of the pack slinks off toward the far shore. The road is quiet.');
    fight.view.destroy();
    this.fight = null;
    this.lastViewKey = '';
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
      this.sketchMemory.push(tile);
      sound.step(this.surfaceAt(tile));
      this.noteCrossing(previous, tile);
      if (this.meetsWolves(previous, tile)) {
        this.walker.setPath([]);
        this.startFight();
        return;
      }
      const through = wouldBreakUnderSigne(this.world, tile) && store.update((s, t) => stepOnto(this.world, s, t, tile));
      if (through) {
        sound.play('crack');
        sound.play('splash');
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

  /**
   * Signe stops: she brings out the journal and sketches what she saw on the
   * way, as far back as she can remember (Daniel's design). A walk that went
   * on too long loses its start.
   */
  private sketch(): void {
    const t = tuning.values;
    const { kept, forgotten } = this.sketchMemory.flush(t.sketchMemorySteps);
    const map = this.world.map;
    const result = store.update((s) => A.sketchSeen(s, [...kept, this.walker.tile], t.sightRadius, map, map.places));
    if (result.newTiles > 0) {
      this.sketchIconUntil = this.time.now + 1100;
      store.save(); // the page is drawn: keep it
    }
    for (const id of result.found) {
      const place = map.places.find((p) => p.id === id);
      if (place) {
        hud.announce(`Found: ${place.name}`, PLACES[id]?.found ?? '');
        sound.play('chime');
      }
    }
    if (forgotten > 0 && result.newTiles > 0) hud.say('You walked a long way without stopping. The start of it is a blur on the page.', 4500);
  }

  /** Stepping off the cracked-ice band on the far side means Signe crossed it (the ice road quest). */
  private noteCrossing(from: Tile, to: Tile): void {
    const band = this.world.band;
    if (!band || store.state.flags.crossed_cracked_ice) return;
    const northward = from.y === band.y0 && to.y === band.y0 - 1;
    const southward = from.y === band.y1 && to.y === band.y1 + 1;
    if ((northward || southward) && this.world.isIce(to.x, to.y)) {
      store.update((s) => {
        A.setFlag(s, 'crossed_cracked_ice', true);
        if (to.x === this.world.map.numbers.safeRouteX) A.setFlag(s, 'crossed_by_route', true);
      });
    }
  }

  /**
   * The last wound: Signe dies, and the game goes back to her last rest at
   * home (decided by Daniel), told as a memory she had wrong.
   */
  private die(): void {
    sound.play('fall');
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
    if (this.worldVersion !== this.movesCheckedAt) this.applyMoves();
    for (const p of this.people) {
      const hollow = store.state.npcs[p.id].hollowed;
      if (store.state.npcs[p.id].gone) this.sim.setGone(p.id);
      this.sim.setHollow(p.id, hollow);
      // The boathouse Hollow has his own look; anyone Signe empties greys out.
      if (hollow && !NPCS.find((n) => n.id === p.id)?.startsHollow) p.sprite.setTint(HOLLOW_TINT);
      else p.sprite.clearTint();
      const v = this.sim.visualOf(p.id);
      const at = roundPoint(this.proj.footprintBottom({ x: v.x, y: v.y, w: 1, h: 1 }));
      p.sprite.setPosition(at.x, at.y);
    }
    bubbles.update(delta, (who) => this.screenPointAbove(who), menuOpen());
    this.updateEchoes(delta);
  }

  /** Now and then, what is left of someone Signe hollowed speaks up inside her. */
  private updateEchoes(delta: number): void {
    if (menuOpen() || this.talkingWith) return;
    this.echoIn -= delta;
    if (this.echoIn > 0) return;
    this.echoIn = between(ECHO_INTERVAL_MS);
    const echoes: string[] = [...A.echoes(store.state), ...(A.wolfEchoes(store.state) > 0 ? ['wolf'] : [])];
    if (echoes.length === 0) return;
    // Hungry, with someone full of memories close by: an Echo says so (Daniel's design).
    if (A.availablePower(store.state) <= tuning.values.hungerAtPower) {
      const near = this.people.filter((p) => !store.state.npcs[p.id].hollowed && distance(this.walker.tile, this.sim.tileOf(p.id)) <= HUNGER_RANGE);
      const whom = near[Math.floor(Math.random() * near.length)];
      const murmur = whom && ambientDialogue.linesOf(`hunger_${whom.id}`)[0];
      if (murmur) {
        hud.say(`An Echo: “${murmur.text}”`, 5000);
        sound.play('echo');
        return;
      }
    }
    const who = echoes[Math.floor(Math.random() * echoes.length)]!;
    const line = ambientDialogue.linesOf(`echo_${who}`)[0];
    if (line) {
      hud.say(`An Echo: “${line.text}”`, 5000);
      sound.play('echo');
    }
  }

  /** Someone close enough to see Signe hollow a person (not the person, not another Hollow). */
  private witnessOf(victim: NpcId): Person | undefined {
    const range = tuning.values.seenRange;
    return this.people.find(
      (p) => p.id !== victim && !store.state.npcs[p.id].hollowed && distance(this.walker.tile, this.sim.tileOf(p.id)) <= range,
    );
  }

  private movesCheckedAt = -1;

  /** The world changed: people whose spot moves with it (the hermit to the fire, Lilja and Olle onto the open road). */
  private applyMoves(): void {
    this.movesCheckedAt = this.worldVersion;
    const v = questView(store.state);
    for (const p of this.people) {
      const def = NPCS.find((n) => n.id === p.id)!;
      const move = def.moves?.find((m) => m.when(v));
      const spot = move ? this.spot(move.to) : null;
      if (move && spot) this.sim.moveTo(p.id, spot, move.radius, move.onIce ?? false);
      else this.sim.moveTo(p.id, { x: p.obj.footprint.x, y: p.obj.footprint.y }, def.wander.radius, def.wander.onIce ?? false);
    }
  }

  private spot(name: SpotName): Tile | null {
    const n = this.world.map.numbers;
    const band = this.world.band;
    const roadX = n.iceRoadX0 !== undefined ? n.iceRoadX0 + 1 : undefined;
    switch (name) {
      case 'village-fire':
        return n.hermitVillageX !== undefined && n.hermitVillageY !== undefined ? { x: n.hermitVillageX, y: n.hermitVillageY } : null;
      case 'ice-road-near':
        return roadX !== undefined && band ? { x: roadX, y: band.y1 + 6 } : null;
      case 'ice-road-far':
        return roadX !== undefined && band ? { x: roadX, y: band.y0 - 6 } : null;
      default: {
        // Other spots are map numbers: "brita-crest" -> britaCrestX, britaCrestY.
        const key = name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
        const x = n[`${key}X`];
        const y = n[`${key}Y`];
        return x !== undefined && y !== undefined ? { x, y } : null;
      }
    }
  }

  /** Travels to another map: the scene rebuilds there, and the first arrival plays its film. */
  private goTo(map: string): void {
    store.rebuild((s) => {
      A.setPosition(s, this.walker.tile);
      A.travel(s, map);
    });
    store.save();
  }

  /** The morning after the dam was decided: chapter 2's ending film, then the road north (not yet written). */
  private endChapterTwo(): void {
    const record = store.update((s) => endChapterTwo(s));
    store.save();
    store.saveRestPoint();
    film.play(tableaux(chapterTwoEnding(record)), this.art(), () => {
      hud.ask('Chapter 2 is over.', [
        { label: 'Stay in Järnfors a while', run: () => hud.say('The city goes on around you. Chapter 3 is not written yet; everything you did is kept.', 6000) },
        { label: 'Start over', run: () => store.newGame() },
      ]);
    });
  }

  /** The game's loaded sprites, for the films to paint with. */
  private art(): Art {
    return (key) => (this.textures.exists(key) ? (this.textures.get(key).getSourceImage() as CanvasImageSource) : null);
  }

  /** Morning after the road opened: the Tithe has taken Lilja. The outro, then chapter 2 (not yet written). */
  private endChapter(): void {
    const torvaldHollowed = store.state.npcs.torvald.hollowed;
    const record = store.update((s) => endChapterOne(s));
    store.save();
    store.saveRestPoint();
    film.play(tableaux(chapterOneEnding(record, { torvaldHollowed })), this.art(), () => {
      hud.ask('Chapter 1 is over.', [
        { label: 'Go north to Järnfors', run: () => this.goTo('jarnfors') },
        { label: 'Stay in Kallsjö a while', run: () => hud.say('The village is quieter now. When you are ready, rest at home and take the road north.', 6000) },
      ]);
    });
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
    const ending = chapterOneCanEnd(store.state);
    const endingTwo = chapterTwoCanEnd(store.state);
    // Chapter 1 is over and she is still in Kallsjö: home is where the road north starts.
    const northbound = store.state.chapter >= 2 && store.state.map === 'kallsjo';
    hud.ask(
      ending
        ? 'Rest at home? The road across the ice is open now. Anything could come over it by morning.'
        : endingTwo
          ? 'Rest at the inn? Whatever the dam is now, there is nothing left here that needs you. In the morning the road north is open.'
          : `Rest ${store.state.map === 'kallsjo' ? 'at home' : 'at the inn'}? Power refills, a wound heals, and Craft effects fade.`,
      [
      ...(northbound ? [{ label: 'Go north to Järnfors', run: () => this.goTo('jarnfors') }] : []),
      ...(weavesTaught ? [{ label: 'Refocus Weaves', run: () => weaveScreen.open() }] : []),
      {
        label: 'Rest',
        run: () => {
          store.update(A.restAtHome);
          // In Järnfors, a night brings the bell, or the break, nearer.
          const night = store.update((s, tt) => restInJarnfors(s, tt));
          this.autosave();
          store.saveRestPoint(); // where death returns to
          if (ending) return this.endChapter();
          if (endingTwo) return this.endChapterTwo();
          if (night) return this.damNight(night);
          hud.say(A.echoCount(store.state) > 0
            ? `You rest by the fire, but other lives crowd in around it. Power refills to ${store.state.power}. You will remember this.`
            : 'You rest by the fire. Power restored. You will remember this.');
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
    const moved = !s.bounds || s.bounds.x !== b.x || s.bounds.y !== b.y;
    s.bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
    if (moved) this.bucketsBuilt = false;
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
    for (const b of [this.ground, this.collisionOverlay, this.fxStrengthened, this.fxArmed, this.fxRoute, this.fxTarget, this.fxTracks]) b.clear();
    const trackFrom = String(store.state.flags[FLAG_WOLF_TRACKS] ?? '');
    if (trackFrom !== this.tracks.from) this.tracks = { from: trackFrom, tiles: trackTiles(trackFrom) };
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
      if (this.tracks.tiles.has(`${t.x},${t.y}`) && this.world.isIce(t.x, t.y)) this.fxTracks.create(x, top.y);
      if (reach >= 0 && Math.abs(t.x - signe.x) + Math.abs(t.y - signe.y) <= reach) this.fxTarget.create(x, top.y);
      if (this.collisionOverlay.visible && this.world.isBlocked(t.x, t.y)) this.collisionOverlay.create(x, top.y, BLOCKED_FRAME);
    }

    for (const s of this.onScreen) s.sprite.setVisible(false);
    // Some objects only exist once a quest has ended a certain way (step 7).
    this.onScreen = [...this.inView(view), ...(this.fight?.sortables ?? [])].filter(
      (s) =>
        (!s.bounds || rectsOverlap(s.bounds, view)) &&
        (!s.obj || this.world.isShown(s.obj)) &&
        !(s.obj?.npc && store.state.npcs[s.obj.npc as NpcId]?.gone) &&
        !(this.fight?.kind === 'thieves' && s.obj?.npc === 'knut'),
    );
    for (const s of this.onScreen) s.sprite.setVisible(true);
    this.lastSortKey = '';
  }

  /** What Signe's feet are on, for the sound of her steps. */
  private surfaceAt(t: Tile): Surface {
    const frame = this.world.groundFrame(t.x, t.y);
    if (frame === WOOD_FRAME || frame === STONE_FRAME || frame === DAM_FRAME) return 'wood';
    return this.world.isIce(t.x, t.y) ? 'ice' : 'snow';
  }

  private fireAt: Tile | null | undefined;
  private ambienceTile = '';

  /** Wind blows harder out on the open ice; the fire crackles when she is near it. */
  private updateAmbience(): void {
    const t = this.walker.tile;
    const key = `${t.x},${t.y}`;
    if (key === this.ambienceTile) return;
    this.ambienceTile = key;
    sound.setExposure(this.world.isIce(t.x, t.y) ? 1 : 0.25);
    if (this.fireAt === undefined) {
      const fire = this.world.objects.find((o) => o.type === 'firepit');
      this.fireAt = fire ? { x: fire.footprint.x, y: fire.footprint.y } : null;
    }
    const d = this.fireAt ? distance(t, this.fireAt) : 99;
    sound.setFireNearness(Math.max(0, 1 - d / 7));
  }

  /** Snow drifts down across the view; flakes wrap around it, on whole pixels. */
  private updateSnow(delta: number): void {
    const v = this.cameras.main.worldView;
    this.snowTime += delta;
    for (const f of this.snow) {
      f.y = (f.y + (f.speed * delta) / 1000) % 1;
      f.x = (f.x + 1 + (Math.sin(this.snowTime / 1400 + f.sway) * 0.004 * delta) / 16) % 1;
      f.bob.x = Math.round(v.x + f.x * v.width);
      f.bob.y = Math.round(v.y + f.y * v.height);
    }
  }

  /** World pixels per side of a bucket in the spatial index of sprites. */
  private static readonly BUCKET = 256;
  private buckets = new Map<string, Sortable[]>();
  private bucketsBuilt = false;

  /**
   * Sortables that may be in a world rectangle: everything that moves, plus
   * fixed sprites from the buckets the rectangle touches (8,000+ objects on the map).
   */
  private inView(view: Rect): Sortable[] {
    if (!this.bucketsBuilt) this.buildBuckets();
    const B = WorldScene.BUCKET;
    const found = new Set<Sortable>();
    for (const s of this.sortables) if (!s.bounds) found.add(s);
    for (let by = Math.floor(view.y / B); by <= Math.floor((view.y + view.height) / B); by++) {
      for (let bx = Math.floor(view.x / B); bx <= Math.floor((view.x + view.width) / B); bx++) {
        for (const s of this.buckets.get(`${bx},${by}`) ?? []) found.add(s);
      }
    }
    return [...found];
  }

  private buildBuckets(): void {
    const B = WorldScene.BUCKET;
    this.buckets = new Map();
    for (const s of this.sortables) {
      if (!s.bounds) continue;
      for (let by = Math.floor(s.bounds.y / B); by <= Math.floor((s.bounds.y + s.bounds.height) / B); by++) {
        for (let bx = Math.floor(s.bounds.x / B); bx <= Math.floor((s.bounds.x + s.bounds.width) / B); bx++) {
          const key = `${bx},${by}`;
          const list = this.buckets.get(key);
          if (list) list.push(s);
          else this.buckets.set(key, [s]);
        }
      }
    }
    this.bucketsBuilt = true;
  }

  /** Re-sorts what's on screen when the set changed, or Signe or anyone else moved. */
  private sortDepth(): void {
    // Only what moves (Signe, people, wolves: no fixed bounds) and is on screen can change the order.
    const moving = this.onScreen.filter((s) => !s.bounds);
    const key = moving
      .map((s) => s.footprint())
      .map((f) => `${f.x},${f.y},${f.w},${f.h}`)
      .join('|') + `#${this.onScreen.length}`;
    if (key === this.lastSortKey) return;
    this.lastSortKey = key;
    const footprints = this.onScreen.map((s) => s.footprint());
    const rects = this.onScreen.map((s) => s.bounds ?? s.sprite.getBounds());
    depthOrder(footprints, (i, j) => rectsOverlap(rects[i]!, rects[j]!)).forEach((index, rank) => this.onScreen[index]!.sprite.setDepth(rank));
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
    const wasHollow = store.state.npcs[who.id].hollowed;
    const domainsBefore = store.state.domains.length;
    dialogueBox.open(who.id, () => {
      this.tapped = null;
      this.talkingWith = null;
      const name = NPCS.find((n) => n.id === who.id)!.name;
      if (!wasHollow && store.state.npcs[who.id].hollowed) {
        // Not the Hearth: a one-time reserve, so tell the player where the Power went.
        const gained = `+${tuning.values.hollowingReserve} Power, once. Your Hearth will refill less from now on.`;
        // Anyone close by sees it, and then the village knows (Daniel: only by evidence).
        sound.play('hollow');
        const witness = this.witnessOf(who.id);
        if (witness) {
          store.update((s) => A.seenHollowing(s, who.id, witness.id));
          bubbles.play([{ who: witness.id, text: '...' }]);
          hud.say(`${NPCS.find((n) => n.id === witness.id)!.name} saw. ${gained}`, 7000);
        } else {
          hud.say(`${gained} (Journal: Hearth)`, 6000);
        }
      } else if ((store.state.impressions[who.id]?.length ?? 0) > knewBefore) {
        hud.say(`You'll remember this about ${name}. (Journal: People)`, 3500);
      }
      if (store.state.domains.length > domainsBefore) {
        hud.announce('A new domain: Kin', 'You can feel the living now the way you feel the made: how they hold, and where they hurt. Kin is in your bar.');
        sound.play('chime');
      }
      // Conversations change the game (Offerings, promises, flags): keep them.
      this.autosave();
    });
  }

  /** Looks closely at a place (its Ink knot); what she learns goes into the journal map. */
  private lookAt(thing: MapObject): void {
    this.tapped = null;
    const damBefore = damOutcome(store.state);
    dialogueBox.open(thing.inspect!, () => {
      this.tapped = null;
      const dam = damOutcome(store.state);
      if (dam && dam !== damBefore) this.damDecided(dam);
      this.autosave();
    });
  }

  // --- The dam crisis (chapter 2, step 5) ---------------------------------------

  /** A rest in Järnfors: the bell rings, ticks, or the dam breaks in the night. */
  private damNight(night: 'rang' | 'ticked' | 'broke'): void {
    if (night === 'rang') {
      sound.play('fall');
      hud.announce('The flood-bell', 'You wake to it: the bell on the dam, ringing and ringing. A crack has opened across the crest. The masons give it three nights.');
    } else if (night === 'ticked') {
      sound.play('fall');
      if (thievesDue(store.state)) return this.thievesAtNight();
      const left = restsLeft(store.state);
      hud.say(`The bell rang all night. ${left === 1 ? 'One more night, the masons say.' : `${left} more nights, the masons say.`}`, 6000);
    } else {
      this.damDecided('broken');
    }
  }

  /** The dam is saved one way, or lost: the water goes where it goes. */
  private damDecided(outcome: DamOutcome): void {
    const n = this.world.map.numbers;
    const rect = (p: string): Tile[] => {
      const [x0, y0, x1, y1] = [n[`${p}X0`], n[`${p}Y0`], n[`${p}X1`], n[`${p}Y1`]];
      if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined) return [];
      const tiles: Tile[] = [];
      // Open ground floods; the buildings stand in it, rooftops in brown water.
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!this.world.isBlocked(x, y)) tiles.push({ x, y });
      return tiles;
    };
    const here = this.walker.tile;
    if (outcome === 'relief') store.update((s) => flood(s, rect('floodLower').filter((t) => t.x !== here.x || t.y !== here.y)));
    if (outcome === 'broken') {
      store.update((s) => flood(s, rect('floodCity').filter((t) => t.x !== here.x || t.y !== here.y)));
      sound.play('splash');
      hud.announce('The dam went at dawn', 'The city is rooftops in brown water. The people climbed above it in the night. Nobody blames you. They just say: when the dam went.');
    } else {
      sound.play('chime');
    }
    store.save();
    this.lastViewKey = '';
  }

  private talkToSomeoneBeside(): void {
    if (menuOpen() || this.walker.isMoving || this.fight) return;
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
    if (this.fight && !this.canActInFight()) return;
    if (this.kin) return this.aimKin(pointer.worldX, pointer.worldY);
    if (this.spell) return this.aimAt(pointer.worldX, pointer.worldY);
    if (this.fight) return this.fightTap(this.proj.pick({ x: pointer.worldX, y: pointer.worldY }));
    this.pendingVisit = null;
    const tile = this.proj.pick({ x: pointer.worldX, y: pointer.worldY });
    const tapped = this.spriteAt(pointer.worldX, pointer.worldY, (s) => !!s.obj?.npc || !!s.obj?.rest || !!s.obj?.inspect) ?? this.world.objectAt(tile.x, tile.y);
    const person = tapped?.npc ? this.people.find((p) => p.id === tapped.npc) : undefined;
    if (person) return this.walkBeside(() => this.sim.footprintOf(person.id), () => this.talkTo(person), person.id);
    // A place to rest: home, or the shelter once its door is mended.
    if (tapped?.rest && !this.world.isBroken(tapped)) {
      const home = tapped;
      return this.walkBeside(() => this.world.footprintOf(home), () => this.offerRest());
    }
    if (tapped?.inspect) {
      const thing = tapped;
      return this.walkBeside(() => this.world.footprintOf(thing), () => this.lookAt(thing));
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

/** How close someone must be for a hungry Echo to point them out, in tiles. */
const HUNGER_RANGE = 8;

function distance(a: Tile, b: Tile): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function between([min, max]: readonly [number, number]): number {
  return min + Math.random() * (max - min);
}
