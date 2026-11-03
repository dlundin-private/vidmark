import type { Art, Painter } from './Cinematic';
import { H, W } from './Cinematic';

// The pictures for the intro and the end of chapter 1: small pixel scenes made
// of flat bands, stepped silhouettes and the game's own sprites. Placeholder
// art, like the sprites; each painter can be replaced by a real illustration.

type G = CanvasRenderingContext2D;

const rand = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A sky in flat bands from `top` colour to `bottom`, like a pixel gradient. */
function sky(g: G, top: [number, number, number], bottom: [number, number, number], to = H, bands = 10): void {
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    const c = top.map((v, j) => Math.round(v + (bottom[j]! - v) * k));
    g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    g.fillRect(0, Math.floor((i * to) / bands), W, Math.ceil(to / bands) + 1);
  }
}

function stars(g: G, t: number, count: number, maxY: number): void {
  const r = rand(7);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * maxY);
    const twinkle = Math.sin(t / 700 + i * 1.7) > 0.6 ? 0.4 : 1;
    g.fillStyle = `rgba(230,238,255,${0.5 * twinkle + r() * 0.4})`;
    g.fillRect(x, y, 1, 1);
  }
}

/** A stepped mountain line along the horizon. */
function mountains(g: G, baseY: number, height: number, colour: string, seed: number, snow?: string): void {
  const r = rand(seed);
  let h = height * 0.5;
  for (let x = 0; x < W; x += 2) {
    h = Math.max(4, Math.min(height, h + (r() - 0.5) * 6));
    g.fillStyle = colour;
    g.fillRect(x, Math.round(baseY - h), 2, Math.round(h) + 1);
    if (snow && h > height * 0.62) {
      g.fillStyle = snow;
      g.fillRect(x, Math.round(baseY - h), 2, 2);
    }
  }
}

/** Flat ice from `y` down, with a few long pale streaks. */
function ice(g: G, y: number, colour: string, streak: string): void {
  g.fillStyle = colour;
  g.fillRect(0, y, W, H - y);
  const r = rand(11);
  g.fillStyle = streak;
  for (let i = 0; i < 14; i++) {
    const sy = y + 3 + Math.floor(r() * (H - y - 4));
    const sx = Math.floor(r() * W);
    g.fillRect(sx, sy, 8 + Math.floor(r() * 30), 1);
  }
}

/** Draws a game sprite with its bottom centre at (x, y), on whole pixels. */
function sprite(g: G, art: Art, key: string, x: number, y: number, alpha = 1): void {
  const img = art(key) as (CanvasImageSource & { width: number; height: number }) | null;
  if (!img) return;
  g.globalAlpha = alpha;
  g.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height));
  g.globalAlpha = 1;
}

function moon(g: G, x: number, y: number): void {
  g.fillStyle = '#e9edf2';
  for (let dy = -5; dy <= 5; dy++) {
    const w = Math.round(Math.sqrt(25 - dy * dy));
    g.fillRect(x - w, y + dy, w * 2, 1);
  }
  // A soft round glow, in pixel rings.
  for (const [r, a] of [[11, 0.05], [8, 0.07]] as const) {
    g.fillStyle = `rgba(233,237,242,${a})`;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      g.fillRect(x - w, y + dy, w * 2, 1);
    }
  }
}

/** Smoke rising from a chimney: a few drifting grey pixels. */
function smoke(g: G, t: number, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const p = ((t / 2600 + i / 8) % 1);
    g.fillStyle = `rgba(190,196,204,${0.5 * (1 - p)})`;
    g.fillRect(Math.round(x + Math.sin(p * 6 + i) * 3 + p * 6), Math.round(y - p * 30), 2, 2);
  }
}

// --- The intro -----------------------------------------------------------------------

export const nightLake: Painter = (g, t) => {
  sky(g, [6, 10, 24], [24, 38, 64], 92);
  stars(g, t, 60, 70);
  moon(g, 184, 26);
  mountains(g, 92, 30, '#101a2b', 3, '#4a5a72');
  mountains(g, 94, 16, '#16233a', 5);
  ice(g, 94, '#9fb4c8', '#b9cbdc');
  // The ice road's markers, receding.
  for (let i = 0; i < 6; i++) {
    const y = 104 + i * 8;
    g.fillStyle = '#3b2e22';
    g.fillRect(110 - i * 6, y - 4 - i, 1, 4 + i);
    g.fillRect(130 + i * 6, y - 4 - i, 1, 4 + i);
  }
};

