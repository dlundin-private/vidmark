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
const SHORE = new Set([2, 3]);
const ROCK = 12;
const WOOD = 11;

/**
 * Draws the journal map like a pencil and ink sketch: paper, a wash for the
 * ice, an inked shoreline, tick marks for trees, carets for mountains, dashes
 * for roads, and labels for places found. Only sketched tiles are drawn.
 */
function drawSketch(canvas: HTMLCanvasElement, src: SketchSource, explored: ExploredMap, found: readonly string[]): void {
  // Isometric, 1 unit per half tile; cropped to what she has sketched, so a
  // short walk fills the page and the map grows as she explores.
  const iso = (x: number, y: number) => [x - y + src.height, (x + y) / 2] as const;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (!explored.has(x, y)) continue;
      const [ix, iy] = iso(x, y);
      minX = Math.min(minX, ix); maxX = Math.max(maxX, ix + 2);
      minY = Math.min(minY, iy); maxY = Math.max(maxY, iy + 1);
    }
  }
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = 40; maxY = 20; }
  // A margin, and never zoomed in so far that a handful of tiles fills the page.
  const pad = 6;
  const spanX = Math.max(maxX - minX + 2 * pad, 90);
  const spanY = Math.max(maxY - minY + 2 * pad, 45);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const x0 = cx - spanX / 2, y0 = cy - spanY / 2;

  const dpr = window.devicePixelRatio || 1;
  const cssWidth = 560;
  const k = (cssWidth * dpr) / spanX; // canvas pixels per unit
  canvas.width = Math.round(spanX * k);
  canvas.height = Math.round(spanY * k);
  const g = canvas.getContext('2d')!;
  const px = (x: number, y: number) => {
    const [ix, iy] = iso(x, y);
    return [(ix - x0) * k, (iy - y0) * k] as const;
  };
  const wob = (x: number, y: number) => ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 7) / 7;

  g.fillStyle = '#e9dfc6';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const tw = 2 * k, th = k; // one tile's diamond bounding box
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (!explored.has(x, y)) continue;
      const f = src.frame(x, y);
      const [ax, ay] = px(x, y);
      if (ax < -tw || ay < -th || ax > canvas.width || ay > canvas.height) continue;
      const obj = src.objectAt(x, y);
      // Washes, as a soft diamond.
      g.fillStyle = ICE.has(f) ? 'rgba(120, 150, 170, 0.30)' : f === THIN ? 'rgba(85, 105, 125, 0.45)' : f === WATER ? 'rgba(40, 55, 70, 0.75)'
        : SHORE.has(f) ? 'rgba(150, 125, 90, 0.28)' : f === ROCK ? 'rgba(110, 100, 90, 0.22)' : 'rgba(255, 250, 235, 0.45)';
      g.beginPath();
      g.moveTo(ax + tw / 2, ay); g.lineTo(ax + tw, ay + th / 2); g.lineTo(ax + tw / 2, ay + th); g.lineTo(ax, ay + th / 2);
      g.fill();
      // Ink.
      g.strokeStyle = '#3b2f24';
      g.fillStyle = '#3b2f24';
      g.lineWidth = Math.max(1, k * 0.22);
      const water = (nx: number, ny: number) => {
        const n = src.frame(nx, ny);
        return explored.has(nx, ny) && (ICE.has(n) || n === THIN || n === WATER);
      };
      const land = !ICE.has(f) && f !== THIN && f !== WATER;
      if (land && (water(x + 1, y) || water(x, y + 1) || water(x - 1, y) || water(x, y - 1))) {
        g.beginPath(); g.moveTo(ax + tw * 0.2, ay + th * 0.5 + wob(x, y) * 2); g.lineTo(ax + tw * 0.8, ay + th * 0.5 - wob(y, x) * 2); g.stroke();
      }
      if (ROAD.has(f) && (x + y) % 2 === 0) g.fillRect(ax + tw * 0.35, ay + th * 0.4, tw * 0.3, th * 0.2);
      if (f === WOOD) g.fillRect(ax + tw * 0.2, ay + th * 0.45, tw * 0.6, th * 0.12);
      if (f === THIN && (x * 3 + y) % 3 === 0) {
        g.strokeStyle = '#2d3d4a';
        g.beginPath(); g.moveTo(ax + tw * 0.3, ay + th * 0.3); g.lineTo(ax + tw * 0.55, ay + th * 0.6); g.lineTo(ax + tw * 0.75, ay + th * 0.4); g.stroke();
      }
      if (obj?.startsWith('birch') && wob(x, y) < 0.55) {
        g.strokeStyle = '#4b5a3c';
        g.beginPath(); g.moveTo(ax + tw / 2, ay + th * 0.6); g.lineTo(ax + tw / 2, ay - th * 0.6); g.stroke();
      }
      if (obj?.startsWith('mountain') && (x + 2 * y) % 4 === 0) {
        g.strokeStyle = '#5a5046';
        g.beginPath(); g.moveTo(ax, ay + th); g.lineTo(ax + tw / 2, ay - th * 0.4); g.lineTo(ax + tw, ay + th); g.stroke();
      }
      if (obj && /house|hut|boathouse|shelter|ruin/.test(obj)) g.fillRect(ax + tw * 0.25, ay - th * 0.2, tw * 0.5, th * 0.8);
    }
  }

  // Places found, labelled; a label that would sit on another goes below its dot instead.
  const fontPx = Math.round(14 * dpr);
  g.font = `italic ${fontPx}px Georgia, serif`;
  g.textAlign = 'center';
  const taken: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const free = (r: (typeof taken)[number]) => !taken.some((t) => r.x0 < t.x1 && t.x0 < r.x1 && r.y0 < t.y1 && t.y0 < r.y1);
  for (const p of src.places) {
    if (!found.includes(p.id)) continue;
    const [ax, ay] = px(p.tile.x, p.tile.y);
    const dx = ax + tw / 2, dy = ay + th / 2;
    g.fillStyle = '#7a2a20';
    g.beginPath(); g.arc(dx, dy, Math.max(3, k * 0.9), 0, Math.PI * 2); g.fill();
    const w = g.measureText(p.name).width;
    let y = dy - fontPx * 0.7;
    let rect = { x0: dx - w / 2, y0: y - fontPx, x1: dx + w / 2, y1: y + 2 };
    if (!free(rect)) {
      y = dy + fontPx * 1.3;
      rect = { x0: dx - w / 2, y0: y - fontPx, x1: dx + w / 2, y1: y + 2 };
    }
    taken.push(rect);
    g.fillStyle = 'rgba(233, 223, 198, 0.8)';
    g.fillRect(rect.x0 - 2, rect.y0, rect.x1 - rect.x0 + 4, rect.y1 - rect.y0 + 2);
    g.fillStyle = '#2b221a';
    g.fillText(p.name, dx, y);
  }
  // Where she is now.
  const me = src.signe();
  const [mx, my] = px(me.x, me.y);
  const r = Math.max(5, k * 1.4);
  g.strokeStyle = '#a3241a';
  g.lineWidth = Math.max(2, k * 0.4);
  g.beginPath();
  g.moveTo(mx + tw / 2 - r, my + th / 2 - r); g.lineTo(mx + tw / 2 + r, my + th / 2 + r);
  g.moveTo(mx + tw / 2 + r, my + th / 2 - r); g.lineTo(mx + tw / 2 - r, my + th / 2 + r);
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
