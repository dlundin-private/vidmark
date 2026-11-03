import { KEEPSAKES } from '../../content/data/keepsakes';
import { NPCS } from '../../content/data/npcs';
import * as A from '../state/actions';
import type { GameStore } from '../state/store';
import { questStatuses } from '../systems/quests';
import { rememberedPeople } from '../systems/impressions';
import { PLACES } from '../../content/data/places';
import { ExploredMap } from '../state/explored';
import type { Tile } from '../iso/types';

/** What the Map page needs to know about the world. */
export interface SketchSource {
  width: number;
  height: number;
  /** Ground frame (tileset order in scripts/generate-placeholders.mjs). */
  frame(x: number, y: number): number;
  /** Type of the object standing on a tile, if any. */
  objectAt(x: number, y: number): string | undefined;
  places: readonly { id: string; name: string; tile: Tile }[];
  signe(): Tile;
}

type Page = 'quests' | 'map' | 'people' | 'hearth' | 'keepsakes';

/**
 * Signe's journal: her quests, what she remembers of people, her Hearth (the people who have given her a
 * memory, stacked on her own Power like a pyramid) and her Keepsakes.
 * Open with the Journal button or J.
 */
export class Journal {
  private readonly root: HTMLDivElement;
  private page: Page = 'quests';
  private source: SketchSource | null = null;

