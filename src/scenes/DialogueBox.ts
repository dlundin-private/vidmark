import type { NpcId } from '../../content/data/npcs';
import type { DialogueRunner, DialogueStep } from '../systems/dialogue';

/**
 * The dialogue box: an HTML overlay so text stays readable at any zoom and on
 * phones. Tap, click, Space or Enter continues; choices are buttons, or the
 * number keys 1-9.
 */
export class DialogueBox {
  private readonly root: HTMLDivElement;
  private step: DialogueStep = { kind: 'end' };
  private onClose: (() => void) | null = null;

  constructor(private readonly runner: DialogueRunner) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'dlg';
    this.root.hidden = true;
    this.root.addEventListener('click', (e) => {
      if (this.step.kind === 'line' && !(e.target as HTMLElement).closest('button')) this.advance();
    });
    document.body.appendChild(this.root);

    // Capture phase, so the game never sees keys meant for the dialogue.
    window.addEventListener('keydown', (e) => this.onKey(e), true);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(who: NpcId, onClose: () => void): void {
    this.runner.start(who);
    this.onClose = onClose;
    this.root.hidden = false;
    this.advance();
  }

  private advance(): void {
    this.step = this.runner.next();
    if (this.step.kind === 'end') return this.close();
    this.render();
  }

  private choose(index: number): void {
    this.runner.choose(index);
    this.advance();
  }

  private close(): void {
    this.runner.stop();
    this.root.hidden = true;
    this.root.replaceChildren();
    const done = this.onClose;
    this.onClose = null;
    done?.();
  }

  private render(): void {
    const step = this.step;
    const box = document.createElement('div');
    box.className = 'dlg-box';
    if (step.kind === 'line') {
      if (step.speaker) box.append(el('div', 'dlg-speaker', step.speaker));
      box.append(el('p', step.speaker ? 'dlg-text' : 'dlg-text dlg-narration', step.text));
      box.append(el('div', 'dlg-hint', '▾'));
    } else if (step.kind === 'choices') {
      const list = el('div', 'dlg-choices', '');
      step.options.forEach((option, i) => {
        const b = el('button', 'dlg-choice', `${i + 1}. ${option}`);
        b.type = 'button';
        b.addEventListener('click', () => this.choose(i));
        list.append(b);
      });
      box.append(list);
    }
    this.root.replaceChildren(box);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.isOpen) return;
    // Let typing in the debug panel through.
    if ((e.target as HTMLElement).closest?.('.dbg-panel')) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.repeat) return;
    if (this.step.kind === 'line' && (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E')) {
      this.advance();
    } else if (this.step.kind === 'choices') {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= this.step.options.length) this.choose(n - 1);
    }
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

const CSS = `
.dlg { position: fixed; inset: 0; z-index: 10; display: flex; align-items: flex-end; justify-content: center;
  padding: 0 12px max(12px, env(safe-area-inset-bottom)); box-sizing: border-box; }
.dlg[hidden] { display: none; }
.dlg-box { width: min(640px, 100%); max-height: 60vh; overflow-y: auto; box-sizing: border-box; padding: 14px 18px 12px;
  background: rgba(12, 14, 18, 0.94); border: 1px solid #3a4250; border-radius: 4px; color: #dfe4ea;
  font: 17px/1.45 Georgia, 'Times New Roman', serif; cursor: pointer; position: relative; touch-action: pan-y; }
.dlg-speaker { font: 600 12px/1 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #b7c4d1; margin-bottom: 8px; }
.dlg-text { margin: 0; }
.dlg-narration { font-style: italic; color: #b9c1ca; }
.dlg-hint { position: absolute; right: 12px; bottom: 6px; color: #6f7c8a; font-size: 12px; }
.dlg-choices { display: grid; gap: 6px; cursor: default; }
.dlg-choice { text-align: left; background: #1b2029; color: #e4e9ef; border: 1px solid #3a4250; border-radius: 4px;
  padding: 9px 12px; font: inherit; font-size: 16px; cursor: pointer; }
.dlg-choice:hover, .dlg-choice:focus-visible { border-color: #8fa0b3; outline: none; }
@media (max-height: 420px) { .dlg-box { font-size: 15px; padding: 10px 14px; max-height: 70vh; } .dlg-choice { padding: 7px 10px; font-size: 15px; } }
`;