export const village: Painter = (g, t, art) => {
  sky(g, [10, 16, 32], [36, 48, 72], 84);
  stars(g, t, 30, 50);
  mountains(g, 84, 24, '#121c2d', 9, '#55657c');
  g.fillStyle = '#d8e1ea';
  g.fillRect(0, 84, W, H - 84);
  const houses: [string, number, number][] = [['hut', 40, 116], ['house', 122, 128], ['house-small', 204, 120]];
  for (const [key, x, y] of houses) sprite(g, art, key, x, y);
  smoke(g, t, 126, 74);
  smoke(g, t + 900, 44, 80);
  // The lake beyond, a cold strip.
  g.fillStyle = '#a9bccd';
  g.fillRect(0, 84, W, 6);
};

export const girlOnIce: Painter = (g, t, art) => {
  sky(g, [8, 12, 28], [30, 44, 70], 80);
  moon(g, 60, 22);
  stars(g, t, 40, 60);
  mountains(g, 80, 20, '#121c2d', 13);
  ice(g, 80, '#a6bacd', '#c3d3e1');
  // Lilja slides across, and back.
  const p = (Math.sin(t / 1600) + 1) / 2;
  const x = 40 + p * 160;
  sprite(g, art, 'npc-lilja', x, 122);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(Math.round(x - 30 * Math.sign(Math.cos(t / 1600))), 121, 18, 1);
  // The reeds at the edge she must not pass.
  for (const rx of [200, 206, 214, 221]) {
    g.fillStyle = '#5a5a3c';
    g.fillRect(rx, 108, 1, 14);
  }
};

export const coatByDoor: Painter = (g, t) => {
  // A dark room: wall, floor, a door with light under it, a coat on its peg.
  g.fillStyle = '#17120e';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#231a13';
  for (let y = 0; y < 112; y += 6) g.fillRect(0, y, W, 1);
  g.fillStyle = '#2b2118';
  g.fillRect(0, 112, W, H - 112);
  // Door.
  g.fillStyle = '#3a2b1e';
  g.fillRect(150, 40, 40, 72);
  const flicker = 0.6 + 0.15 * Math.sin(t / 300);
  g.fillStyle = `rgba(230,180,110,${flicker})`;
  g.fillRect(150, 111, 40, 1);
  // The coat: a stranger's, heavy, hanging from a peg.
  g.fillStyle = '#4a3324';
  g.fillRect(118, 44, 3, 2);
  g.fillStyle = '#6e5a46';
  g.fillRect(110, 46, 18, 6);
  g.fillRect(108, 52, 22, 34);
  g.fillStyle = '#5a4838';
  g.fillRect(108, 52, 3, 34);
  g.fillRect(118, 52, 1, 34);
  // Moonlight through a small window.
  g.fillStyle = 'rgba(160,185,215,0.16)';
  g.fillRect(40, 30, 26, 20);
  g.fillStyle = 'rgba(160,185,215,0.06)';
  g.fillRect(50, 50, 60, 70);
};

export const waking: Painter = (g, t, art) => {
  // From darkness, slowly, the room and Signe.
  const light = Math.min(1, t / 3500);
  sky(g, [Math.round(12 * light), Math.round(14 * light), Math.round(20 * light)], [Math.round(48 * light), Math.round(40 * light), Math.round(34 * light)]);
  g.fillStyle = `rgba(232,190,120,${0.25 * light})`;
  g.fillRect(150, 30, 30, 26);
  sprite(g, art, 'signe', W / 2, 124, light);
};

// --- The end of chapter 1 -------------------------------------------------------------

export const dawnRoad: Painter = (g, t) => {
  sky(g, [64, 72, 96], [214, 180, 170], 80);
  mountains(g, 80, 26, '#56607a', 21, '#e4e2ea');
  ice(g, 80, '#c7d3df', '#dde6ee');
  // The road across the ice, and the runners of a sled going north on it.
  g.fillStyle = '#b3c2d1';
  g.fillRect(104, 80, 32, H - 80);
  g.fillStyle = '#6d7684';
  for (let y = 82; y < H; y += 3) {
    const spread = Math.round((y - 80) * 0.12);
    g.fillRect(118 - spread, y, 1, 2);
    g.fillRect(122 + spread, y, 1, 2);
  }
  // A dark speck far out, almost at the far shore.
  if (Math.floor(t / 600) % 2 === 0) {
    g.fillStyle = '#2a2a33';
    g.fillRect(119, 82, 3, 2);
  }
};

export const emptyBed: Painter = (g, t) => {
  g.fillStyle = '#1c1611';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#2a2018';
  g.fillRect(0, 108, W, H - 108);
  // The bed, its blanket thrown back.
  g.fillStyle = '#4a3a2c';
  g.fillRect(60, 92, 80, 20);
  g.fillStyle = '#7a6a58';
  g.fillRect(62, 86, 76, 8);
  g.fillStyle = '#8f4b28';
  g.fillRect(96, 86, 42, 6);
  // The stove, its embers, and two small mittens drying.
  g.fillStyle = '#3a3a3a';
  g.fillRect(168, 70, 28, 40);
  const ember = 0.5 + 0.3 * Math.sin(t / 250);
  g.fillStyle = `rgba(220,110,40,${ember})`;
  g.fillRect(174, 96, 16, 4);
  g.fillStyle = '#c26a3a';
  g.fillRect(172, 62, 6, 7);
  g.fillRect(184, 62, 6, 7);
  g.fillStyle = 'rgba(200,180,150,0.12)';
  g.fillRect(20, 30, 30, 24);
};

