// Generates placeholder pixel art into assets/sprites/.
// Real art can replace these files later as long as names and sizes stay the same.
//
// Object sprites follow one layout rule: the image is exactly as wide as the
// footprint's diamond, ((w + h) * TILE_W/2) px, and the footprint's bottom vertex
// sits on the image's bottom edge at x = w * TILE_W/2. The game anchors sprites there.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Canvas } from './png.mjs';

const TILE_W = 32;
const TILE_H = 16;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sprites');
mkdirSync(outDir, { recursive: true });

function save(name, canvas) {
  writeFileSync(join(outDir, name), canvas.toPng());
  console.log(`wrote assets/sprites/${name} (${canvas.width}x${canvas.height})`);
}

// --- Ground tiles -----------------------------------------------------------

/** True when the pixel centre lies inside the tile diamond whose top vertex is (HALF_W, 0). */
function inDiamond(px, py) {
  return Math.abs(px + 0.5 - HALF_W) / HALF_W + Math.abs(py + 0.5 - HALF_H) / HALF_H <= 1;
}

/** Deterministic per-pixel noise so tiles get a little texture without randomness. */
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Tile order here is the tileset order (local id 0..n-1); generate-kallsjo-map.mjs relies on it.
// Append new tiles at the end so existing ids stay stable.
const TILES = [
  { name: 'snow', base: '#dde4ec', speck: '#cbd5e0', edge: '#bfc9d6', density: 0.08 },
  { name: 'snow-2', base: '#d5dde7', speck: '#e8eef4', edge: '#bfc9d6', density: 0.1 },
  { name: 'shore', base: '#8a8275', speck: '#a39a8b', edge: '#6f685d', density: 0.25 },
  { name: 'shore-2', base: '#7f776b', speck: '#968e80', edge: '#6f685d', density: 0.2 },
  { name: 'ice', base: '#a7c6d9', speck: '#c4dbe8', edge: '#8fb1c6', density: 0.05 },
  { name: 'ice-2', base: '#9dbdd1', speck: '#b6d1e1', edge: '#8fb1c6', density: 0.06 },
  { name: 'water', base: '#2c4658', speck: '#36566b', edge: '#223848', density: 0.1 },
  { name: 'blocked', base: '#ff00ff', speck: '#ff00ff', edge: '#ff00ff', density: 0, alpha: 110 },
  { name: 'road', base: '#c9c2b4', speck: '#b5ad9d', edge: '#a8a091', density: 0.22 },
  { name: 'road-2', base: '#c2baab', speck: '#d3ccbf', edge: '#a8a091', density: 0.18 },
  { name: 'ice-road', base: '#c3d3dc', speck: '#d8e3ea', edge: '#9fb7c6', density: 0.2 },
  { name: 'wood', base: '#7a5c44', speck: '#5e4533', edge: '#4f3a2b', density: 0, planks: true },
  { name: 'rock', base: '#6d6f72', speck: '#7e8083', edge: '#55575a', density: 0.25 },
];

function generateTileset() {
  const canvas = new Canvas(TILE_W * TILES.length, TILE_H);
  TILES.forEach((tile, i) => {
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (!inDiamond(x, y)) continue;
        // Darken the two lower edges a little so the grid reads without hard lines.
        const lowerEdge = y >= HALF_H && !inDiamond(x, y + 1);
        const speck = tile.planks ? (x + 2 * y) % 8 === 0 : hash(x, y, i) < tile.density;
        const colour = lowerEdge ? tile.edge : speck ? tile.speck : tile.base;
        canvas.set(i * TILE_W + x, y, colour, tile.alpha ?? 255);
      }
    }
  });
  save('tiles.png', canvas);
}

// --- Iso boxes for objects --------------------------------------------------

/**
 * Rasterises a list of iso boxes into a sprite for a w x h tile footprint.
 * Each box: { u, v, du, dv, z, dz, top, left, right, pattern? } in tile units (u, v)
 * and pixels (z). Later boxes paint over earlier ones, so list them back to front.
 */
