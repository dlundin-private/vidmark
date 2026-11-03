import { KEEPSAKES, type KeepsakeId } from '../../content/data/keepsakes';
import { NPCS, type NpcId } from '../../content/data/npcs';
import { DEFAULT_TUNING, TUNING_LABELS, type TuningKey } from '../../content/data/tuning';
import { loadError, store, tuning } from '../game';
import * as A from '../state/actions';
import { startChapterTwo } from '../systems/chapters';

/**
 * A DOM overlay for testing and tuning: inspect the GameState, poke it, save
 * and load, and change tuning values live. Toggle with the gear button or `.
 * It's a development tool, but ships in the build so it works on phones too.
 */
export function installDebugPanel(): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const toggle = el('button', { className: 'dbg-toggle', title: 'Debug panel (`)', textContent: '⚙' });
  const panel = el('div', { className: 'dbg-panel', hidden: true });
  document.body.append(toggle, panel);

  // Typing in the panel must not move Signe: Phaser listens for keys on window.
  for (const type of ['keydown', 'keyup'] as const) {
    panel.addEventListener(type, (e) => e.stopPropagation());
  }

  let message = loadError ? `Save not loaded: ${loadError}` : '';
  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    if (open) render();
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '§') setOpen(panel.hidden);
  });
  store.subscribe(() => {
    if (!panel.hidden) render();
  });

  const act = (fn: () => void | string | null) => () => {
    const result = fn();
    message = typeof result === 'string' ? result : '';
    render();
  };

  function render(): void {
    const s = store.state;
    const t = tuning.values;
    const scroll = panel.scrollTop;
    const focusedKey = (document.activeElement as HTMLElement | null)?.dataset?.key;
    panel.replaceChildren(
      el('div', { className: 'dbg-head' }, [el('strong', { textContent: 'Debug' }), button('×', () => setOpen(false))]),
      message ? el('p', { className: 'dbg-msg', textContent: message }) : '',

      section('State', [
        row('Power', `${s.power} / ${A.maxPower(s, t)}  + reserve ${s.reserve}`),
        row('Wounds', `${s.wounds} / ${t.maxWounds}${A.hasFallen(s, t) ? ' (fallen)' : ''}`),
        row('Hearth', A.hearth(s).map(npcName).join(', ') || 'nobody'),
        row('Echoes', A.echoes(s).map(npcName).join(', ') || 'none'),
        row('Keepsakes', KEEPSAKES.map((k) => `${k.title}: ${keepsakeLabel(k.id)}`).join(' · ')),
        row('Skills', (['strengthen', 'weaken', 'push', 'mend'] as const).map((k) => `${k} ${A.skillLevel(s, k, t)} (${s.skills[k].usedOn.length} used)`).join(' · ')),
        row('Weaves', s.weaves.map((w) => w.name + (w.anchor ? ' (anchored)' : '')).join(', ') || 'none'),
        row('World', `${Object.keys(s.world.objects).length} objects changed, ${Object.keys(s.world.tiles).length} tiles of ice changed`),
        row('Promises', s.promises.map((p) => `${p.id} (to ${npcName(p.to)})`).join(', ') || 'none'),
        row('Flags', Object.entries(s.flags).map(([k, v]) => (v === true ? k : `${k}=${String(v)}`)).join(', ') || 'none'),
        row('Position', s.position ? `${s.position.x}, ${s.position.y}` : 'map spawn'),
      ]),

      section('Poke the state', [
        el('div', { className: 'dbg-buttons' }, [
          button('Rest at home', act(() => store.update(A.restAtHome))),
          button('Spend 1', act(() => (store.update((st) => A.spendPower(st, 1)) ? null : 'Not enough Power.'))),
          button('+1 reserve', act(() => store.update((st) => A.addReserve(st, 1)))),
          button('Wound', act(() => store.update(A.addWound))),
          button('Heal', act(() => store.update(A.healWound))),
        ]),
        picker('Offering from', npcOptions(), (id) => store.update((st, tt) => A.recordOffering(st, id as NpcId, tt))),
        picker('Hollow', npcOptions(), (id) => store.update((st, tt) => A.recordHollowing(st, id as NpcId, tt))),
        picker(
          'Burn',
          KEEPSAKES.map((k) => [k.id, k.title]),
          (id) => {
            const gained = store.update((st, tt) => A.burnKeepsake(st, id as KeepsakeId, tt));
            return gained ? `Burned for ${gained} Power.` : 'Already gone or not formed yet.';
          },
        ),
        el('p', { className: 'dbg-note', textContent: 'These change numbers only. What Signe loses with them comes in build step 5.' }),
      ]),

      section('Save', [
        el('div', { className: 'dbg-buttons' }, [
          button('Save', act(() => (store.save() ? 'Saved.' : 'No storage in this browser.'))),
          button('Load', act(() => (store.hasSave() ? store.load() ?? 'Loaded.' : 'No save yet.'))),
          button('New game', act(() => {
            if (!confirm('Start a new game? The current save is overwritten when Signe next stops.')) return null;
            store.newGame();
            return 'New game started.';
          })),
          button('Start chapter 2', act(() => {
            if (!confirm('Start chapter 2 from a default chapter 1 (nobody hollowed, the nets mended)? The current game is replaced.')) return null;
            store.newGame();
            store.rebuild((st) => startChapterTwo(st));
            store.save();
            return 'Chapter 2 started at the south gate of Järnfors.';
          })),
          button('Copy JSON', act(() => {
            void navigator.clipboard?.writeText(store.exportJson());
            return 'Save copied to the clipboard.';
          })),
        ]),
        importBox(),
        store.hasStorage ? '' : el('p', { className: 'dbg-note', textContent: 'This browser blocks storage: nothing is saved between visits.' }),
      ]),

      section('Tuning', [
        ...(Object.keys(DEFAULT_TUNING) as TuningKey[]).map((key) => tuningRow(key)),
        button('Reset all to defaults', act(() => {
          tuning.resetAll();
          return 'Tuning reset.';
        })),
        el('p', { className: 'dbg-note', textContent: 'Changes apply at once and are kept in this browser. Copy good values into content/data/tuning.ts.' }),
      ]),

      el('details', {}, [el('summary', { textContent: 'Raw GameState' }), el('pre', { textContent: JSON.stringify(s, null, 1) })]),
    );
    panel.scrollTop = scroll;
    // Redrawing replaces every input; keep the caret where it was (e.g. while tabbing through tuning).
    if (focusedKey) panel.querySelector<HTMLElement>(`[data-key="${focusedKey}"]`)?.focus();
  }

  function tuningRow(key: TuningKey): HTMLElement {
    const input = el('input', { type: 'number', value: String(tuning.values[key]), step: '1' });
    input.dataset.key = key;
    input.addEventListener('change', act(() => {
      tuning.set(key, Number(input.value));
      return null;
    }));
    const changed = tuning.isOverridden(key);
    return el('label', { className: changed ? 'dbg-tune changed' : 'dbg-tune' }, [
      el('span', { textContent: TUNING_LABELS[key] + (changed ? ` (default ${DEFAULT_TUNING[key]})` : '') }),
      input,
    ]);
  }

  function picker(label: string, options: [string, string][], run: (id: string) => void | string): HTMLElement {
    const select = el('select', {}, options.map(([v, text]) => el('option', { value: v, textContent: text })));
    return el('div', { className: 'dbg-picker' }, [
      el('span', { textContent: label }),
      select,
      button('Do', act(() => run(select.value))),
    ]);
  }

  function importBox(): HTMLElement {
    const area = el('textarea', { placeholder: 'Paste a save here to load it', rows: 2 });
    return el('div', { className: 'dbg-import' }, [
      area,
      button('Load pasted', act(() => (area.value.trim() ? store.loadFrom(area.value) ?? 'Loaded.' : 'Paste a save first.'))),
    ]);
  }
}

