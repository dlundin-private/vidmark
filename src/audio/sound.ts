// All the game's sound, synthesised in the browser with Web Audio: no files.
// Wind and a low drone run all the time; everything else is a short one-shot.
// Placeholder sound in the same spirit as the placeholder art: real recordings
// can replace any effect here later without the game changing.

export type Surface = 'snow' | 'ice' | 'wood';

export type Effect =
  | 'crack'
  | 'splash'
  | 'strengthen'
  | 'weaken'
  | 'push'
  | 'mend'
  | 'hit'
  | 'bite'
  | 'howl'
  | 'hollow'
  | 'burn'
  | 'chime'
  | 'echo'
  | 'fall';

const MUTE_KEY = 'vidmark.sound.muted';

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private wind: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private fire: GainNode | null = null;
  private muted = readMuted();
  private button: HTMLButtonElement | null = null;

  /** Browsers start audio only after a tap or key press: call from any input. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);
    this.noise = makeNoise(ctx);
    this.startWind();
    this.startDrone();
    this.startFire();
  }

  /** The mute button, top right beside the gear. */
  mountButton(): void {
    if (this.button) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sound-toggle';
    b.style.cssText =
      'position:fixed;z-index:7;top:max(8px, env(safe-area-inset-top));right:max(52px, calc(env(safe-area-inset-right) + 44px));' +
      'width:36px;height:36px;border-radius:8px;border:1px solid #4a4337;background:rgba(22,20,17,0.8);color:#e8e2d6;font:16px system-ui;cursor:pointer;';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.unlock();
      this.setMuted(!this.muted);
    });
    document.body.appendChild(b);
    this.button = b;
    this.renderButton();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // Storage blocked: the setting lasts this visit only.
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    this.renderButton();
  }

  /** How windy it sounds: out on the open ice it blows harder. */
  setExposure(open: number): void {
    if (!this.wind || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.wind.gain.gain.setTargetAtTime(0.05 + 0.07 * open, t, 1.5);
  }

  /** 0..1: how close the village fire is. */
  setFireNearness(near: number): void {
    if (!this.fire || !this.ctx) return;
    this.fire.gain.setTargetAtTime(0.12 * near, this.ctx.currentTime, 0.4);
  }

  step(surface: Surface): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    if (surface === 'wood') {
      this.tone(140 + Math.random() * 30, 0.06, 'triangle', 0.12, t);
      this.burst(t, 0.05, 900, 4, 0.05);
    } else if (surface === 'ice') {
      this.burst(t, 0.07, 3200 + Math.random() * 800, 6, 0.06);
      this.tone(1800 + Math.random() * 300, 0.04, 'sine', 0.015, t);
    } else {
      // Snow: a soft crunch.
      this.burst(t, 0.12, 1400 + Math.random() * 400, 1.2, 0.09);
    }
  }

  play(effect: Effect): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    switch (effect) {
      case 'crack':
        for (let i = 0; i < 4; i++) this.burst(t + i * 0.035 + Math.random() * 0.02, 0.05, 2500 - i * 300, 8, 0.25);
        this.tone(90, 0.5, 'sine', 0.2, t, 45);
        break;
      case 'splash':
        this.burst(t + 0.1, 0.6, 700, 0.8, 0.25);
        this.tone(220, 0.25, 'sine', 0.05, t + 0.1, 80);
        break;
      case 'strengthen':
        this.chord([196, 293.7, 392], 1.1, 'sine', 0.06, t);
        this.burst(t, 0.4, 5000, 3, 0.02);
        break;
      case 'weaken':
        this.chord([207.7, 220], 0.9, 'triangle', 0.05, t, -40);
        this.burst(t + 0.2, 0.1, 2200, 7, 0.08);
        break;
      case 'push':
        this.burst(t, 0.5, 300, 0.7, 0.18, 120);
        this.tone(70, 0.4, 'sine', 0.12, t);
        break;
      case 'mend':
        this.chord([261.6, 329.6, 392, 523.3], 1.2, 'sine', 0.05, t, 0, 0.07);
        break;
      case 'hit':
        this.tone(110, 0.2, 'square', 0.08, t, 50);
        this.burst(t, 0.15, 600, 1, 0.2);
        break;
      case 'bite':
        this.burst(t, 0.08, 1800, 2, 0.3);
        this.tone(160, 0.15, 'sawtooth', 0.06, t, 90);
        break;
      case 'howl':
        this.glide([300, 520, 470, 380], 2.4, 0.05, t);
        this.glide([240, 430, 400], 2.0, 0.03, t + 0.6);
        break;
      case 'hollow':
        // A low swell that swallows itself: everything, at once.
        this.chord([55, 82.4, 110, 164.8], 2.6, 'sine', 0.09, t, 0, 0, true);
        this.burst(t, 2.0, 400, 0.5, 0.08);
        break;
      case 'burn':
        this.burst(t, 1.2, 1200, 0.6, 0.14, -800);
        this.tone(440, 1.0, 'sine', 0.03, t, -300);
        break;
      case 'chime':
        this.chord([523.3, 659.3, 784], 1.6, 'sine', 0.035, t, 0, 0.12);
        break;
      case 'echo':
        this.burst(t, 1.4, 900, 12, 0.05);
        this.tone(311, 1.2, 'sine', 0.015, t, -20);
        break;
      case 'fall':
        this.chord([65.4, 77.8, 98], 3.5, 'sine', 0.1, t, -20, 0, true);
        break;
    }
  }

  // --- Building blocks --------------------------------------------------------------

  private out(): AudioNode {
    return this.master!;
  }

  /** Filtered noise, for crunches, cracks, splashes and breath. */
  private burst(at: number, dur: number, freq: number, q: number, vol: number, sweep = 0): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, at);
    if (sweep) f.frequency.linearRampToValueAtTime(Math.max(60, freq + sweep), at + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(this.out());
    src.start(at, Math.random() * 1.5, dur + 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, at: number, slide = 0): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.out());
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  /** Several tones; `spread` staggers them like an arpeggio; `swell` fades in slowly. */
  private chord(freqs: number[], dur: number, type: OscillatorType, vol: number, at: number, slide = 0, spread = 0, swell = false): void {
    const ctx = this.ctx!;
    freqs.forEach((freq, i) => {
      const start = at + i * spread;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      if (slide) o.frequency.linearRampToValueAtTime(freq + slide, start + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + (swell ? dur * 0.45 : 0.02));
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(this.out());
      o.start(start);
      o.stop(start + dur + 0.05);
    });
  }

  /** A voice sliding through pitches: the wolves. */
  private glide(freqs: number[], dur: number, vol: number, at: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const step = dur / (freqs.length - 1);
    freqs.forEach((f, i) => (i === 0 ? o.frequency.setValueAtTime(f, at) : o.frequency.linearRampToValueAtTime(f, at + i * step)));
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 6;
    vib.connect(vibGain).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.out());
    o.start(at);
    vib.start(at);
    o.stop(at + dur + 0.05);
    vib.stop(at + dur + 0.05);
  }

  private startWind(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.6;
    // Gusts: a slow wobble on the filter.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(filter.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    src.connect(filter).connect(gain).connect(this.out());
    src.start();
    lfo.start();
    this.wind = { gain, filter };
  }

  /** Music, for now: two low, slightly detuned notes that change every half minute or so. */
  private startDrone(): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 0.025;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    g.connect(filter).connect(this.out());
    const notes = [
      [73.4, 110],
      [65.4, 98],
      [58.3, 87.3],
      [73.4, 116.5],
    ];
    const oscs = [0, 1].map((i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = notes[0]![i]!;
      o.detune.value = i === 0 ? -6 : 7;
      o.connect(g);
      o.start();
      return o;
    });
    let n = 0;
    window.setInterval(() => {
      n = (n + 1) % notes.length;
      oscs.forEach((o, i) => o.frequency.setTargetAtTime(notes[n]![i]!, ctx.currentTime, 4));
    }, 28000);
  }

  /** The village fire's crackle, loud only when Signe is close to it. */
  private startFire(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2500;
    const crackle = ctx.createGain();
    crackle.gain.value = 0;
    // Pops: a fast random-ish flicker on the gain.
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    const level = ctx.createGain();
    level.gain.value = 0;
    lfo.connect(lfoGain).connect(crackle.gain);
    src.connect(f).connect(crackle).connect(level).connect(this.out());
    src.start();
    lfo.start();
    this.fire = level;
  }

  private renderButton(): void {
    if (!this.button) return;
    this.button.textContent = this.muted ? '🔇' : '🔊';
    this.button.title = this.muted ? 'Sound off' : 'Sound on';
    this.button.setAttribute('aria-label', this.muted ? 'Turn sound on' : 'Turn sound off');
  }
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** The one sound system, page-wide. */
export const sound = new Sound();