  constructor(private readonly store: GameStore) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'journal';
    this.root.hidden = true;
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
    for (const type of ['keydown', 'keyup'] as const) {
      this.root.addEventListener(type, (e) => {
        e.stopPropagation();
        const key = (e as KeyboardEvent).key;
        if (type === 'keydown' && (key === 'Escape' || key === 'j' || key === 'J')) this.close();
      });
    }
    document.body.appendChild(this.root);
    store.subscribe(() => {
      if (this.isOpen) this.render();
    });
  }

  setMap(source: SketchSource): void {
    this.source = source;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(page?: Page): void {
    if (page) this.page = page;
    this.root.hidden = false;
    this.render();
    this.root.querySelector<HTMLButtonElement>('.journal-close')?.focus();
  }

  close(): void {
    this.root.hidden = true;
  }

  private render(): void {
    const panel = el('div', 'journal-panel');
    const tabs = el('div', 'journal-tabs');
    for (const [id, label] of [['quests', 'Quests'], ['map', 'Map'], ['people', 'People'], ['hearth', 'Hearth'], ['keepsakes', 'Keepsakes']] as const) {
      const b = button(label, () => {
        this.page = id;
        this.render();
      });
      b.className = this.page === id ? 'journal-tab active' : 'journal-tab';
      tabs.append(b);
    }
    const close = button('×', () => this.close());
    close.className = 'journal-close';
    panel.append(el('div', 'journal-head', [tabs, close]));
    const pages = { quests: () => this.quests(), map: () => this.map(), people: () => this.people(), hearth: () => this.hearth(), keepsakes: () => this.keepsakes() };
    panel.append(pages[this.page]());
    this.root.replaceChildren(panel);
  }

  private quests(): HTMLElement {
    const all = questStatuses(this.store.state).filter((q) => q.started);
    if (all.length === 0) return el('p', 'journal-empty', 'Nothing yet. Talk to people in the village.');
    const open = all.filter((q) => !q.outcome);
    const done = all.filter((q) => q.outcome);
    const card = (q: (typeof all)[number]) => {
      const giver = NPCS.find((n) => n.id === q.def.giver)?.name ?? '';
      const body = el('div', q.outcome ? 'quest done' : 'quest', [
        el('div', 'quest-title', q.def.title),
        el('div', 'quest-giver', giver),
        el('p', 'quest-summary', q.def.summary),
      ]);
      if (q.outcome) {
        body.append(el('p', 'quest-outcome', `✓ ${q.outcome.text}`));
      } else {
        const list = el('ul', 'quest-steps');
        for (const s of q.steps) list.append(el('li', s.done ? 'step done' : s.alternative ? 'step alt' : 'step', `${s.done ? '☑' : '☐'} ${s.text}`));
        body.append(list);
      }
      return body;
    };
    return el('div', 'journal-page', [
      ...(open.length ? [el('h3', '', 'Open'), ...open.map(card)] : []),
      ...(done.length ? [el('h3', '', 'Done'), ...done.map(card)] : []),
    ]);
  }

  /**
   * Her sketched map: drawn from what she has sketched, in ink on paper, in
   * the same isometric view as the world. Places she found are labelled.
   */
  private map(): HTMLElement {
    const src = this.source;
    if (!src) return el('p', 'journal-empty', 'No map yet.');
    const s = this.store.state;
    const explored = ExploredMap.fromBase64(s.sketched.tiles, src.width, src.height);
    const canvas = document.createElement('canvas');
    drawSketch(canvas, src, explored, s.sketched.places);
    const found = src.places.filter((p) => s.sketched.places.includes(p.id));
    const notes = found.map((p) => {
      const note = PLACES[p.id];
      const learned = note?.learnedFlag && s.flags[note.learnedFlag] ? note.learned : null;
      return el('div', 'place', [
        el('div', 'place-name', p.name),
        el('p', 'place-note', note?.found ?? ''),
        ...(learned ? [el('p', 'place-learned', learned)] : note?.hint ? [el('p', 'place-hint', note.hint)] : []),
      ]);
    });
    return el('div', 'journal-page', [
      el('p', 'journal-lead', 'I sketch what I saw whenever I stop. If I walk too long without stopping, I forget the start of the way.'),
      el('div', 'map-wrap', [canvas]),
      el('h3', '', `Places I've found (${found.length} of ${src.places.length})`),
      ...(notes.length ? notes : [el('p', 'journal-empty', 'Nothing yet.')]),
    ]);
  }

  /** What Signe remembers of each person: an outline, as she sees them now. */
  private people(): HTMLElement {
    const people = rememberedPeople(this.store.state);
    if (people.length === 0) return el('p', 'journal-empty', 'You haven\'t met anyone yet.');
    return el('div', 'journal-page', [
      el('p', 'journal-lead', 'Not what they said, exactly. What stayed with you.'),
      ...people.map((p) =>
        el('div', 'person', [
          el('div', 'person-name', p.name),
          ...(p.standing ? [el('div', 'person-standing', p.standing)] : []),
          ...p.lines.map((l) => el('p', l.blurred ? 'person-line blurred' : l.cold ? 'person-line cold' : 'person-line', l.text)),
        ]),
      ),
    ]);
  }

  /** The Hearth as a pyramid: Signe's own Power at the base, one block per giver above it. */
  private hearth(): HTMLElement {
    const s = this.store.state;
    const t = this.store.tuningValues;
    const consumed = new Set(s.weaves.filter((w) => w.anchor?.kind === 'offering').map((w) => (w.anchor as { npc: string }).npc));
    const givers = A.hearth(s);
    const blocks: HTMLElement[] = [];
    givers.forEach((id, i) => {
      const def = NPCS.find((n) => n.id === id)!;
      const gone = consumed.has(id);
      const block = el('div', gone ? 'hearth-block gone' : 'hearth-block', [
        el('div', 'hearth-name', `${def.name}  ${gone ? '±0' : `+${t.powerPerOffering}`}`),
        el('div', 'hearth-memory', gone ? 'Their memory went into a Weave.' : def.offering ?? 'A memory'),
      ]);
      block.style.width = `${Math.max(46, 74 - (givers.length - 1 - i) * 8)}%`;
      blocks.push(block);
    });
    const base = el('div', 'hearth-block base', [el('div', 'hearth-name', `Your own  +${t.basePower}`), el('div', 'hearth-memory', 'What you are without anyone')]);
    const pyramid = el('div', 'hearth-pyramid', [...blocks.reverse(), base]);
    const faithless = NPCS.filter((n) => s.npcs[n.id].offered && s.npcs[n.id].faithLost && !s.npcs[n.id].hollowed);
    const echoes = A.echoes(s);
    return el('div', 'journal-page', [
      el('p', 'journal-lead', `Your Hearth: the people who have given you a memory. Each one raises the Power you get back when you rest. Now: ${A.maxPower(s, t)} Power.`),
      pyramid,
      givers.length === 0 ? el('p', 'journal-empty', 'Nobody has given you a memory yet.') : el('span', '', ''),
      ...(faithless.length ? [el('h3', '', 'Lost faith in you'), ...faithless.map((n) => el('p', 'journal-line', `${n.name}: no longer part of your Hearth.`))] : []),
      ...(echoes.length ? [el('h3', '', 'Echoes you carry'), ...echoes.map((id) => el('p', 'journal-line', `${NPCS.find((n) => n.id === id)!.name}: everything they were, inside you now.`))] : []),
    ]);
  }

  private keepsakes(): HTMLElement {
    const s = this.store.state;
    const items = KEEPSAKES.filter((k) => !k.hiddenUntilLate && s.keepsakes[k.id].formed).map((k) => {
      const status = s.keepsakes[k.id].status;
      if (status === 'kept') return el('div', 'keepsake', [el('div', 'keepsake-title', k.title), el('p', 'keepsake-memory', k.memory)]);
      return el('div', 'keepsake gone', [
        el('div', 'keepsake-title', k.title),
        el('p', 'keepsake-memory', status === 'burned' ? 'Something used to be written here.' : 'Woven into something. You can feel its shape, not what it was.'),
      ]);
    });
    return el('div', 'journal-page', [el('p', 'journal-lead', 'The memories that make you who you are. Each can be burned for Power, once.'), ...items]);
  }
}

