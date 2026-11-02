import { ACTIONS, type CraftAction } from '../../content/data/craft';
import type { Tuning } from '../../content/data/tuning';
import * as A from '../state/actions';
import type { GameState, SavedWeave } from '../state/GameState';

/** What the player picked to cast: a plain action, or a saved Weave by id. */
export type Selection = { kind: 'action'; action: CraftAction } | { kind: 'weave'; id: string };

export interface HudCallbacks {
  onSelect(selection: Selection | null): void;
  onOpenWeaves(): void;
}

/**
 * The on-screen HUD: Power and wounds, the four Craft actions and saved Weaves,
 * a line for what just happened, and simple prompts. HTML over the game, like
 * the dialogue box, so it works the same with touch and mouse.
 * Keys: 1-4 actions, 5-9 saved Weaves, V the Weave screen, Esc to cancel.
 */
export class CraftHud {
  private readonly root: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly line: HTMLDivElement;
  private selection: Selection | null = null;
  private lineTimer = 0;
  /** Saved Weave ids in bar order, for the 5-9 keys. */
  private weaveIds: string[] = [];
  /** Last state drawn, so a selection change can redraw the bar. */
  private last: { state: Readonly<GameState>; t: Tuning } | null = null;

  constructor(private readonly cb: HudCallbacks) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = div('hud');
    this.status = div('hud-status');
    this.bar = div('hud-bar');
    this.line = div('hud-line');
    this.root.append(this.status, this.line, this.bar);
    document.body.appendChild(this.root);
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  get selected(): Selection | null {
    return this.selection;
  }

  select(selection: Selection | null): void {
    this.selection = selection;
    if (this.last) this.render(this.last.state, this.last.t);
    this.cb.onSelect(selection);
  }

  /** Shows a line of text for a while (what a spell did, or why it can't). */
  say(text: string, ms = 4000): void {
    this.line.replaceChildren(text);
    this.line.hidden = false;
    window.clearTimeout(this.lineTimer);
    if (ms > 0) this.lineTimer = window.setTimeout(() => (this.line.hidden = true), ms);
  }

  /** A short question with buttons, in the HUD line. */
  ask(text: string, options: { label: string; run: () => void }[]): void {
    window.clearTimeout(this.lineTimer);
    const buttons = options.map((o) => {
      const b = button(o.label, () => {
        this.line.hidden = true;
        o.run();
      });
      b.className = 'hud-ask';
      return b;
    });
    this.line.replaceChildren(text, ...buttons);
    this.line.hidden = false;
  }

  render(state: Readonly<GameState>, t: Tuning): void {
    this.last = { state, t };
    const max = A.maxPower(state, t);
    const pips = '●'.repeat(state.power) + '○'.repeat(Math.max(0, max - state.power));
    this.status.replaceChildren(
      span('hud-label', 'Power '),
      span('hud-pips', pips || '—'),
      state.reserve > 0 ? span('hud-reserve', ` +${state.reserve}`) : '',
      span('hud-label', '   Wounds '),
      span('hud-wounds', '✕'.repeat(state.wounds) + '·'.repeat(Math.max(0, t.maxWounds - state.wounds))),
    );

    const items: HTMLButtonElement[] = ACTIONS.map((a, i) => {
      const level = a.trainable ? ` ${roman(A.skillLevel(state, a.id, t))}` : '';
      return this.selectable(`${i + 1}`, a.name + level, { kind: 'action', action: a.id }, a.description);
    });
    this.weaveIds = state.weaves.map((w) => w.id);
    state.weaves.forEach((w, i) => items.push(this.selectable(i < 5 ? `${i + 5}` : '', w.name, { kind: 'weave', id: w.id }, weaveTitle(w))));
    const weaves = button('Weaves…', () => this.cb.onOpenWeaves());
    weaves.className = 'hud-btn hud-weaves';
    weaves.title = 'Craft and save Weaves (V)';
    this.bar.replaceChildren(...items, weaves);
  }