export const ledger: Painter = (g) => {
  // A journal page: Signe writes down how she got here.
  g.fillStyle = '#0d0b09';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#e6dbc1';
  g.fillRect(40, 12, 160, 126);
  g.fillStyle = '#cfc2a4';
  g.fillRect(119, 12, 2, 126);
  g.fillStyle = 'rgba(80,60,40,0.25)';
  for (let y = 26; y < 134; y += 8) {
    g.fillRect(48, y, 66, 1);
    g.fillRect(126, y, 66, 1);
  }
};

export const warmPoint: Painter = (g, t) => {
  g.fillStyle = '#050608';
  g.fillRect(0, 0, W, H);
  const pulse = 0.7 + 0.3 * Math.sin(t / 900);
  for (let r = 18; r > 0; r -= 3) {
    g.fillStyle = `rgba(232,170,96,${(0.05 + (18 - r) * 0.012) * pulse})`;
    g.fillRect(W / 2 - r, H / 2 - r, r * 2, r * 2);
  }
  g.fillStyle = `rgba(255,220,160,${pulse})`;
  g.fillRect(W / 2 - 1, H / 2 - 1, 2, 2);
};

export const northPass: Painter = (g, t) => {
  sky(g, [94, 108, 132], [196, 204, 214], 96);
  mountains(g, 96, 52, '#3c465a', 31, '#e8ecf2');
  mountains(g, 100, 30, '#4c566b', 33, '#dfe5ec');
  g.fillStyle = '#e3e9ef';
  g.fillRect(0, 100, W, H - 100);
  // The road climbing to the pass, and a small figure on it.
  g.fillStyle = '#a99a86';
  for (let y = 100; y < H; y++) {
    const w = 4 + Math.round((y - 100) * 0.5);
    g.fillRect(W / 2 - w / 2 + Math.round((H - y) * 0.15), y, w, 1);
  }
  const walk = Math.min(1, t / 9000);
  const fy = 140 - walk * 30;
  g.fillStyle = '#8a2f2a';
  g.fillRect(Math.round(W / 2 + (H - fy) * 0.15) - 1, Math.round(fy) - 5, 3, 5);
};

// --- Arriving in Järnfors --------------------------------------------------------------

export const gorgeDam: Painter = (g, t) => {
  sky(g, [30, 36, 56], [118, 108, 120], 70);
  stars(g, t, 16, 30);
  // The gorge walls, close on both sides.
  g.fillStyle = '#2a2e38';
  for (let y = 0; y < H; y++) {
    const w = 40 + Math.round(Math.sin(y / 9) * 4) + Math.round((H - y) * 0.15);
    g.fillRect(0, y, w, 1);
    g.fillRect(W - w, y, w, 1);
  }
  // The dam: a long grey wall across the gorge, the statue on its crest.
  g.fillStyle = '#6a6e78';
  g.fillRect(40, 44, 160, 22);
  g.fillStyle = '#7d818b';
  g.fillRect(40, 44, 160, 3);
  g.fillStyle = '#4c5058';
  for (let x = 44; x < 198; x += 8) g.fillRect(x, 50 + ((x / 8) % 2) * 6, 1, 6);
  g.fillStyle = '#3a3d44';
  g.fillRect(118, 38, 3, 6);
  g.fillRect(117, 40, 5, 2);
  // The spillway's water, falling and moving.
  for (let y = 66; y < H; y++) {
    const phase = Math.floor(t / 120 + y) % 3;
    g.fillStyle = phase === 0 ? '#9fb9c9' : '#2a4558';
    g.fillRect(122 - Math.floor((y - 66) * 0.1), y, 6 + Math.floor((y - 66) * 0.2), 1);
  }
  // The city below: lit windows climbing the terraces.
  const r = rand(77);
  for (let i = 0; i < 34; i++) {
    const x = 48 + Math.floor(r() * 144);
    const y = 76 + Math.floor(r() * 66);
    if (x > 114 && x < 138) continue;
    g.fillStyle = '#3a3a40';
    g.fillRect(x - 3, y - 2, 8, 6);
    if (r() < 0.7) {
      g.fillStyle = Math.sin(t / 400 + i) > -0.6 ? '#e6b46a' : '#b88a4a';
      g.fillRect(x, y, 2, 2);
    }
  }
};