function drawBoxes(w, h, height, boxes) {
  const width = (w + h) * HALF_W;
  const imgH = (w + h) * HALF_H + height;
  const canvas = new Canvas(width, imgH);
  const groundTopY = height; // y of the footprint's top vertex at z = 0
  for (let py = 0; py < imgH; py++) {
    for (let px = 0; px < width; px++) {
      const X = px + 0.5;
      const Y = py + 0.5;
      const a = (X - h * HALF_W) / HALF_W; // u - v
      for (const box of boxes) {
        const hit = hitBox(box, a, X, Y, groundTopY);
        if (!hit) continue;
        const colour = box.pattern ? box.pattern(hit, px, py) : box[hit.face];
        if (colour) canvas.set(px, py, colour);
      }
    }
  }
  return canvas;
}

function hitBox(box, a, X, Y, groundTopY) {
  const eps = 1e-9;
  const zTop = box.z + box.dz;
  // Roof: plane z = zTop.
  const b = (Y - groundTopY + zTop) / HALF_H; // u + v
  const ru = (a + b) / 2;
  const rv = (b - a) / 2;
  if (ru >= box.u && ru < box.u + box.du && rv >= box.v && rv < box.v + box.dv) {
    return { face: 'top', u: ru, v: rv, z: zTop };
  }
  // Front-left face: plane v = v + dv.
  const lv = box.v + box.dv;
  const lu = a + lv;
  if (lu >= box.u - eps && lu <= box.u + box.du + eps) {
    const z = groundTopY + (lu + lv) * HALF_H - Y;
    if (z >= box.z && z < zTop) return { face: 'left', u: lu, v: lv, z };
  }
  // Front-right face: plane u = u + du.
  const ru2 = box.u + box.du;
  const rv2 = ru2 - a;
  if (rv2 >= box.v - eps && rv2 <= box.v + box.dv + eps) {
    const z = groundTopY + (ru2 + rv2) * HALF_H - Y;
    if (z >= box.z && z < zTop) return { face: 'right', u: ru2, v: rv2, z };
  }
  return null;
}

function generateBoathouse() {
  // 3 x 2 footprint. Dark tarred timber, snow on the roof, a door on the long side.
  const walls = {
    u: 0.1, v: 0.1, du: 2.8, dv: 1.8, z: 0, dz: 22,
    top: '#4a3a30', left: '#5b463a', right: '#3d2f27',
    pattern: (hit) => {
      if (hit.face === 'top') return '#4a3a30';
      const plank = Math.floor(hit.z) % 4 === 0;
      const base = hit.face === 'left' ? '#5b463a' : '#3d2f27';
      const door = hit.face === 'left' && hit.u > 1.2 && hit.u < 1.8 && hit.z < 16;
      if (door) return hit.z > 15 || hit.u < 1.25 || hit.u > 1.75 ? '#2a1f1a' : '#1d1612';
      return plank ? '#32261f' : base;
    },
  };
  const roof = {
    u: 0, v: 0, du: 3, dv: 2, z: 22, dz: 12,
    top: '#e9eef3', left: '#c9d2dc', right: '#a9b5c2',
  };
  save('boathouse.png', drawBoxes(3, 2, 34, [walls, roof]));
}

function generateBirch() {
  // 1 x 1 footprint. Bare winter birch: white trunk with dark marks, sparse twigs.
  const trunk = {
    u: 0.42, v: 0.42, du: 0.16, dv: 0.16, z: 0, dz: 40,
    pattern: (hit) => {
      const mark = Math.floor(hit.z) % 7 === 3 || Math.floor(hit.z) % 11 === 5;
      if (mark) return '#2b2b2b';
      return hit.face === 'right' ? '#c9c9c4' : '#f0f0ea';
    },
  };
  const twigs = {
    u: 0.15, v: 0.15, du: 0.7, dv: 0.7, z: 24, dz: 22,
    pattern: (hit, px, py) => {
      const shade = hit.face === 'right' ? '#4a3b33' : '#6b574a';
      return (px * 3 + py * 5) % 7 === 0 || (px + py) % 5 === 0 ? shade : null;
    },
  };
  save('birch.png', drawBoxes(1, 1, 46, [trunk, twigs]));
}

