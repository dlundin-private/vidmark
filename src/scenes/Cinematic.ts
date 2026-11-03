// Short "films" between play: still pixel tableaux with a line or two of text
// each (the intro, and the end of a chapter). Drawn on a small canvas scaled up
// by whole pixels, like the game. Tap or Space for the next tableau; Skip ends it.

/** Draws one tableau at time `t` (ms since it began) on a W x H canvas. */
export type Painter = (g: CanvasRenderingContext2D, t: number, art: Art) => void;

/** The game's own sprites, by texture key, to paint with. */
export type Art = (key: string) => CanvasImageSource | null;

export interface Tableau {
  paint: Painter;
  lines: string[];
  /** Light snow drifting over it. */
  snow?: boolean;
  /** A big title instead of (or above) the lines. */
  title?: string;
}

export const W = 240;
export const H = 150;
const MS_PER_LINE = 2600;
const FADE_MS = 700;

export class Cinematic {
  private readonly root: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly text: HTMLDivElement;
  private readonly g: CanvasRenderingContext2D;
  private tableaux: Tableau[] = [];
  private index = 0;
  private started = 0;
  private raf = 0;
  private flakes = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 10, s: Math.random() < 0.25 ? 2 : 1 }));
  private onDone: () => void = () => undefined;
  private art: Art = () => null;
  private last = 0;

  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'film';
    this.root.hidden = true;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.g = this.canvas.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
    this.text = document.createElement('div');
    this.text.className = 'film-text';
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'film-skip';
    skip.textContent = 'Skip';
    skip.addEventListener('click', (e) => {
      e.stopPropagation();
      this.finish();
    });
    this.root.append(this.canvas, this.text, skip);
    this.root.addEventListener('click', () => this.advance());
    for (const type of ['keydown', 'keyup'] as const) {
      this.root.addEventListener(type, (e) => {
        e.stopPropagation();
        const key = (e as KeyboardEvent).key;
        if (type !== 'keydown') return;
        if (key === ' ' || key === 'Enter') this.advance();
        if (key === 'Escape') this.finish();
      });
    }
    document.body.appendChild(this.root);
    window.addEventListener('resize', () => this.fit());
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  play(tableaux: Tableau[], art: Art, onDone: () => void): void {
    this.tableaux = tableaux;
    this.art = art;
    this.onDone = onDone;
    this.index = 0;
    this.root.hidden = false;
    this.fit();
    this.root.tabIndex = -1;
    this.root.focus();
    this.show();
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    const frame = (now: number) => {
      if (this.root.hidden) return;
      this.draw(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Next line, or the next tableau once every line is showing. */
  private advance(): void {
    const shown = Math.floor((performance.now() - this.started) / MS_PER_LINE) + 1;
    const lines = this.tableaux[this.index]?.lines.length ?? 0;
    if (shown < lines) {
      this.started = performance.now() - lines * MS_PER_LINE;
      for (const p of this.text.querySelectorAll('p')) (p as HTMLElement).style.animationDelay = '0s';
      return;
    }
    this.index++;
    if (this.index >= this.tableaux.length) this.finish();
    else this.show();
  }

  private finish(): void {
    if (this.root.hidden) return;
    cancelAnimationFrame(this.raf);
    this.root.hidden = true;
    this.text.replaceChildren();
    this.onDone();
  }

  private show(): void {
    const tab = this.tableaux[this.index]!;
    this.started = performance.now();
    const parts: HTMLElement[] = [];
    if (tab.title) {
      const h = document.createElement('h2');
      h.textContent = tab.title;
      parts.push(h);
    }
    tab.lines.forEach((line, i) => {
      const p = document.createElement('p');
      p.textContent = line;
      p.style.animationDelay = `${i * (MS_PER_LINE / 1000)}s`;
      parts.push(p);
    });
    this.text.replaceChildren(...parts);
    this.draw(performance.now());
  }

  private draw(now: number): void {
    const tab = this.tableaux[this.index];
    if (!tab) return;
    const dt = Math.min(100, now - this.last);
    this.last = now;
    const t = now - this.started;
    const g = this.g;
    g.save();
    tab.paint(g, t, this.art);
    if (tab.snow) {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (const f of this.flakes) {
        f.y += (f.v * dt) / 1000;
        f.x += Math.sin((now / 1000 + f.v) * 0.8) * 0.05;
        if (f.y > H) {
          f.y = -2;
          f.x = Math.random() * W;
        }
        g.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s);
      }
    }
    // Fade in from black at the start of each tableau.
    if (t < FADE_MS) {
      g.fillStyle = `rgba(0,0,0,${1 - t / FADE_MS})`;
      g.fillRect(0, 0, W, H);
    }
    g.restore();
  }

  /** Whole-pixel scale that fits the window, leaving room for the text below. */
  private fit(): void {
    const dpr = window.devicePixelRatio || 1;
    const maxW = window.innerWidth * dpr * 0.94;
    const maxH = window.innerHeight * dpr * 0.62;
    const k = Math.max(1, Math.floor(Math.min(maxW / W, maxH / H)));
    this.canvas.style.width = `${(W * k) / dpr}px`;
    this.canvas.style.height = `${(H * k) / dpr}px`;
  }
}

const CSS = `
.film { position: fixed; inset: 0; z-index: 30; background: #05070a; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)); box-sizing: border-box; cursor: pointer; outline: none; }
.film[hidden] { display: none; }
.film canvas { image-rendering: pixelated; image-rendering: crisp-edges; display: block; }
.film-text { min-height: 7.5em; max-width: 34em; text-align: center; color: #e8e2d6; font: 18px/1.5 Georgia, 'Times New Roman', serif; }
.film-text h2 { font: 400 28px/1.2 Georgia, serif; letter-spacing: 0.04em; color: #f0d9a8; margin: 0 0 10px; opacity: 0; animation: film-in 1.2s ease forwards; }
.film-text p { margin: 4px 0; opacity: 0; animation: film-in 1.2s ease forwards; }
@keyframes film-in { to { opacity: 1; } }
.film-skip { position: absolute; top: max(10px, env(safe-area-inset-top)); right: 12px; background: none; border: 1px solid #4a4337; color: #b9ad97;
  border-radius: 6px; padding: 8px 14px; font: 15px system-ui, sans-serif; cursor: pointer; }
.film-actions { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }
.film-actions button { background: #2d2a25; color: #f0d9a8; border: 1px solid #6b5a3c; border-radius: 6px; padding: 10px 16px; font: 16px system-ui, sans-serif; cursor: pointer; }
@media (max-width: 520px) { .film-text { font-size: 16px; } .film-text h2 { font-size: 24px; } }
`;
