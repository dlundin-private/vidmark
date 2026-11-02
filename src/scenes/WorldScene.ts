import Phaser from 'phaser';
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  WALK_MS_PER_TILE,
  WALK_STEPS_PER_TILE,
  WORLD_TOP_MARGIN,
} from '../config';
import { IsoProjection, depthOrder, rectsOverlap, roundPoint, tilesInView, type Footprint, type Rect, type Tile } from '../iso';
import { TileWalker } from '../systems/movement';
import { findPath, isWalkable } from '../systems/pathfinding';
import { parseTiledMap, type IsoMap, type TiledJson } from '../systems/tiledMap';
import type { NpcId } from '../../content/data/npcs';
import { dialogueBox, store } from '../game';
import { isBeside, pathToBeside } from '../systems/interaction';
import { setPosition } from '../state';
import { TILESET_KEY } from './BootScene';
import mapJson from '../../assets/maps/kallsjo.json';

const SIGNE_SPRITE = 'signe';
const MARKER_SPRITE = 'marker';
/** Tileset frame drawn by the collision debug overlay (the "blocked" tile). */
const BLOCKED_FRAME = 7;
/** Extra world pixels around the camera view that are drawn too, so edges never pop in. */
const VIEW_MARGIN = 64;

/** Something drawn in the entity layer and depth-sorted by its footprint. */
interface Sortable {
  sprite: Phaser.GameObjects.Image;
  footprint: () => Footprint;
  /** World rectangle of a sprite that never moves; null for Signe, who is always drawn. */
  bounds: Rect | null;
}

type DirectionKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key[]>;

/** Someone Signe can talk to, standing on a tile. */
interface Person {
  id: NpcId;
  tile: Tile;
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

export class WorldScene extends Phaser.Scene {
  private map!: IsoMap;
  private proj!: IsoProjection;
  private walker!: TileWalker;
  private signe!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.Blitter;
  private collisionOverlay!: Phaser.GameObjects.Blitter;
  private entityLayer!: Phaser.GameObjects.Layer;
  private sortables: Sortable[] = [];
  /** The sortables currently on (or near) screen; only these are drawn and depth-sorted. */
  private onScreen: Sortable[] = [];
  private lastViewKey = '';
  private lastSortKey = '';
  private keys!: DirectionKeys;
  /** Last direction tapped, kept until used: a tap can go down and up within one frame. */
  private tapped: keyof DirectionKeys | null = null;
  private people: Person[] = [];
  /** Who Signe is walking over to talk to. */
  private pendingTalk: Person | null = null;

  constructor() {
    super('World');
  }