  private selectable(key: string, text: string, sel: Selection, title: string): HTMLButtonElement {
    const active = sameSelection(this.selection, sel);
    const b = button('', () => this.select(active ? null : sel));
    b.className = active ? 'hud-btn active' : 'hud-btn';
    b.title = title;
    if (key) b.append(span('hud-key', key));
    b.append(text);
    return b;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.root.hidden || (e.target as HTMLElement).closest?.('input, textarea, select, .dbg-panel, .weave')) return;
    if (e.key === 'Escape' && this.selection) return this.select(null);
    if (e.key === 'v' || e.key === 'V') return this.cb.onOpenWeaves();
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1) return;
    const sel: Selection | null =
      n <= ACTIONS.length ? { kind: 'action', action: ACTIONS[n - 1]!.id } : this.weaveAt(n - 5);
    if (sel) this.select(sameSelection(this.selection, sel) ? null : sel);
  }

  private weaveAt(i: number): Selection | null {
    const id = this.weaveIds[i];
    return id ? { kind: 'weave', id } : null;
  }
}

export function weaveTitle(w: SavedWeave): string {
  return [w.action, w.target, w.modifier].filter(Boolean).join(' + ') + (w.anchor ? ' (anchored: permanent)' : '');
}

function sameSelection(a: Selection | null, b: Selection): boolean {
  if (!a || a.kind !== b.kind) return false;
  return a.kind === 'action' ? a.action === (b as typeof a).action : a.id === (b as typeof a).id;
}

function roman(n: number): string {
  return ['', 'I', 'II', 'III'][n] ?? String(n);
}

function div(className: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = className;
  return d;
}

function span(className: string, text: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = className;
  s.textContent = text;
  return s;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

const CSS = `
.hud { position: fixed; inset: 0; z-index: 5; pointer-events: none; font: 13px/1.3 system-ui, sans-serif; color: #e4e9ef; }
.hud[hidden] { display: none; }
.hud-status { position: absolute; top: 8px; left: 8px; padding: 6px 10px; background: rgba(12, 14, 18, 0.78);
  border: 1px solid #2c333d; border-radius: 6px; white-space: pre; }
.hud-label { color: #8fa0b3; }
.hud-pips { color: #f0c674; letter-spacing: 1px; }
.hud-reserve { color: #d98c5f; }
.hud-wounds { color: #d97a7a; letter-spacing: 2px; }
.hud-line { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(56px + env(safe-area-inset-bottom));
  max-width: min(560px, calc(100vw - 24px)); padding: 7px 12px; background: rgba(12, 14, 18, 0.9); border: 1px solid #3a4250;
  border-radius: 6px; pointer-events: auto; text-align: center; }
.hud-line[hidden] { display: none; }
.hud-ask { margin-left: 8px; background: #252c36; color: #e4e9ef; border: 1px solid #3a4250; border-radius: 5px; padding: 4px 10px; font: inherit; cursor: pointer; }
.hud-bar { position: absolute; left: 0; right: 0; bottom: max(8px, env(safe-area-inset-bottom)); display: flex; flex-wrap: wrap;
  justify-content: center; gap: 6px; padding: 0 8px; pointer-events: none; }
.hud-btn { pointer-events: auto; background: rgba(20, 24, 30, 0.88); color: #e4e9ef; border: 1px solid #3a4250; border-radius: 6px;
  padding: 7px 10px; font: inherit; cursor: pointer; touch-action: manipulation; }
.hud-btn.active { border-color: #f0c674; color: #f0c674; background: rgba(40, 34, 20, 0.92); }
.hud-weaves { color: #b7c4d1; }
.hud-key { display: inline-block; min-width: 14px; margin-right: 5px; color: #6f7c8a; font-size: 11px; }
@media (max-width: 520px) { .hud-key { display: none; } .hud-btn { padding: 6px 8px; font-size: 12px; } }
`;