function generateNetRack() {
  // 2 x 1 footprint. Two posts with a crossbar and a hanging net.
  const post = (u) => ({
    u, v: 0.4, du: 0.12, dv: 0.2, z: 0, dz: 22,
    top: '#6b5444', left: '#5b463a', right: '#3d2f27',
  });
  const bar = {
    u: 0.1, v: 0.45, du: 1.8, dv: 0.1, z: 19, dz: 2,
    top: '#6b5444', left: '#5b463a', right: '#3d2f27',
  };
  const net = {
    u: 0.2, v: 0.5, du: 1.6, dv: 0.02, z: 6, dz: 13,
    pattern: (hit, px, py) => ((px + py) % 3 === 0 || (px - py + 99) % 3 === 0 ? '#7d7466' : null),
  };
  save('net-rack.png', drawBoxes(2, 1, 24, [post(0.1), post(1.78), net, bar]));
  // Torn: the net hangs in rags with gaps, and sags low.
  const torn = {
    u: 0.2, v: 0.5, du: 1.6, dv: 0.02, z: 2, dz: 17,
    pattern: (hit, px, py) => {
      if (hit.u > 0.7 && hit.u < 1.15 && hit.z < 14) return null; // a hole
      if (hit.z < 6 && (px * 7) % 5 !== 0) return null; // ragged bottom
      return (px + py) % 3 === 0 || (px - py + 99) % 4 === 0 ? '#6a6257' : null;
    },
  };
  save('net-rack-broken.png', drawBoxes(2, 1, 24, [post(0.1), post(1.78), torn, bar]));
}

function generateCraftables() {
  const wood = { top: '#8a6a4e', left: '#7a5c44', right: '#5a4433' };
  const crate = (broken) => drawBoxes(1, 1, broken ? 8 : 14, broken
    ? [
        { u: 0.15, v: 0.2, du: 0.7, dv: 0.25, z: 0, dz: 3, ...wood },
        { u: 0.3, v: 0.55, du: 0.55, dv: 0.2, z: 0, dz: 5, ...wood },
        { u: 0.2, v: 0.3, du: 0.2, dv: 0.5, z: 3, dz: 3, ...wood },
      ]
    : [{
        u: 0.18, v: 0.18, du: 0.64, dv: 0.64, z: 0, dz: 13,
        pattern: (hit) => (hit.face !== 'top' && (Math.floor(hit.z) % 4 === 0 || Math.abs((hit.face === 'left' ? hit.u : hit.v) - 0.5) < 0.04) ? '#4a3a2c' : wood[hit.face]),
      }]);
  save('crate.png', crate(false));
  save('crate-broken.png', crate(true));

  // A small wooden boat drawn up on the shore, 2 x 1. Broken: a hole stove in its side.
  const boat = (broken) => drawBoxes(2, 1, 12, [
    { u: 0.15, v: 0.25, du: 1.7, dv: 0.5, z: 0, dz: 4, top: '#3f3128', left: '#5b463a', right: '#3d2f27' },
    {
      u: 0.05, v: 0.15, du: 1.9, dv: 0.7, z: 4, dz: 6,
      pattern: (hit) => {
        if (hit.face === 'top') return Math.abs(hit.v - 0.5) < 0.22 && Math.abs(hit.u - 1) < 0.8 ? '#2a201a' : '#6b5444';
        if (broken && hit.face === 'left' && Math.abs(hit.u - 1.1) < 0.22 && hit.z < 9) return '#120d0a';
        return Math.floor(hit.z) % 3 === 0 ? '#3d2f27' : hit.face === 'left' ? '#7a5c44' : '#4f3a2b';
      },
    },
  ]);
  save('boat.png', boat(false));
  save('boat-broken.png', boat(true));

  save('sled-broken.png', drawBoxes(2, 1, 12, [
    { u: 0.1, v: 0.3, du: 1.1, dv: 0.4, z: 0, dz: 3, top: '#5b463a', left: '#4a3a30', right: '#3d2f27' },
    { u: 1.3, v: 0.4, du: 0.6, dv: 0.25, z: 0, dz: 2, top: '#5b463a', left: '#4a3a30', right: '#3d2f27' },
    { u: 0.3, v: 0.3, du: 0.8, dv: 0.4, z: 3, dz: 5, top: '#8a7a5a', left: '#6f6248', right: '#55493a' },
  ]));
  save('ice-marker-broken.png', drawBoxes(1, 1, 22, [
    { u: 0.2, v: 0.46, du: 0.6, dv: 0.08, z: 0, dz: 2, top: '#6b5444', left: '#5b463a', right: '#3d2f27' },
    { u: 0.15, v: 0.38, du: 0.24, dv: 0.24, z: 0, dz: 4, top: '#3f5a3a', left: '#35502f', right: '#273d23' },
  ]));
}