  create(): void {
    // create() runs again on every restart of this same scene object.
    this.sortables = [];
    this.onScreen = [];
    this.lastViewKey = '';
    this.lastSortKey = '';
    this.tapped = null;
    this.people = [];
    this.pendingTalk = null;
    this.map = parseTiledMap(mapJson as TiledJson);
    this.proj = IsoProjection.forMap(this.map.height, TILE_WIDTH, TILE_HEIGHT, WORLD_TOP_MARGIN);
    const world = this.proj.worldSize(this.map.width, this.map.height);

    // Draw order between layers is fixed; inside the entity layer it comes from the footprints.
    const groundLayer = this.add.layer();
    const overlayLayer = this.add.layer();
    this.entityLayer = this.add.layer();

    // Ground tiles are blitted for the visible area only (see refreshView).
    this.ground = this.add.blitter(0, 0, TILESET_KEY);
    groundLayer.add(this.ground);
    this.collisionOverlay = this.add.blitter(0, 0, TILESET_KEY).setVisible(false);
    overlayLayer.add(this.collisionOverlay);

    this.marker = this.add.image(0, 0, MARKER_SPRITE).setOrigin(0.5, 0).setVisible(false);
    overlayLayer.add(this.marker);

    for (const obj of this.map.objects) {
      const fp = obj.footprint;
      const origin = IsoProjection.footprintOrigin(fp);
      const anchor = this.proj.footprintBottom(fp);
      const sprite = this.add.image(anchor.x, anchor.y, obj.sprite).setOrigin(origin.x, origin.y).setVisible(false);
      const expectedWidth = (fp.w + fp.h) * this.proj.halfW;
      if (sprite.width !== expectedWidth) {
        console.warn(`Sprite "${obj.sprite}" is ${sprite.width}px wide; a ${fp.w}x${fp.h} footprint needs ${expectedWidth}px`);
      }
      this.entityLayer.add(sprite);
      const b = sprite.getBounds();
      this.sortables.push({ sprite, footprint: () => fp, bounds: { x: b.x, y: b.y, width: b.width, height: b.height } });
      if (obj.npc) this.people.push({ id: obj.npc as NpcId, tile: { x: fp.x, y: fp.y }, sprite });
    }

    const saved = store.state.position;
    const start = saved && isWalkable(this.map, saved) ? saved : this.map.spawn;
    this.walker = new TileWalker(start, WALK_MS_PER_TILE, WALK_STEPS_PER_TILE);
    this.signe = this.add.image(0, 0, SIGNE_SPRITE).setOrigin(0.5, 1);
    this.entityLayer.add(this.signe);
    this.sortables.push({ sprite: this.signe, footprint: () => this.walker.footprint, bounds: null });
    this.placeSigne();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, world.width, world.height);
    cam.setRoundPixels(true);
    cam.startFollow(this.signe, true);

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
    const generation = store.generation;
    const unsubscribe = store.subscribe(() => {
      if (store.generation !== generation) this.scene.restart();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  update(_time: number, delta: number): void {
    if (!dialogueBox.isOpen) this.handleKeys();
    const entered = this.walker.update(delta);
    if (!this.walker.isMoving) {
      this.marker.setVisible(false);
      if (entered.length > 0) this.autosave();
      const who = this.pendingTalk;
      this.pendingTalk = null;
      if (who && isBeside(this.walker.tile, who.tile)) this.talkTo(who);
    }
    this.placeSigne();
    this.refreshView();
    this.sortDepth();
  }

  /**
   * Draws the ground and shows the objects around the camera; everything else
   * stays hidden. Runs when the camera has moved far enough to matter.
   */
  private refreshView(): void {
    const cam = this.cameras.main;
    cam.preRender(); // make worldView match this frame's follow position
    const v = cam.worldView;
    const key = `${Math.floor(v.x / VIEW_MARGIN)},${Math.floor(v.y / VIEW_MARGIN)},${v.width},${v.height},${this.collisionOverlay.visible}`;
    if (key === this.lastViewKey) return;
    this.lastViewKey = key;

    // The margin is at least one key step, so the area drawn always covers the real view.
    const view: Rect = { x: v.x - VIEW_MARGIN, y: v.y - VIEW_MARGIN, width: v.width + 2 * VIEW_MARGIN, height: v.height + 2 * VIEW_MARGIN };
    this.ground.clear();
    this.collisionOverlay.clear();
    for (const t of tilesInView(this.proj, view, this.map.width, this.map.height)) {
      const top = this.proj.toWorld(t.x, t.y);
      const frame = this.map.ground[t.y * this.map.width + t.x] ?? -1;
      if (frame >= 0) this.ground.create(top.x - this.proj.halfW, top.y, frame);
      if (this.collisionOverlay.visible && this.map.isBlocked(t.x, t.y)) {
        this.collisionOverlay.create(top.x - this.proj.halfW, top.y, BLOCKED_FRAME);
      }
    }

    for (const s of this.onScreen) s.sprite.setVisible(false);
    this.onScreen = this.sortables.filter((s) => !s.bounds || rectsOverlap(s.bounds, view));
    for (const s of this.onScreen) s.sprite.setVisible(true);
    this.lastSortKey = '';
  }

  /** Saves whenever Signe comes to a stop. */
  private autosave(): void {
    store.update((s) => setPosition(s, this.walker.tile));
    store.save();
  }

  private talkTo(who: Person): void {
    this.tapped = null;
    dialogueBox.open(who.id, () => {
      this.tapped = null;
      // Conversations change the game (Offerings, promises, flags): keep them.
      this.autosave();
    });
  }

  private talkToSomeoneBeside(): void {
    if (dialogueBox.isOpen || this.walker.isMoving) return;
    const who = this.people.find((p) => isBeside(this.walker.tile, p.tile));
    if (who) this.talkTo(who);
  }

  /** The person drawn under a world point, frontmost first, ignoring transparent pixels. */
  private personAt(x: number, y: number): Person | null {
    const hits = this.people.filter(({ sprite }) => {
      const left = sprite.x - sprite.displayOriginX;
      const top = sprite.y - sprite.displayOriginY;
      const px = Math.floor(x - left);
      const py = Math.floor(y - top);
      if (px < 0 || py < 0 || px >= sprite.width || py >= sprite.height) return false;
      return this.textures.getPixelAlpha(px, py, sprite.texture.key) > 0;
    });
    hits.sort((a, b) => b.sprite.depth - a.sprite.depth);
    return hits[0] ?? null;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (dialogueBox.isOpen) return;
    this.pendingTalk = null;
    const tile = this.proj.pick({ x: pointer.worldX, y: pointer.worldY });
    const who = this.personAt(pointer.worldX, pointer.worldY) ?? this.people.find((p) => p.tile.x === tile.x && p.tile.y === tile.y);
    if (who) return this.walkToTalk(who);
    this.walkTo(tile);
  }

  /** Walks beside someone, then talks; talks at once if already beside them. */
  private walkToTalk(who: Person): void {
    const path = pathToBeside(this.map, this.walker.planningTile, who.tile);
    if (!path) return;
    if (path.length === 0 && !this.walker.isMoving) return this.talkTo(who);
    this.walker.setPath(path);
    this.pendingTalk = who;
    const end = path.at(-1) ?? this.walker.planningTile;
    const top = this.proj.toWorld(end.x, end.y);
    this.marker.setPosition(top.x, top.y).setVisible(true);
  }

  private walkTo(target: Tile): void {
    const path = findPath(this.map, this.walker.planningTile, target);
    if (!path) return; // Blocked, outside the map or unreachable: do nothing.
    this.walker.setPath(path);
    const top = this.proj.toWorld(target.x, target.y);
    this.marker.setPosition(top.x, top.y).setVisible(path.length > 0 || this.walker.isMoving);
  }

  private handleKeys(): void {
    if (this.tapped || this.keys.up.concat(this.keys.down, this.keys.left, this.keys.right).some((k) => k.isDown)) {
      this.pendingTalk = null;
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
    if (isWalkable(this.map, next)) {
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

  /** Puts Signe's feet on her (interpolated) tile, on whole pixels. */
  private placeSigne(): void {
    const v = this.walker.visual;
    const p = roundPoint(this.proj.footprintBottom({ x: v.x, y: v.y, w: 1, h: 1 }));
    this.signe.setPosition(p.x, p.y);
  }

  /** Re-sorts what's on screen when the set changed or Signe's footprint did. */
  private sortDepth(): void {
    const f = this.walker.footprint;
    const key = `${f.x},${f.y},${f.w},${f.h}`;
    if (key === this.lastSortKey) return;
    this.lastSortKey = key;
    const footprints = this.onScreen.map((s) => s.footprint());
    depthOrder(footprints).forEach((index, rank) => this.onScreen[index]!.sprite.setDepth(rank));
  }
}
