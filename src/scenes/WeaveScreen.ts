import { ACTIONS, MODIFIERS, TARGETS, type CraftAction, type WeaveModifier, type WeaveTarget } from '../../content/data/craft';
import { KEEPSAKES } from '../../content/data/keepsakes';
import { NPCS } from '../../content/data/npcs';
import type { GameStore } from '../state/store';
import * as A from '../state/actions';
import type { WeaveAnchor } from '../state/GameState';
import { allowedModifiers, allowedTargets, spellCost } from '../systems/craft';
import { weaveTitle } from './CraftHud';

/**
 * The Weave crafting screen (design: "Weaves are built and saved in a crafting
 * screen; cost is calculated from the parts"): action + target + one modifier,
 * optionally anchored in a memory, which is consumed for good.
 */
export class WeaveScreen {
  private readonly root: HTMLDivElement;
  private action: CraftAction = 'weaken';
  private target: WeaveTarget = 'surface';
  private modifier: WeaveModifier | null = 'trigger';
  private anchor: WeaveAnchor | null = null;
  private name = '';

  constructor(private readonly store: GameStore) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'weave';
    this.root.hidden = true;
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
    for (const type of ['keydown', 'keyup'] as const) {
      this.root.addEventListener(type, (e) => {
        e.stopPropagation();
        if (type === 'keydown' && (e as KeyboardEvent).key === 'Escape') this.close();
      });
    }
    document.body.appendChild(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    this.root.hidden = false;
    this.render();
  }

  close(): void {
    this.root.hidden = true;
  }

  private render(): void {
    const state = this.store.state;
    const t = this.store.tuningValues;
    if (!allowedTargets(this.action).includes(this.target)) this.target = allowedTargets(this.action)[0]!;
    if (this.modifier && !allowedModifiers(this.action, this.target).includes(this.modifier)) this.modifier = null;
    const anchors = A.availableAnchors(state);
    if (this.anchor && !anchors.some((a) => JSON.stringify(a) === JSON.stringify(this.anchor))) this.anchor = null;
    const cost = spellCost(state, t, { action: this.action, target: this.target, modifier: this.modifier, anchored: !!this.anchor });
    const autoName = [ACTIONS.find((a) => a.id === this.action)!.name, this.target !== 'object' ? this.target : '', this.modifier ?? '']
      .filter(Boolean).join(' · ');

    const panel = el('div', 'weave-panel');
    const actionDef = ACTIONS.find((a) => a.id === this.action)!;
    const targetDef = TARGETS.find((x) => x.id === this.target)!;
    const modifierDef = MODIFIERS.find((m) => m.id === this.modifier);
    panel.append(
      el('div', 'weave-head', '', [el('strong', '', 'Weave'), btn('×', () => this.close())]),
      el('p', 'weave-intro', 'A Weave is a spell you prepare: pick what it does, what it works on, and one extra twist. Save it, and it appears at the bottom of the screen to cast like any action. It costs more than a plain action, so plan ahead.'),
      group('1. What it does', ACTIONS.map((a) => choice(a.name, this.action === a.id, () => { this.action = a.id; this.render(); })), actionDef.description),
      group('2. What it works on', TARGETS.filter((x) => allowedTargets(this.action).includes(x.id))
        .map((x) => choice(x.name, this.target === x.id, () => { this.target = x.id; this.render(); })), targetDef.description),
      group('3. Extra twist (modifier)', [
        choice('None', this.modifier === null, () => { this.modifier = null; this.render(); }),
        ...MODIFIERS.filter((m) => allowedModifiers(this.action, this.target).includes(m.id))
          .map((m) => choice(m.name, this.modifier === m.id, () => { this.modifier = m.id; this.render(); })),
      ], modifierDef ? `${modifierDef.description} Costs ${t.modifierCost} more.` : 'No twist: the action as it is.'),
      group('4. Bind it to a memory (optional)', [
        choice('None', this.anchor === null, () => { this.anchor = null; this.render(); }),
        ...anchors.map((a) => choice(anchorName(a), JSON.stringify(this.anchor) === JSON.stringify(a), () => { this.anchor = a; this.render(); })),
      ], this.anchor ? anchorCost(this.anchor) : 'An ordinary Weave: what it does fades when you rest.'),
    );

    const nameInput = document.createElement('input');
    nameInput.placeholder = autoName;
    nameInput.value = this.name;
    nameInput.maxLength = 28;
    nameInput.addEventListener('input', () => (this.name = nameInput.value));
    const save = btn(this.anchor ? `Consume and save · ${cost} Power to cast` : `Save · ${cost} Power to cast`, () => {
      if (this.anchor && !confirm(`${anchorName(this.anchor)} will be consumed into this Weave for good. ${anchorCost(this.anchor)}`)) return;
      const weave = {
        id: `w${Date.now().toString(36)}`,
        name: this.name.trim() || autoName,
        action: this.action,
        target: this.target,
        modifier: this.modifier,
        anchor: this.anchor,
      };
      this.store.update((s, tt) => A.saveWeave(s, weave, tt));
      this.name = '';
      this.anchor = null;
      this.render();
    });
    save.className = 'weave-save';
    panel.append(el('div', 'weave-save-row', '', [nameInput, save]));

    if (state.weaves.length > 0) {
      panel.append(group('Saved Weaves', state.weaves.map((w) => el('div', 'weave-saved', '', [
        el('span', '', `${w.name}`),
        el('span', 'weave-dim', ` ${weaveTitle(w)} · ${spellCost(state, t, { action: w.action, target: w.target, modifier: w.modifier, anchored: !!w.anchor })} Power`),
        w.anchor ? el('span', 'weave-dim', ' · permanent') : btn('Delete', () => { this.store.update((s) => A.deleteWeave(s, w.id)); this.render(); }),
      ])), 'Saved Weaves appear at the bottom of the screen. Bound ones are permanent.'));
    }
    this.root.replaceChildren(panel);
  }
}