function npcName(id: NpcId): string {
  return NPCS.find((n) => n.id === id)?.name ?? id;
}

function npcOptions(): [string, string][] {
  return NPCS.map((n) => [n.id, n.name]);
}

function keepsakeLabel(id: KeepsakeId): string {
  const k = store.state.keepsakes[id];
  if (!k.formed) return 'not formed';
  return k.status;
}

function section(title: string, children: (Node | string)[]): HTMLElement {
  return el('section', {}, [el('h3', { textContent: title }), ...children]);
}

function row(label: string, value: string): HTMLElement {
  return el('div', { className: 'dbg-row' }, [el('span', { textContent: label }), el('span', { textContent: value })]);
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', { textContent: text, type: 'button' });
  b.addEventListener('click', onClick);
  return b;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const CSS = `
.dbg-toggle { position: fixed; top: 8px; right: 8px; z-index: 20; width: 36px; height: 36px; border-radius: 8px;
  border: 1px solid #3a4250; background: rgba(20, 24, 30, 0.8); color: #c9d2dc; font-size: 18px; cursor: pointer; }
.dbg-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 21; width: min(380px, 100vw); box-sizing: border-box;
  overflow-y: auto; padding: 10px 12px 24px; background: rgba(14, 17, 22, 0.96); color: #d8dee6;
  font: 15px/1.4 system-ui, sans-serif; touch-action: pan-y; user-select: text; -webkit-user-select: text; }
.dbg-panel[hidden] { display: none; }
.dbg-head { display: flex; justify-content: space-between; align-items: center; position: sticky; top: -10px;
  background: rgba(14, 17, 22, 0.98); padding: 4px 0; }
.dbg-panel h3 { margin: 14px 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #8fa0b3; }
.dbg-panel button { background: #252c36; color: #e4e9ef; border: 1px solid #3a4250; border-radius: 6px;
  padding: 6px 10px; font: inherit; cursor: pointer; }
.dbg-panel button:active { background: #33404f; }
.dbg-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
.dbg-row { display: grid; grid-template-columns: 84px 1fr; gap: 8px; padding: 2px 0; }
.dbg-row span:first-child { color: #8fa0b3; }
.dbg-picker, .dbg-tune { display: grid; grid-template-columns: 1fr auto auto; gap: 6px; align-items: center; margin-top: 6px; }
.dbg-tune { grid-template-columns: 1fr 72px; }
.dbg-tune.changed span { color: #f0c674; }
.dbg-panel select, .dbg-panel input, .dbg-panel textarea { background: #1b2029; color: #e4e9ef; border: 1px solid #3a4250;
  border-radius: 6px; padding: 5px 6px; font: inherit; }
.dbg-import { display: grid; gap: 6px; margin-top: 8px; }
.dbg-msg { background: #2b3340; padding: 6px 8px; border-radius: 6px; margin: 8px 0 0; }
.dbg-note { color: #7d8a99; font-size: 12px; margin: 6px 0 0; }
.dbg-panel pre { font-size: 11px; white-space: pre-wrap; word-break: break-word; color: #b7c2cf; }
.dbg-panel summary { margin-top: 14px; cursor: pointer; color: #8fa0b3; }
`;