/** Ground frames (tileset order) the sketch tells apart. */
const ICE = new Set([4, 5, 10]);
const THIN = 13;
const WATER = 6;
const ROAD = new Set([8, 9]);
const ROCK = 12;
const WOOD = 11;

/**
 * Draws the journal map like a pencil and ink sketch: paper, a wash for the
 * ice, an inked shoreline, tick marks for trees, carets for mountains, dashes
 * for roads, and labels for places found. Only sketched tiles are drawn.
 */
/** What one patch of the map is, as she'd sketch it. */
type CellKind = 'lake' | 'cracked' | 'forest' | 'mountain' | 'land';

/** Tiles per sketched patch: she draws the shape of things, not every tile. */
const CELL = 4;

function drawSketch(canvas: HTMLCanvasElement, src: SketchSource, explored: ExploredMap, found: readonly string[]): void {
  // --- Reduce the world to patches -------------------------------------------------
  const cw = Math.ceil(src.width / CELL);
  const ch = Math.ceil(src.height / CELL);
  const seen = new Float32Array(cw * ch); // 0..1: how much of the patch she sketched
  const kind: CellKind[] = new Array(cw * ch).fill('land');
  const road = new Uint8Array(cw * ch);
  const building = new Uint8Array(cw * ch);
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let n = 0, ice = 0, thin = 0, trees = 0, rock = 0, roads = 0, houses = 0;
      for (let y = cy * CELL; y < Math.min(src.height, (cy + 1) * CELL); y++) {
        for (let x = cx * CELL; x < Math.min(src.width, (cx + 1) * CELL); x++) {
          if (!explored.has(x, y)) continue;
          n++;
          const fr = src.frame(x, y);
          const obj = src.objectAt(x, y) ?? '';
          if (ICE.has(fr) || fr === WATER) ice++;
          if (fr === THIN) thin++;
          if (fr === ROCK || obj.startsWith('mountain')) rock++;
          if (obj.startsWith('birch')) trees++;
          if (ROAD.has(fr) || fr === WOOD) roads++;
          if (/house|hut|boathouse|shelter|ruin/.test(obj)) houses++;
        }
      }
      const i = cy * cw + cx;
      seen[i] = n / (CELL * CELL);
      if (n === 0) continue;
      kind[i] = thin > n * 0.3 ? 'cracked' : ice + thin > n * 0.5 ? 'lake' : rock > n * 0.5 ? 'mountain' : trees > n * 0.2 ? 'forest' : 'land';
      road[i] = roads >= 2 ? 1 : 0;
      building[i] = houses > 0 ? 1 : 0;
    }
  }
  const at = (cx: number, cy: number) => (cx < 0 || cy < 0 || cx >= cw || cy >= ch ? -1 : cy * cw + cx);
  const isSeen = (cx: number, cy: number) => { const i = at(cx, cy); return i >= 0 && seen[i]! > 0.25; };

  // --- Frame: crop to what she has seen -------------------------------------------
  // Isometric, in patch units: one patch is a diamond 2 wide and 1 high.
  const iso = (cx: number, cy: number) => [cx - cy + ch, (cx + cy) / 2] as const;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    if (!isSeen(cx, cy)) continue;
    const [ix, iy] = iso(cx, cy);
    minX = Math.min(minX, ix); maxX = Math.max(maxX, ix + 2);
    minY = Math.min(minY, iy); maxY = Math.max(maxY, iy + 1);
  }
  if (!Number.isFinite(minX)) { const [ix, iy] = iso(cw / 2, ch / 2); minX = ix - 10; maxX = ix + 10; minY = iy - 5; maxY = iy + 5; }
  const pad = 2.5;
  const spanX = Math.max(maxX - minX + 2 * pad, 24);
  const spanY = Math.max(maxY - minY + 2 * pad, 12);
  const x0 = (minX + maxX) / 2 - spanX / 2;
  const y0 = (minY + maxY) / 2 - spanY / 2;
  const dpr = window.devicePixelRatio || 1;
  const k = (560 * dpr) / spanX;
  canvas.width = Math.round(spanX * k);
  canvas.height = Math.round(spanY * k);
  const g = canvas.getContext('2d')!;
  const P = (cx: number, cy: number) => { const [ix, iy] = iso(cx, cy); return [(ix - x0) * k, (iy - y0) * k] as const; };
  const centre = (cx: number, cy: number) => { const [x, y] = P(cx, cy); return [x + k, y + k / 2] as const; };
  const rnd = (a: number, b: number) => ((((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000) / 1000;
  const ink = '#3d3026';

  // Paper.
  g.fillStyle = '#ece2c9';
  g.fillRect(0, 0, canvas.width, canvas.height);

  // --- Washes: soft, overlapping blobs, so edges fade like pencil shading ---------
  // One path per wash, filled once, so overlaps don't darken into scallops.
  const wash = (colour: string, scale: number, include: (i: number) => boolean) => {
    g.fillStyle = colour;
    g.beginPath();
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      const i = at(cx, cy);
      if (seen[i]! <= 0.25 || !include(i)) continue;
      const [x, y] = centre(cx, cy);
      g.moveTo(x + k * scale, y);
      g.ellipse(x, y, k * scale, k * scale * 0.55, 0, 0, Math.PI * 2);
    }
    g.fill('nonzero');
  };
  wash('rgba(255, 250, 238, 0.5)', 1.5, () => true); // the part of the page she has drawn on
  wash('rgba(126, 156, 176, 0.3)', 1.1, (i) => kind[i] === 'lake' || kind[i] === 'cracked');

  // --- The shoreline: one inked line where lake meets land ------------------------
  g.strokeStyle = ink;
  g.lineWidth = Math.max(1.2, k * 0.09);
  g.lineCap = 'round';
  const water = (i: number) => kind[i] === 'lake' || kind[i] === 'cracked';
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    const i = at(cx, cy);
    if (!isSeen(cx, cy) || !water(i)) continue;
    // Each side of the patch's diamond that faces seen land gets a stroke.
    const [x, y] = P(cx, cy);
    const top = [x + k, y], right = [x + 2 * k, y + k / 2], bottom = [x + k, y + k], left = [x, y + k / 2];
    const sides: [number, number, number[], number[]][] = [[0, -1, left, top], [1, 0, top, right], [0, 1, right, bottom], [-1, 0, bottom, left]];
    for (const [dx, dy, a, b] of sides) {
      const j = at(cx + dx, cy + dy);
      if (j < 0 || !isSeen(cx + dx, cy + dy) || water(j)) continue;
      const wob = (rnd(cx * 7 + dx, cy * 7 + dy) - 0.5) * k * 0.18;
      g.beginPath();
      g.moveTo(a[0]!, a[1]!);
      g.quadraticCurveTo((a[0]! + b[0]!) / 2 + wob, (a[1]! + b[1]!) / 2 - wob, b[0]!, b[1]!);
      g.stroke();
    }
  }

  // --- Marks: a few trees, the odd peak, a crack, houses, roads -------------------
  g.lineWidth = Math.max(1, k * 0.07);
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    if (!isSeen(cx, cy)) continue;
    const i = at(cx, cy);
    const [x, y] = centre(cx, cy);
    const jx = (rnd(cx, cy) - 0.5) * k * 0.5;
    if (kind[i] === 'forest' && rnd(cy, cx) < 0.4) {
      // A little birch: a stroke with a small round crown.
      g.strokeStyle = '#55603f';
      g.beginPath(); g.moveTo(x + jx, y + k * 0.25); g.lineTo(x + jx, y - k * 0.35); g.stroke();
      g.beginPath(); g.arc(x + jx, y - k * 0.42, k * 0.17, 0, Math.PI * 2); g.stroke();
    }
    if (kind[i] === 'mountain' && (cx * 2 + cy) % 3 === 0) {
      g.strokeStyle = '#5c5248';
      g.beginPath(); g.moveTo(x - k * 0.55, y + k * 0.3); g.lineTo(x - k * 0.05 + jx * 0.3, y - k * 0.45); g.lineTo(x + k * 0.5, y + k * 0.3); g.stroke();
    }
    if (kind[i] === 'cracked') {
      g.strokeStyle = '#2f3e4b';
      g.beginPath(); g.moveTo(x - k * 0.7, y); g.lineTo(x - k * 0.25, y - k * 0.15); g.lineTo(x + k * 0.1, y + k * 0.12); g.lineTo(x + k * 0.7, y - k * 0.05); g.stroke();
    }
    if (building[i]) {
      g.strokeStyle = ink;
      g.fillStyle = '#d9cbaa';
      g.beginPath();
      g.moveTo(x - k * 0.22, y + k * 0.15); g.lineTo(x - k * 0.22, y - k * 0.08); g.lineTo(x, y - k * 0.28);
      g.lineTo(x + k * 0.22, y - k * 0.08); g.lineTo(x + k * 0.22, y + k * 0.15); g.closePath();
      g.fill(); g.stroke();
    }
  }
  // Roads: dashes from patch to neighbouring road patch.
  g.strokeStyle = '#7a5f45';
  g.lineWidth = Math.max(1, k * 0.08);
  g.setLineDash([k * 0.25, k * 0.2]);
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    const i = at(cx, cy);
    if (!road[i] || !isSeen(cx, cy)) continue;
    const [x, y] = centre(cx, cy);
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const j = at(cx + dx!, cy + dy!);
      if (j < 0 || !road[j] || !isSeen(cx + dx!, cy + dy!)) continue;
      const [x2, y2] = centre(cx + dx!, cy + dy!);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    }
  }
  g.setLineDash([]);

  // --- Places found, labelled neatly; a crowded label moves below its dot ---------
  const fontPx = Math.round(14 * dpr);
  g.font = `italic ${fontPx}px Georgia, serif`;
  g.textAlign = 'center';
  const tile = (t: Tile) => centre(t.x / CELL - 0.5, t.y / CELL - 0.5);
  const taken: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const free = (r: (typeof taken)[number]) => !taken.some((t) => r.x0 < t.x1 && t.x0 < r.x1 && r.y0 < t.y1 && t.y0 < r.y1);
  for (const p of src.places) {
    if (!found.includes(p.id)) continue;
    const [dx, dy] = tile(p.tile);
    g.fillStyle = '#7a2a20';
    g.beginPath(); g.arc(dx, dy, Math.max(3, 3 * dpr), 0, Math.PI * 2); g.fill();
    const w = g.measureText(p.name).width;
    let y = dy - fontPx * 0.6;
    let rect = { x0: dx - w / 2, y0: y - fontPx, x1: dx + w / 2, y1: y + 3 };
    if (!free(rect)) { y = dy + fontPx * 1.35; rect = { x0: dx - w / 2, y0: y - fontPx, x1: dx + w / 2, y1: y + 3 }; }
    taken.push(rect);
    g.fillStyle = '#2b221a';
    g.fillText(p.name, dx, y);
  }
  // Where she is now: a small cross.
  const [mx, my] = tile(src.signe());
  const r = Math.max(5, 5 * dpr);
  g.strokeStyle = '#a3241a';
  g.lineWidth = Math.max(2, 2 * dpr);
  g.beginPath();
  g.moveTo(mx - r, my - r); g.lineTo(mx + r, my + r);
  g.moveTo(mx + r, my - r); g.lineTo(mx - r, my + r);
  g.stroke();
}

