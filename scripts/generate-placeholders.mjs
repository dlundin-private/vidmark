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

// Tile order here is the tileset order (local id 0..n-1); generate-test-map.mjs relies on it.
const TILES = [
  { name: 'snow', base: '#dde4ec', speck: '#cbd5e0', edge: '#bfc9d6', density: 0.08 },
  { name: 'snow-2', base: '#d5dde7', speck: '#e8eef4', edge: '#bfc9d6', density: 0.1 },
  { name: 'shore', base: '#8a8275', speck: '#a39a8b', edge: '#6f685d', density: 0.25 },
  { name: 'shore-2', base: '#7f776b', speck: '#968e80', edge: '#6f685d', density: 0.2 },
  { name: 'ice', base: '#a7c6d9', speck: '#c4dbe8', edge: '#8fb1c6', density: 0.05 },
  { name: 'ice-2', base: '#9dbdd1', speck: '#b6d1e1', edge: '#8fb1c6', density: 0.06 },
  { name: 'water', base: '#2c4658', speck: '#36566b', edge: '#223848', density: 0.1 },
  { name: 'blocked', base: '#ff00ff', speck: '#ff00ff', edge: '#ff00ff', density: 0, alpha: 110 },
];

function generateTileset() {
  const canvas = new Canvas(TILE_W * TILES.length, TILE_H);
  TILES.forEach((tile, i) => {
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (!inDiamond(x, y)) continue;
        // Darken the two lower edges a little so the grid reads without hard lines.
        const lowerEdge = y >= HALF_H && !inDiamond(x, y + 1);
        const speck = hash(x, y, i) < tile.density;
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
generateMarker();