/** Tile overlays for Craft effects on ice, and the targeting highlight. Same size as a ground tile. */
function generateEffects() {
  const overlay = (name, paint) => {
    const c = new Canvas(TILE_W, TILE_H);
    for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) if (inDiamond(x, y)) paint(c, x, y);
    save(name, c);
  };
  // Strengthened: thick, pale, bluish ice.
  overlay('fx-strengthened.png', (c, x, y) => c.set(x, y, (x + y) % 6 === 0 ? '#ffffff' : '#e4f3ff', 150));
  // Armed: faint cracks only Signe would notice.
  overlay('fx-armed.png', (c, x, y) => {
    const crack = Math.abs(y - 8 - (x - 16) * 0.3) < 0.6 || Math.abs(x - 20 + (y - 8) * 1.2) < 0.6;
    if (crack) c.set(x, y, '#5a7f99', 170);
  });
  // Targeting: where the chosen ability can land.
  overlay('fx-target.png', (c, x, y) => {
    const edge = !inDiamond(x - 1, y) || !inDiamond(x + 1, y) || !inDiamond(x, y - 1) || !inDiamond(x, y + 1);
    c.set(x, y, '#f0c674', edge ? 200 : 45);
  });
}

function generateStatue() {
  // 1 x 1 footprint. Stone pedestal and a hooded figure: Saint Maren on the shore.
  const pedestal = {
    u: 0.1, v: 0.1, du: 0.8, dv: 0.8, z: 0, dz: 8,
    top: '#9a9a96', left: '#83837f', right: '#6a6a66',
  };
  const figure = {
    u: 0.3, v: 0.3, du: 0.4, dv: 0.4, z: 8, dz: 24,
    top: '#b2b2ad', left: '#9a9a96', right: '#7a7a76',
  };
  const head = {
    u: 0.38, v: 0.38, du: 0.24, dv: 0.24, z: 32, dz: 6,
    top: '#c0c0bb', left: '#a6a6a1', right: '#868682',
  };
  save('statue.png', drawBoxes(1, 1, 38, [pedestal, figure, head]));
}

function generateSigne() {
  // 1 x 1 footprint. Placeholder figure: dark red wool coat, pale face.
  const legs = {
    u: 0.42, v: 0.42, du: 0.16, dv: 0.16, z: 0, dz: 6,
    top: '#2a2420', left: '#2a2420', right: '#1d1916',
  };
  const coat = {
    u: 0.36, v: 0.36, du: 0.28, dv: 0.28, z: 5, dz: 13,
    top: '#8a2f2a', left: '#7a2925', right: '#5a1e1b',
  };
  const head = {
    u: 0.4, v: 0.4, du: 0.2, dv: 0.2, z: 18, dz: 6,
    top: '#d9b28c', left: '#e8c6a3', right: '#c49a73',
  };
  const hood = {
    u: 0.38, v: 0.38, du: 0.24, dv: 0.24, z: 22, dz: 3,
    top: '#6a221f', left: '#7a2925', right: '#5a1e1b',
  };
  save('signe.png', drawBoxes(1, 1, 26, [legs, coat, head, hood]));
}