function anchorName(a: WeaveAnchor): string {
  if (a.kind === 'keepsake') return `Keepsake: ${KEEPSAKES.find((k) => k.id === a.id)!.title.toLowerCase()}`;
  const who = NPCS.find((n) => n.id === a.npc)!.name;
  return a.kind === 'offering' ? `${who}'s Offering` : `The Echo of ${who}`;
}

function anchorCost(a: WeaveAnchor): string {
  if (a.kind === 'keepsake') return 'Strongest and permanent; you lose the memory, as if burned.';
  if (a.kind === 'offering') return 'Permanent; costs one point of Hearth Power for good.';
  return 'Permanent; the Echo lives on in the Weave.';
}

/** A row of choices with the current choice explained underneath (visible text: phones can't hover). */
function group(title: string, children: HTMLElement[], explain: string): HTMLElement {
  return el('div', 'weave-group', '', [el('div', 'weave-title', title), el('div', 'weave-choices', '', children), el('p', 'weave-explain', explain)]);
}

function choice(label: string, active: boolean, onClick: () => void): HTMLElement {
  const b = btn(label, onClick);
  b.className = active ? 'weave-choice active' : 'weave-choice';
  return b;
}

function btn(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function el(tag: string, className: string, text = '', children: (Node | string)[] = []): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  node.append(...children);
  return node;
}

const CSS = `
.weave { position: fixed; inset: 0; z-index: 15; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.45); padding: 10px; box-sizing: border-box; }
.weave[hidden] { display: none; }
.weave-panel { width: min(560px, 100%); max-height: 100%; overflow-y: auto; box-sizing: border-box; padding: 12px 16px 16px;
  background: rgba(14, 17, 22, 0.98); border: 1px solid #3a4250; border-radius: 6px; color: #dfe4ea; font: 16px/1.4 system-ui, sans-serif; touch-action: pan-y; }
.weave-intro { margin: 2px 0 6px; color: #b9c3cd; font-size: 15px; }
.weave-explain { margin: 6px 0 0; color: #c8d0d8; font-size: 15px; }
.weave-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.weave-head button { background: none; border: none; color: #b7c4d1; font-size: 20px; cursor: pointer; }
.weave-group { margin-top: 10px; }
.weave-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #8fa0b3; margin-bottom: 6px; }
.weave-choices { display: flex; flex-wrap: wrap; gap: 6px; }
.weave-choice { background: #1b2029; color: #e4e9ef; border: 1px solid #3a4250; border-radius: 5px; padding: 8px 12px; font: inherit; cursor: pointer; }
.weave-choice.active { border-color: #f0c674; color: #f0c674; }
.weave-save-row { display: flex; gap: 8px; margin-top: 14px; }
.weave-save-row input { flex: 1; min-width: 0; background: #1b2029; color: #e4e9ef; border: 1px solid #3a4250; border-radius: 5px; padding: 6px 8px; font: inherit; }
.weave-save { background: #33404f; color: #fff; border: 1px solid #5a6b7d; border-radius: 5px; padding: 6px 12px; font: inherit; cursor: pointer; }
.weave-saved { padding: 4px 0; display: flex; flex-wrap: wrap; gap: 4px; align-items: baseline; }
.weave-saved button { background: none; border: 1px solid #3a4250; color: #b7c4d1; border-radius: 4px; font: inherit; font-size: 12px; padding: 2px 8px; cursor: pointer; }
.weave-dim { color: #8f9bab; font-size: 14px; }
`;