function el(tag: string, className: string, children: (Node | string)[] | string = []): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof children === 'string') node.textContent = children;
  else node.append(...children);
  return node;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

const CSS = `
.journal { position: fixed; inset: 0; z-index: 16; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5);
  padding: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom)); box-sizing: border-box; }
.journal[hidden] { display: none; }
.journal-panel { width: min(600px, 100%); max-height: 100%; overflow-y: auto; box-sizing: border-box; padding: 12px 18px 18px;
  background: rgba(22, 20, 17, 0.98); border: 1px solid #4a4337; border-radius: 8px; color: #e8e2d6;
  font: 17px/1.45 Georgia, 'Times New Roman', serif; touch-action: pan-y; }
.journal-head { display: flex; justify-content: space-between; align-items: center; position: sticky; top: -12px; padding: 4px 0 8px;
  background: rgba(22, 20, 17, 0.98); }
.journal-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.journal-tab { background: none; color: #b9ad97; border: 1px solid #4a4337; border-radius: 6px; padding: 8px 14px; font: 16px system-ui, sans-serif; cursor: pointer; }
.journal-tab.active { color: #f0d9a8; border-color: #b8975a; }
.journal-close { background: none; border: none; color: #b9ad97; font-size: 26px; cursor: pointer; padding: 4px 10px; }
.journal-page h3 { font: 600 13px system-ui, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: #9a8f7c; margin: 16px 0 6px; }
.journal-lead { color: #cfc6b5; margin: 4px 0 10px; }
.journal-empty { color: #9a8f7c; font-style: italic; }
.journal-line { margin: 4px 0; }
.quest { border-left: 3px solid #b8975a; padding: 6px 0 6px 12px; margin: 8px 0 14px; }
.quest.done { border-left-color: #5d6b5a; color: #b5ad9e; }
.quest-title { font-size: 19px; color: #f0d9a8; }
.quest.done .quest-title { color: #c9c0ae; }
.quest-giver { font: 13px system-ui, sans-serif; color: #9a8f7c; }
.quest-summary { margin: 6px 0; }
.quest-steps { list-style: none; padding: 0; margin: 6px 0 0; }
.step { margin: 4px 0; }
.step.done { color: #9fb38f; }
.step.alt { color: #cfc6b5; font-style: italic; }
.quest-outcome { color: #b9c9a8; margin: 6px 0 0; }
.hearth-pyramid { display: flex; flex-direction: column; align-items: center; gap: 4px; margin: 10px 0; }
.hearth-block { box-sizing: border-box; padding: 8px 12px; border-radius: 4px; background: #3d3426; border: 1px solid #6b5a3c; text-align: center; }
.hearth-block.base { width: 92%; background: #2d2a25; border-color: #4a4337; }
.hearth-block.gone { opacity: 0.45; }
.hearth-name { color: #f0d9a8; font-size: 16px; white-space: pre; }
.hearth-memory { font-size: 14px; color: #cfc6b5; font-style: italic; }
.person { margin: 10px 0 16px; }
.person-name { color: #f0d9a8; font-size: 19px; }
.person-standing { font: 13px system-ui, sans-serif; color: #b8975a; margin-bottom: 2px; }
.person-line { margin: 4px 0 4px 12px; text-indent: -12px; }
.person-line::before { content: '– '; color: #6b5a3c; }
.person-line.blurred { opacity: 0.5; font-style: italic; }
.person-line.cold { color: #aeb8c2; }
.map-wrap { background: #e9dfc6; border-radius: 4px; padding: 6px; margin: 6px 0 10px; box-shadow: inset 0 0 18px rgba(80, 60, 30, 0.35); }
.map-wrap canvas { display: block; width: 100%; height: auto; image-rendering: auto; }
.place { margin: 8px 0 12px; }
.place-name { color: #f0d9a8; font-size: 17px; }
.place-note { margin: 2px 0; }
.place-hint { margin: 2px 0; color: #b8975a; font-style: italic; font-size: 15px; }
.place-learned { margin: 2px 0; color: #cfc6b5; font-size: 15px; }
.keepsake { margin: 10px 0; }
.keepsake-title { color: #f0d9a8; font-size: 18px; }
.keepsake-memory { margin: 2px 0; }
.keepsake.gone { opacity: 0.45; }
.keepsake.gone .keepsake-memory { font-style: italic; }
`;