/** A standing figure on a 1 x 1 footprint, in the same style as Signe. */
function figure({ coat, coatDark, hood, skin = '#d9b28c', skinLight = '#e8c6a3', skinDark = '#c49a73', scale = 1 }) {
  const s = (z) => Math.round(z * scale);
  return drawBoxes(1, 1, s(26), [
    { u: 0.42, v: 0.42, du: 0.16, dv: 0.16, z: 0, dz: s(6), top: '#2a2420', left: '#2a2420', right: '#1d1916' },
    { u: 0.36, v: 0.36, du: 0.28, dv: 0.28, z: s(5), dz: s(13), top: coat, left: coat, right: coatDark },
    { u: 0.4, v: 0.4, du: 0.2, dv: 0.2, z: s(18), dz: s(6), top: skin, left: skinLight, right: skinDark },
    { u: 0.38, v: 0.38, du: 0.24, dv: 0.24, z: s(22), dz: s(3), top: hood, left: hood, right: coatDark },
  ]);
}

function generatePeople() {
  // One placeholder per person: npc-<id>.png. Colours only tell them apart.
  const people = {
    ebbe: { coat: '#5b6b4a', coatDark: '#3f4b33', hood: '#8a8a82' },
    hermit: { coat: '#6b5a44', coatDark: '#4a3d2e', hood: '#4a3d2e' },
    gerda: { coat: '#4a4f6b', coatDark: '#33374a', hood: '#d6d6d0' },
    olle: { coat: '#2f3a4f', coatDark: '#1f2735', hood: '#1f2735' },
    hollow: { coat: '#9a9a96', coatDark: '#7a7a76', hood: '#b8b8b2', skin: '#c9c3bb', skinLight: '#d6d0c8', skinDark: '#b0aaa2' },
    lilja: { coat: '#c26a3a', coatDark: '#8f4b28', hood: '#e0b040', scale: 0.8 },
    torvald: { coat: '#3f5a6b', coatDark: '#2c3f4b', hood: '#6b5444' },
  };
  for (const [id, colours] of Object.entries(people)) save(`npc-${id}.png`, figure(colours));
}

// --- The wider world (Kallsjö) ---------------------------------------------

