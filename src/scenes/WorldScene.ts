import Phaser from 'phaser';
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  WALK_MS_PER_TILE,
  WALK_STEPS_PER_TILE,
  WORLD_TOP_MARGIN,
} from '../config';
import { IsoProjection, depthOrder, roundPoint, type Footprint, type Tile } from '../iso';
import { TileWalker } from '../systems/movement';
import { findPath, isWalkable } from '../systems/pathfinding';
import { parseTiledMap, type IsoMap, type TiledJson } from '../systems/tiledMap';
import { store } from '../game';
import { setPosition } from '../state';
import { TILESET_KEY } from './BootScene';
import testMapJson from '../../assets/maps/test-map.json';

const SIGNE_SPRITE = 'signe';
const MARKER_SPRITE = 'marker';
/** Tileset frame drawn by the collision debug overlay (the "blocked" tile). */
const BLOCKED_FRAME = 7;

/** Something drawn in the entity layer and depth-sorted by its footprint. */
interface Sortable {
  sprite: Phaser.GameObjects.Image;
  footprint: () => Footprint;
}

type DirectionKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key[]>;

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
  private collisionOverlay!: Phaser.GameObjects.RenderTexture;
  private entityLayer!: Phaser.GameObjects.Layer;
  private sortables: Sortable[] = [];
  private lastSortKey = '';
  private keys!: DirectionKeys;
  /** Last direction tapped, kept until used: a tap can go down and up within one frame. */
  private tapped: keyof DirectionKeys | null = null;

  constructor() {
    super('World');
  }

  create(): void {
    // create() runs again on every restart of this same scene object.
    this.sortables = [];
    this.lastSortKey = '';
    this.tapped = null;
    this.map = parseTiledMap(testMapJson as TiledJson);
    this.proj = IsoProjection.forMap(this.map.height, TILE_WIDTH, TILE_HEIGHT, WORLD_TOP_MARGIN);
    const world = this.proj.worldSize(this.map.width, this.map.height);

    // Draw order between layers is fixed; inside the entity layer it comes from the footprints.
    const groundLayer = this.add.layer();
    const overlayLayer = this.add.layer();
    this.entityLayer = this.add.layer();

    groundLayer.add(this.drawTiles(world, (i) => this.map.ground[i] ?? -1));
    this.collisionOverlay = this.drawTiles(world, (i) =>
      this.map.isBlocked(i % this.map.width, Math.floor(i / this.map.width)) ? BLOCKED_FRAME : -1,
    );
    this.collisionOverlay.setVisible(false);
    overlayLayer.add(this.collisionOverlay);

    this.marker = this.add.image(0, 0, MARKER_SPRITE).setOrigin(0.5, 0).setVisible(false);
    overlayLayer.add(this.marker);

    for (const obj of this.map.objects) {
      const fp = obj.footprint;
      const origin = IsoProjection.footprintOrigin(fp);
      const anchor = this.proj.footprintBottom(fp);
      const sprite = this.add.image(anchor.x, anchor.y, obj.sprite).setOrigin(origin.x, origin.y);
      const expectedWidth = (fp.w + fp.h) * this.proj.halfW;
      if (sprite.width !== expectedWidth) {
        console.warn(`Sprite "${obj.sprite}" is ${sprite.width}px wide; a ${fp.w}x${fp.h} footprint needs ${expectedWidth}px`);
      }
      this.entityLayer.add(sprite);
      this.sortables.push({ sprite, footprint: () => fp });
    }

    const saved = store.state.position;
    const start = saved && isWalkable(this.map, saved) ? saved : this.map.spawn;
    this.walker = new TileWalker(start, WALK_MS_PER_TILE, WALK_STEPS_PER_TILE);
    this.signe = this.add.image(0, 0, SIGNE_SPRITE).setOrigin(0.5, 1);
    this.entityLayer.add(this.signe);
    this.sortables.push({ sprite: this.signe, footprint: () => this.walker.footprint });
    this.placeSigne();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, world.width, world.height);
    cam.setRoundPixels(true);
    cam.startFollow(this.signe, true);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.keys = this.createKeys();
    this.input.keyboard?.on('keydown-C', () => this.collisionOverlay.setVisible(!this.collisionOverlay.visible));

    // A new game or a loaded save replaces the whole state: rebuild the scene from it.
    const generation = store.generation;
    const unsubscribe = store.subscribe(() => {
      if (store.generation !== generation) this.scene.restart();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  update(_time: number, delta: number): void {
    this.handleKeys();
    const entered = this.walker.update(delta);
    if (!this.walker.isMoving) {
      this.marker.setVisible(false);
      if (entered.length > 0) this.autosave();
    }
    this.placeSigne();
    this.sortDepth();
  }

  /** Saves whenever Signe comes to a stop. */
  private autosave(): void {
    store.update((s) => setPosition(s, this.walker.tile));
    store.save();
  }

  /** Renders one tileset frame per map tile (frame -1 = nothing) into a static texture. */
  private drawTiles(world: { width: number; height: number }, frameAt: (index: number) => number) {
    const rt = this.add.renderTexture(0, 0, world.width, world.height).setOrigin(0, 0);
    rt.beginDraw();
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const frame = frameAt(y * this.map.width + x);
        if (frame < 0) continue;
        const top = this.proj.toWorld(x, y);
        rt.batchDrawFrame(TILESET_KEY, frame, top.x - this.proj.halfW, top.y);
      }
    }
    rt.endDraw();
    return rt;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const target = this.proj.pick({ x: pointer.worldX, y: pointer.worldY });
    const path = findPath(this.map, this.walker.planningTile, target);
    if (!path) return; // Blocked, outside the map or unreachable: do nothing.
    this.walker.setPath(path);
    const top = this.proj.toWorld(target.x, target.y);
    this.marker.setPosition(top.x, top.y).setVisible(path.length > 0 || this.walker.isMoving);
  }

  private handleKeys(): void {
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

  /** Re-sorts the entity layer when any footprint changed. */
  private sortDepth(): void {
    const footprints = this.sortables.map((s) => s.footprint());
    const key = footprints.map((f) => `${f.x},${f.y},${f.w},${f.h}`).join('|');
    if (key === this.lastSortKey) return;
    this.lastSortKey = key;
    depthOrder(footprints).forEach((index, rank) => this.sortables[index]!.sprite.setDepth(rank));
  }
}
