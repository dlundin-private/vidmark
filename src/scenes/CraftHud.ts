import { ACTIONS, type CraftAction } from '../../content/data/craft';
import { KIN_ACTIONS, type KinAction } from '../../content/data/kin';
import type { Tuning } from '../../content/data/tuning';
import * as A from '../state/actions';
import type { GameState, SavedWeave } from '../state/GameState';

/** What the player picked to cast: a plain action, or a saved Weave by id. */
export type Selection = { kind: 'action'; action: CraftAction } | { kind: 'kin'; action: KinAction } | { kind: 'weave'; id: string };

export interface HudCallbacks {
  onSelect(selection: Selection | null): void;
  onOpenWeaves(): void;
  onOpenJournal(): void;
}

/** Set once someone has taught Signe to prepare Weaves (Ebbe, after his quest). */
export const WEAVES_TAUGHT_FLAG = 'weaves_taught';

/**
 * The on-screen HUD: Power and wounds, the four Craft actions and saved Weaves,
 * a line for what just happened, and simple prompts. HTML over the game, like
 * the dialogue box, so it works the same with touch and mouse.
 * Keys: 1-4 actions, 5-9 saved Weaves, V the Weave screen, J the journal, Esc to cancel.
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
    this.line.hidden = true;
    // Message and buttons share one bottom column, so a long message can never cover the buttons.
    const bottom = div('hud-bottom');
    bottom.append(this.line, this.bar);
    this.root.append(this.status, bottom);
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

  /** A quest started or ended: a banner at the top for a few seconds. */
  announce(title: string, text: string): void {
    const banner = div('hud-banner');
    banner.append(span('hud-banner-title', title), document.createElement('br'), text);
    this.root.append(banner);
    window.setTimeout(() => banner.classList.add('out'), 6500);
    window.setTimeout(() => banner.remove(), 7300);
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
      // The one-time reserve (hollowing, burned Keepsakes) never refills: say so, not just a number.
      state.reserve > 0 ? span('hud-reserve', ` +${state.reserve} once`) : '',
      ...(state.flags.flood_bell && !state.flags.dam_outcome ? [span('hud-bell', `   Dam: ${Number(state.flags.dam_rests_left ?? 0)} rest${Number(state.flags.dam_rests_left ?? 0) === 1 ? '' : 's'}`)] : []),
      span('hud-label', '   Wounds '),
      span('hud-wounds', '✕'.repeat(state.wounds) + '·'.repeat(Math.max(0, t.maxWounds - state.wounds))),
    );

    const items: HTMLElement[] = ACTIONS.map((a, i) => {
      const level = a.trainable ? ` ${roman(A.skillLevel(state, a.id, t))}` : '';
      return this.selectable(`${i + 1}`, a.name + level, { kind: 'action', action: a.id }, a.description);
    });
    // Kin, once Signe has it (chapter 2): its own group, after Craft.
    if (state.domains.includes('kin')) {
      items.push(div('hud-divider'));
      for (const k of KIN_ACTIONS) {
        const b = this.selectable('', k.name, { kind: 'kin', action: k.id }, `Kin: ${k.description}`);
        b.classList.add('hud-kin');
        items.push(b);
      }
    }
    const held = A.heldWeaves(state);
    this.weaveIds = held.map((w) => w.id);
    if (held.length > 0) items.push(div('hud-divider'));
    held.forEach((w, i) => {
      const b = this.selectable(i < 5 ? `${i + 5}` : '', w.name, { kind: 'weave', id: w.id }, weaveTitle(w));
      b.classList.add('hud-weave');
      b.prepend(span('hud-weave-mark', '✦ '));
      items.push(b);
    });
    if (this.weavesTaught(state)) {
      const weaves = button('Weaves…', () => this.cb.onOpenWeaves());
      weaves.className = 'hud-btn hud-menu';
      weaves.title = 'Craft and save Weaves (V)';
      items.push(weaves);
    }
    const journal = button('Journal', () => this.cb.onOpenJournal());
    journal.className = 'hud-btn hud-menu';
    journal.title = 'Quests, your Hearth and Keepsakes (J)';
    this.bar.replaceChildren(...items, journal);
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
    if (this.root.hidden || (e.target as HTMLElement).closest?.('input, textarea, select, .dbg-panel, .weave, .journal')) return;
    if (e.key === 'Escape' && this.selection) return this.select(null);
    if ((e.key === 'v' || e.key === 'V') && this.last && this.weavesTaught(this.last.state)) return this.cb.onOpenWeaves();
    if (e.key === 'j' || e.key === 'J') return this.cb.onOpenJournal();
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1) return;
    const sel: Selection | null =
      n <= ACTIONS.length ? { kind: 'action', action: ACTIONS[n - 1]!.id } : this.weaveAt(n - 5);
    if (sel) this.select(sameSelection(this.selection, sel) ? null : sel);
  }

  private weavesTaught(state: Readonly<GameState>): boolean {
    return state.flags[WEAVES_TAUGHT_FLAG] === true;
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
  if (a.kind === 'weave') return a.id === (b as typeof a).id;
  return a.action === (b as typeof a).action;
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
.hud { position: fixed; inset: 0; z-index: 5; pointer-events: none; font: 16px/1.35 system-ui, sans-serif; color: #e4e9ef; }
.hud[hidden] { display: none; }
.hud-status { position: absolute; top: max(8px, env(safe-area-inset-top)); left: max(8px, env(safe-area-inset-left)); padding: 7px 12px;
  background: rgba(12, 14, 18, 0.8); border: 1px solid #2c333d; border-radius: 8px; white-space: pre; }
.hud-label { color: #8fa0b3; }
.hud-pips { color: #f0c674; letter-spacing: 2px; }
.hud-reserve { color: #d98c5f; }
.hud-wounds { color: #d97a7a; letter-spacing: 3px; }
.hud-bottom { position: absolute; left: 0; right: 0; bottom: max(8px, env(safe-area-inset-bottom)); display: flex; flex-direction: column;
  align-items: center; gap: 8px; padding: 0 max(8px, env(safe-area-inset-right)) 0 max(8px, env(safe-area-inset-left)); }
.hud-line { max-width: min(620px, 100%); box-sizing: border-box; padding: 8px 14px; background: rgba(12, 14, 18, 0.92);
  border: 1px solid #3a4250; border-radius: 8px; pointer-events: auto; text-align: center; }
.hud-line[hidden] { display: none; }
.hud-ask { margin: 6px 0 0 8px; background: #252c36; color: #e4e9ef; border: 1px solid #3a4250; border-radius: 6px; padding: 8px 14px;
  font: inherit; cursor: pointer; }
.hud-bar { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; pointer-events: none; }
.hud-btn { pointer-events: auto; background: rgba(20, 24, 30, 0.9); color: #e4e9ef; border: 1px solid #3a4250; border-radius: 8px;
  padding: 9px 13px; font: inherit; cursor: pointer; touch-action: manipulation; }
.hud-btn.active { border-color: #f0c674; color: #f0c674; background: rgba(40, 34, 20, 0.94); }
.hud-menu { color: #b7c4d1; }
.hud-divider { width: 2px; align-self: stretch; margin: 4px 4px; background: #3a4250; border-radius: 1px; }
.hud-weave { border-color: #6b5a3c; background: rgba(34, 28, 20, 0.92); }
.hud-kin { border-color: #5a6b4a; background: rgba(24, 32, 22, 0.92); }
.hud-bell { color: #e07a5f; font-weight: 600; }
.hud-weave-mark { color: #d9b26a; }
.hud-banner { position: absolute; top: max(56px, calc(env(safe-area-inset-top) + 48px)); left: 50%; transform: translateX(-50%);
  width: max-content; max-width: min(560px, calc(100vw - 24px)); padding: 10px 16px; background: rgba(22, 20, 17, 0.95);
  border: 1px solid #b8975a; border-radius: 8px; color: #e8e2d6; font: 16px/1.4 Georgia, serif; text-align: center;
  transition: opacity 0.8s; }
.hud-banner.out { opacity: 0; }
.hud-banner-title { color: #f0d9a8; font-size: 18px; }
.hud-key { display: inline-block; min-width: 14px; margin-right: 6px; color: #6f7c8a; font-size: 13px; }
/* Touch screens: no key hints, and buttons big enough for a thumb. */
@media (pointer: coarse) {
  .hud { font-size: 17px; }
  .hud-key { display: none; }
  .hud-btn { min-height: 48px; min-width: 64px; padding: 10px 14px; }
  .hud-ask { min-height: 44px; }
}
`;