/** Seeded random numbers, so regenerating gives the same art. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateHouses() {
  // Timber houses with snowy roofs. A roof is a stack of shrinking boxes (a stepped gable).
  const house = (w, h, wallH, wall, wallDark, door) => {
    const boxes = [{
      u: 0.15, v: 0.15, du: w - 0.3, dv: h - 0.3, z: 0, dz: wallH,
      pattern: (hit) => {
        if (hit.face === 'top') return wall;
        const base = hit.face === 'left' ? wall : wallDark;
        const isDoor = hit.face === 'left' && Math.abs(hit.u - door) < 0.28 && hit.z < wallH * 0.7;
        const isWindow = hit.face === 'right' && Math.abs(hit.v - h / 2) < 0.22 && hit.z > wallH * 0.35 && hit.z < wallH * 0.7;
        if (isDoor) return '#1d1612';
        if (isWindow) return '#e8c27a';
        return Math.floor(hit.z) % 4 === 0 ? '#2a201a' : base;
      },
    }];
    const steps = 4;
    for (let k = 0; k < steps; k++) {
      const inset = (k * (h / 2 - 0.1)) / steps;
      boxes.push({
        u: 0, v: inset, du: w, dv: h - 2 * inset, z: wallH + k * 4, dz: 4,
        top: '#eef2f6', left: '#d0d8e0', right: '#aeb9c4',
      });
    }
    return drawBoxes(w, h, wallH + steps * 4, boxes);
  };
  save('house.png', house(3, 2, 20, '#6b4a36', '#4a3326', 1.5));
  save('house-small.png', house(2, 2, 16, '#5d4636', '#41312a', 1));
  save('hut.png', house(2, 2, 12, '#55493d', '#3b332b', 0.9));
}

function generateMountains() {
  // Stepped rock with snow higher up. Sizes match the footprints the map uses.
  const random = rng(7);
  for (const size of [8, 4, 2, 1]) {
    for (const variant of ['a', 'b']) {
      const height = Math.round(size * (16 + random() * 6));
      const tiers = Math.max(2, Math.min(6, size + 1));
      const boxes = [];
      for (let k = 0; k < tiers; k++) {
        const inset = (k / tiers) * size * 0.42 + random() * 0.08 * size;
        const z = (k / tiers) * height;
        const snowy = k >= tiers * 0.55;
        boxes.push({
          u: Math.min(inset, size / 2 - 0.1), v: Math.min(inset * (0.8 + random() * 0.4), size / 2 - 0.1),
          du: Math.max(0.2, size - 2 * inset), dv: Math.max(0.2, size - 2 * inset),
          z, dz: height / tiers + 1,
          top: snowy ? '#eef2f6' : '#7d8084', left: snowy ? '#d3dbe3' : '#65686c', right: snowy ? '#aab6c2' : '#4c4f53',
        });
      }
      save(`mountain-${size}${variant}.png`, drawBoxes(size, size, height + 2, boxes));
    }
  }
}

function generateNature() {
  // A taller birch variant, reeds and a ruined wall.
  const trunk = (h) => ({
    u: 0.44, v: 0.44, du: 0.14, dv: 0.14, z: 0, dz: h,
    pattern: (hit) => (Math.floor(hit.z) % 9 === 4 || Math.floor(hit.z) % 13 === 7 ? '#2b2b2b' : hit.face === 'right' ? '#c9c9c4' : '#f0f0ea'),
  });
  const twigs = (z, dz) => ({
    u: 0.1, v: 0.1, du: 0.8, dv: 0.8, z, dz,
    pattern: (hit, px, py) => ((px * 5 + py * 3) % 7 === 0 || (px + 2 * py) % 6 === 0 ? (hit.face === 'right' ? '#4a3b33' : '#6b574a') : null),
  });
  save('birch-2.png', drawBoxes(1, 1, 58, [trunk(52), twigs(30, 28)]));
  save('reeds.png', drawBoxes(1, 1, 14, [{
    u: 0.1, v: 0.1, du: 0.8, dv: 0.8, z: 0, dz: 13,
    pattern: (hit, px, py) => (px % 3 === 0 || (px + py) % 5 === 0 ? (hit.z > 10 ? '#b59a5e' : '#8a7448') : null),
  }]));
  const ruin = [
    { u: 0.1, v: 0.1, du: 1.8, dv: 0.25, z: 0, dz: 14, top: '#9a948a', left: '#857f76', right: '#6b665f' },
    { u: 0.1, v: 0.35, du: 0.25, dv: 1.1, z: 0, dz: 9, top: '#9a948a', left: '#857f76', right: '#6b665f' },
    { u: 1.2, v: 1.4, du: 0.6, dv: 0.3, z: 0, dz: 5, top: '#9a948a', left: '#857f76', right: '#6b665f' },
  ];
  save('ruin.png', drawBoxes(2, 2, 16, ruin));
  // Ice road markers: a pole with a sprig of spruce, as on real ice roads.
  save('ice-marker.png', drawBoxes(1, 1, 22, [
    { u: 0.46, v: 0.46, du: 0.08, dv: 0.08, z: 0, dz: 18, top: '#6b5444', left: '#5b463a', right: '#3d2f27' },
    { u: 0.38, v: 0.38, du: 0.24, dv: 0.24, z: 14, dz: 7, top: '#3f5a3a', left: '#35502f', right: '#273d23' },
  ]));
  save('sled.png', drawBoxes(2, 1, 12, [
    { u: 0.1, v: 0.3, du: 1.8, dv: 0.4, z: 0, dz: 3, top: '#5b463a', left: '#4a3a30', right: '#3d2f27' },
    { u: 0.3, v: 0.3, du: 1.2, dv: 0.4, z: 3, dz: 7, top: '#8a7a5a', left: '#6f6248', right: '#55493a' },
  ]));
}

function generateMarker() {
  // Tile-sized diamond outline for the click target.
  const canvas = new Canvas(TILE_W, TILE_H);
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inDiamond(x, y)) continue;
      const edge = !inDiamond(x - 1, y) || !inDiamond(x + 1, y) || !inDiamond(x, y - 1) || !inDiamond(x, y + 1);
      if (edge) canvas.set(x, y, '#ffffff', 170);
    }
  }
  save('marker.png', canvas);
}

generateTileset();
generateBoathouse();
generateBirch();
generateNetRack();
generateStatue();
generateSigne();
generatePeople();
generateHouses();
generateMountains();
generateNature();
generateCraftables();
generateEffects();
generateMarker();
