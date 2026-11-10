import Phaser from 'phaser';
import { roundPoint, type Footprint, type IsoProjection, type Tile } from '../iso';
import type { FightEvent, Wolf, WolfFight } from '../systems/combat';

const WOLF_SPRITE = 'wolf';
const INTENT_SPRITE = 'fx-intent';
const BITE_SPRITE = 'fx-bite';
/** How fast wolves run when they act, ms per tile. */
const WOLF_MS_PER_TILE = 120;
const HOLLOW_TINT = 0x8c8c94;

/** One step of the wolves' turn being shown. */
type Beat =
  | { kind: 'run'; wolf: number; path: Tile[]; ms: number }
  | { kind: 'pause'; wolf: number; ms: number; tint?: number; fade?: boolean; away?: Tile; event?: FightEvent };

/**
 * Draws the wolf fight: the wolves (depth-sorted with everything else), where
 * each will run and bite next (design: enemies show their move before acting),
 * and a bar with whose turn it is. Plays the wolves' turn one beat at a time,
 * on the scene's own clock, so it also runs when frames are stepped by hand.
 */
export class FightView {
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();
  /** Where each wolf is drawn, in (fractional) tiles. */
  private readonly visual = new Map<number, { x: number; y: number }>();
  private readonly marks: Phaser.GameObjects.Image[] = [];
  private readonly bar: HTMLDivElement;
  private readonly barText: HTMLSpanElement;
  private readonly endButton: HTMLButtonElement;
  private beats: Beat[] = [];
  private beatMs = 0;
  private onEvent: (e: FightEvent) => void = () => undefined;
  private onDone: () => void = () => undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly proj: IsoProjection,
    private readonly fight: WolfFight,
    entityLayer: Phaser.GameObjects.Layer,
    private readonly overlayLayer: Phaser.GameObjects.Layer,
    onEndTurn: () => void,
    /** Sprite per unit, by its id (wolves by default; Knut and his thieves on the crest). */
    spriteFor: (id: number) => string = () => WOLF_SPRITE,
    /** What the bar calls the enemy. */
    private readonly enemies = 'Wolves',
  ) {
    for (const w of fight.wolves) {
      const sprite = scene.add.image(0, 0, spriteFor(w.id)).setOrigin(0.5, 1);
      entityLayer.add(sprite);
      this.sprites.set(w.id, sprite);
      this.visual.set(w.id, { ...w.at });
    }
    this.bar = document.createElement('div');
    this.bar.className = 'fight-bar';
    this.barText = document.createElement('span');
    this.endButton = document.createElement('button');
    this.endButton.type = 'button';
    this.endButton.textContent = 'End turn';
    this.endButton.addEventListener('click', onEndTurn);
    this.bar.append(this.barText, this.endButton);
    if (!document.getElementById('fight-css')) {
      const style = document.createElement('style');
      style.id = 'fight-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    document.body.appendChild(this.bar);
    this.refresh();
  }

  get animating(): boolean {
    return this.beats.length > 0;
  }

  /** Wolves to depth-sort with the world: their footprint follows where they are drawn. */
  sortables(): { sprite: Phaser.GameObjects.Image; footprint: () => Footprint }[] {
    return this.fight.wolves.map((w) => ({
      sprite: this.sprites.get(w.id)!,
      footprint: () => {
        const v = this.visual.get(w.id)!;
        return { x: Math.round(v.x), y: Math.round(v.y), w: 1, h: 1 };
      },
    }));
  }

  /** For the depth-sort key: changes whenever a wolf moves. */
  sortKey(): string {
    return [...this.visual.values()].map((v) => `${Math.round(v.x)},${Math.round(v.y)}`).join('|');
  }

  /** Redraws the shown runs and the turn bar from the fight as it is now. */
  refresh(): void {
    for (const m of this.marks) m.destroy();
    this.marks.length = 0;
    const showIntents = this.fight.phase === 'signe' && !this.animating;
    if (showIntents) {
      for (const w of this.fight.hunting) {
        w.intent.forEach((step, i) => {
          const last = i === w.intent.length - 1;
          this.mark(step, last && w.bites ? BITE_SPRITE : INTENT_SPRITE);
        });
        if (w.intent.length === 0 && w.bites) this.mark(w.at, BITE_SPRITE);
      }
    }
    const left = this.fight.actionsLeft;
    this.barText.textContent =
      this.fight.phase === 'over'
        ? 'The wolves are gone.'
        : this.fight.phase === 'signe' && !this.animating
          ? `${this.enemies}: ${this.fight.hunting.length}. Your turn: ${left} action${left === 1 ? '' : 's'} left.`
          : 'The wolves move…';
    this.endButton.hidden = !(this.fight.phase === 'signe' && !this.animating);
    this.placeSprites();
  }

  /** Shows what happened, beat by beat, calling `onEvent` as each one lands, then `onDone`. */
  play(events: FightEvent[], onEvent: (e: FightEvent) => void, onDone: () => void): void {
    this.onEvent = onEvent;
    this.onDone = onDone;
    for (const e of events) this.beats.push(...this.beatsFor(e));
    this.beatMs = 0;
    if (this.beats.length === 0) {
      onDone();
      return;
    }
    this.startBeat();
    this.refresh();
  }

  update(delta: number): void {
    const beat = this.beats[0];
    if (!beat) return;
    this.beatMs += delta;
    const k = Math.min(1, this.beatMs / beat.ms);
    const v = this.visual.get(beat.wolf)!;
    const sprite = this.sprites.get(beat.wolf)!;
    if (beat.kind === 'run') {
      const steps = beat.path.length;
      const pos = k * steps;
      const i = Math.min(steps - 1, Math.floor(pos));
      const from = i === 0 ? this.startOf(beat) : beat.path[i - 1]!;
      const to = beat.path[i]!;
      const f = pos - i;
      v.x = from.x + (to.x - from.x) * Math.min(1, f);
      v.y = from.y + (to.y - from.y) * Math.min(1, f);
    } else {
      if (beat.fade) sprite.setAlpha(1 - k);
      if (beat.away) {
        v.x = beat.away.x * k + this.startOf(beat).x * (1 - k);
        v.y = beat.away.y * k + this.startOf(beat).y * (1 - k);
      }
    }
    this.placeSprites();
    if (k < 1) return;
    if (beat.kind === 'run') Object.assign(v, beat.path.at(-1)!);
    if (beat.kind === 'pause' && beat.fade) sprite.setVisible(false);
    this.beats.shift();
    this.beatMs = 0;
    if (this.beats.length > 0) this.startBeat();
    else {
      this.refresh();
      this.onDone();
    }
  }

  destroy(): void {
    for (const s of this.sprites.values()) s.destroy();
    for (const m of this.marks) m.destroy();
    this.bar.remove();
  }

  private starts = new Map<Beat, Tile>();

  private startOf(beat: Beat): Tile {
    return this.starts.get(beat)!;
  }

  private startBeat(): void {
    const beat = this.beats[0]!;
    const v = this.visual.get(beat.wolf)!;
    this.starts.set(beat, { x: v.x, y: v.y });
    const sprite = this.sprites.get(beat.wolf)!;
    if (beat.kind === 'pause') {
      if (beat.tint !== undefined) sprite.setTint(beat.tint);
      if (beat.event) this.onEvent(beat.event);
      if (beat.event?.kind === 'bite') this.scene.cameras.main.shake(160, 0.004);
    }
  }

  private beatsFor(e: FightEvent): Beat[] {
    switch (e.kind) {
      case 'ran':
        return [{ kind: 'run', wolf: e.wolf, path: e.path, ms: e.path.length * WOLF_MS_PER_TILE }];
      case 'bite':
        return [{ kind: 'pause', wolf: e.wolf, ms: 360, tint: 0xffb0a0, event: e }, { kind: 'pause', wolf: e.wolf, ms: 1, tint: 0xffffff }];
      case 'hit':
        return [{ kind: 'pause', wolf: e.wolf, ms: 260, tint: 0xffe0c0, event: e }, { kind: 'pause', wolf: e.wolf, ms: 1, tint: 0xffffff }];
      case 'drowned':
        return [{ kind: 'pause', wolf: e.wolf, ms: 520, fade: true, event: e }];
      case 'fled':
        return [{ kind: 'pause', wolf: e.wolf, ms: 700, fade: true, away: this.awayFrom(e.wolf, 6), event: e }];
      case 'yielded':
        // Down where he stands: greyed, not gone.
        return [{ kind: 'pause', wolf: e.wolf, ms: 600, tint: 0xa8a8b0, event: e }];
      case 'packFled':
        return [{ kind: 'pause', wolf: 0, ms: 1, event: e }];
    }
  }

  /** Hollowed: the wolf greys out and wanders off, slowly, going nowhere in particular. */
  hollowed(id: number, done: () => void): void {
    this.beats.push({ kind: 'pause', wolf: id, ms: 1400, tint: HOLLOW_TINT, fade: true, away: this.awayFrom(id, 3) });
    this.onEvent = () => undefined;
    this.onDone = done;
    this.beatMs = 0;
    this.startBeat();
    this.refresh();
  }

  private awayFrom(id: number, tiles: number): Tile {
    const w: Wolf = this.fight.wolves[id]!;
    const dx = Math.sign(w.at.x - this.fight.signe.x) || 1;
    const dy = Math.sign(w.at.y - this.fight.signe.y) || -1;
    return { x: w.at.x + dx * Math.ceil(tiles / 2), y: w.at.y + dy * tiles };
  }

  private mark(t: Tile, key: string): void {
    const top = this.proj.toWorld(t.x, t.y);
    const img = this.scene.add.image(top.x - this.proj.halfW, top.y, key).setOrigin(0, 0);
    this.overlayLayer.add(img);
    this.marks.push(img);
  }

  private placeSprites(): void {
    for (const [id, sprite] of this.sprites) {
      const v = this.visual.get(id)!;
      const p = roundPoint(this.proj.footprintBottom({ x: v.x, y: v.y, w: 1, h: 1 }));
      sprite.setPosition(p.x, p.y);
    }
  }
}

const CSS = `
.fight-bar { position: fixed; z-index: 6; top: max(8px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%);
  display: flex; gap: 10px; align-items: center; padding: 6px 8px 6px 14px; border-radius: 8px; background: rgba(40, 14, 10, 0.86);
  border: 1px solid #7a3326; color: #f3e1d6; font: 16px/1.3 system-ui, sans-serif; white-space: nowrap; }
.fight-bar button { background: #6b2a1f; color: #fff; border: 1px solid #a4493a; border-radius: 6px; padding: 8px 14px; font: inherit; cursor: pointer; }
.fight-bar button[hidden] { display: none; }
@media (max-width: 520px) { .fight-bar { top: auto; bottom: calc(120px + env(safe-area-inset-bottom)); font-size: 15px; } }
`;
