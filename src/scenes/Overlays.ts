/**
 * Speech bubbles over people's heads (meetings between villagers), and the
 * death screen. HTML over the game, like the dialogue box, so text stays
 * readable on phones.
 */

export interface BubbleLine {
  /** Who says it (a person id), and the text. */
  who: string;
  text: string;
}

/** Plays a meeting's lines one after another above the speakers. */
export class SpeechBubbles {
  private readonly root: HTMLDivElement;
  private queue: BubbleLine[] = [];
  private current: { line: BubbleLine; el: HTMLDivElement; until: number } | null = null;
  private clock = 0;

  constructor(private readonly msPerLine: number) {
    const style = document.createElement('style');
    style.textContent = BUBBLE_CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'bubbles';
    document.body.appendChild(this.root);
  }

  /** Queues a meeting; returns how long it will take in ms. */
  play(lines: BubbleLine[]): number {
    this.queue.push(...lines);
    return (this.queue.length + (this.current ? 1 : 0)) * this.msPerLine;
  }

  clear(): void {
    this.queue = [];
    this.current?.el.remove();
    this.current = null;
  }

  /**
   * Advances time and moves the bubble to its speaker. `screenPos` gives the
   * CSS-pixel point above a person's head, or null if they are off screen.
   */
  update(deltaMs: number, screenPos: (who: string) => { x: number; y: number } | null, hidden: boolean): void {
    this.clock += deltaMs;
    if (this.current && this.clock >= this.current.until) {
      this.current.el.remove();
      this.current = null;
    }
    if (!this.current && this.queue.length > 0) {
      const line = this.queue.shift()!;
      const el = document.createElement('div');
      el.className = 'bubble';
      el.textContent = line.text;
      this.root.appendChild(el);
      this.current = { line, el, until: this.clock + this.msPerLine };
    }
    if (!this.current) return;
    const p = hidden ? null : screenPos(this.current.line.who);
    this.current.el.hidden = !p;
    if (p) this.current.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
  }
}

/** The death screen: lines from the "death" knot, then a way back to the last rest. */
export class DeathScreen {
  private readonly root: HTMLDivElement;

  constructor() {
    const style = document.createElement('style');
    style.textContent = DEATH_CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'death';
    this.root.hidden = true;
    document.body.appendChild(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Shows the lines one by one, then the button. */
  show(lines: string[], onContinue: () => void): void {
    const box = document.createElement('div');
    box.className = 'death-box';
    lines.forEach((text, i) => {
      const p = document.createElement('p');
      p.textContent = text;
      p.style.animationDelay = `${i * 1.6}s`;
      box.appendChild(p);
    });
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Remember it again';
    button.style.animationDelay = `${lines.length * 1.6}s`;
    button.addEventListener('click', () => {
      this.root.hidden = true;
      this.root.replaceChildren();
      onContinue();
    });
    box.appendChild(button);
    this.root.replaceChildren(box);
    this.root.hidden = false;
  }
}

const BUBBLE_CSS = `
.bubbles { position: fixed; inset: 0; z-index: 4; pointer-events: none; }
.bubble { position: absolute; left: 0; top: 0; max-width: min(240px, 60vw); padding: 6px 10px; background: rgba(244, 241, 234, 0.95);
  color: #1d1f24; border-radius: 8px; font: 15px/1.3 Georgia, 'Times New Roman', serif; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
.bubble[hidden] { display: none; }
.bubble::after { content: ''; position: absolute; left: 50%; bottom: -6px; margin-left: -6px; border: 6px solid transparent;
  border-bottom: 0; border-top-color: rgba(244, 241, 234, 0.95); }
`;

const DEATH_CSS = `
.death { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center;
  background: rgba(4, 5, 7, 0.94); padding: 24px; box-sizing: border-box; animation: death-in 1.2s ease both; }
.death[hidden] { display: none; }
.death-box { max-width: 520px; color: #d6dbe1; font: 20px/1.5 Georgia, 'Times New Roman', serif; text-align: center; }
.death-box p { margin: 0 0 18px; opacity: 0; animation: death-in 1.2s ease both; }
.death-box p:nth-child(2) { font-size: 26px; }
.death-box button { margin-top: 12px; opacity: 0; animation: death-in 1s ease both; background: none; color: #e4e9ef;
  border: 1px solid #6f7c8a; border-radius: 4px; padding: 10px 18px; font: 17px Georgia, serif; cursor: pointer; }
@keyframes death-in { from { opacity: 0; } to { opacity: 1; } }
`;
