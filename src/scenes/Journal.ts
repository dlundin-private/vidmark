import { KEEPSAKES } from '../../content/data/keepsakes';
import { NPCS } from '../../content/data/npcs';
import * as A from '../state/actions';
import type { GameStore } from '../state/store';
import { questStatuses } from '../systems/quests';

type Page = 'quests' | 'hearth' | 'keepsakes';

/**
 * Signe's journal: her quests, her Hearth (the people who have given her a
 * memory, stacked on her own Power like a pyramid) and her Keepsakes.
 * Open with the Journal button or J.
 */
export class Journal {
  private readonly root: HTMLDivElement;
  private page: Page = 'quests';

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
    for (const [id, label] of [['quests', 'Quests'], ['hearth', 'Hearth'], ['keepsakes', 'Keepsakes']] as const) {
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
    panel.append(this.page === 'quests' ? this.quests() : this.page === 'hearth' ? this.hearth() : this.keepsakes());
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
.keepsake { margin: 10px 0; }
.keepsake-title { color: #f0d9a8; font-size: 18px; }
.keepsake-memory { margin: 2px 0; }
.keepsake.gone { opacity: 0.45; }
.keepsake.gone .keepsake-memory { font-style: italic; }
`;
