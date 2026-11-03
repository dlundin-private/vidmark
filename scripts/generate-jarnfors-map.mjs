// Generates assets/maps/jarnfors.json: chapter 2's district of Järnfors, 128 x 128
// (Daniel: one district, about 128 x 128, built by hand). Laid out on purpose,
// not by noise: a gorge with a frozen reservoir in the north, Maren's Dam across
// it, the river running south from the spillway, and the builders' city on
// terraces either side. Layout is Claude's draft (docs/chapter-2-jarnfors.md).
//
// The output is a normal Tiled JSON map and can be hand-edited in Tiled once the
// layout is approved. Checks at the end refuse a map where anything is out of
// reach or on the wrong ground.
import process from 'node:process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 128;
const TILE_W = 32;
const TILE_H = 16;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Global tile ids: tileset order in generate-placeholders.mjs, firstgid 1.
const GID = {
  snow: 1, snow2: 2, shore: 3, ice: 5, ice2: 6, water: 7, blocked: 8,
  road: 9, road2: 10, wood: 12, rock: 13, stone: 15, dam: 16, river: 17, damFace: 18,
};

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// --- Terrain -------------------------------------------------------------------
// Kinds: snow, stone (streets, stairs), dam (crest, relief cut), damFace (blocked),
// mountain (blocked), ice (reservoir), water (open reservoir), river (blocked), wood (bridges).
const kind = new Array(SIZE * SIZE).fill('snow');
const idx = (x, y) => y * SIZE + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
const set = (x, y, k) => inMap(x, y) && (kind[idx(x, y)] = k);
const get = (x, y) => (inMap(x, y) ? kind[idx(x, y)] : 'mountain');
const rect = (x0, y0, x1, y1, k) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, k);
};

/** The gorge's walls: where the rock begins on each side of row y (a little ragged). */
const westWall = (y) => 20 + Math.round(Math.sin(y / 9) * 2 + hash2(0, y, 3) * 1.5);
const eastWall = (y) => 106 + Math.round(Math.sin(y / 11 + 1) * 2 - hash2(1, y, 3) * 1.5);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) if (x < westWall(y) || x > eastWall(y)) set(x, y, 'mountain');
}

// The reservoir: frozen, with a strip of open water where the spillway pulls at it.
const CREST = { y0: 30, y1: 32 };
for (let y = 0; y < CREST.y0; y++) for (let x = westWall(y); x <= eastWall(y); x++) set(x, y, 'ice');
rect(68, 26, 75, 29, 'water');

// Maren's Dam: a crest three tiles wide from wall to wall, and its face below.
for (let y = CREST.y0; y <= CREST.y1; y++) for (let x = westWall(y) - 2; x <= eastWall(y) + 2; x++) set(x, y, 'dam');
for (let y = CREST.y1 + 1; y <= CREST.y1 + 4; y++) for (let x = westWall(y) - 1; x <= eastWall(y) + 1; x++) set(x, y, 'damFace');
// The spillway: the crest bridges it in timber, the river falls from it.
const SPILL = { x0: 70, x1: 73 };
rect(SPILL.x0, CREST.y0, SPILL.x1, CREST.y1, 'wood');
rect(SPILL.x0, CREST.y1 + 1, SPILL.x1, CREST.y1 + 4, 'river');

// The river, south from the spillway, wandering a little.
const riverX = (y) => Math.round(70 + Math.sin(y / 14) * 4 + (y > 90 ? (y - 90) * -0.12 : 0));
for (let y = CREST.y1 + 5; y < SIZE; y++) for (let x = riverX(y); x <= riverX(y) + 3; x++) set(x, y, 'river');

// Stairs from the city up to the crest, at each end of the dam.
const STAIRS_W = { x0: 26, x1: 28 };
const STAIRS_E = { x0: 99, x1: 101 };
for (const s of [STAIRS_W, STAIRS_E]) rect(s.x0, CREST.y1 + 1, s.x1, CREST.y1 + 4, 'stone');

/** A paved street from point to point (axis by axis), `w` tiles wide; bridges where it crosses the river. */
function street(points, w = 2) {
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const sx = Math.sign(bx - ax);
    const sy = Math.sign(by - ay);
    let x = ax;
    let y = ay;
    for (;;) {
      for (let d = 0; d < w; d++) {
        const tx = sy !== 0 ? x + d : x;
        const ty = sx !== 0 ? y + d : y;
        const here = get(tx, ty);
        if (here === 'river') set(tx, ty, 'wood');
        else if (here === 'snow' || here === 'stone') set(tx, ty, 'stone');
      }
      if (x === bx && y === by) break;
      if (x !== bx) x += sx;
      else y += sy;
    }
  }
}

// The streets: along each bank under the dam, down the gorge, and across three bridges.
street([[27, 37], [27, 120], [44, 120], [44, 127]]); // west bank, down to the south gate
street([[100, 37], [100, 100]]); // east bank
street([[27, 40], [100, 40]], 2); // under the dam, both banks
street([[27, 66], [100, 66]], 2); // the middle bridge
street([[27, 96], [100, 96]], 2); // the lower bridge, into the lower quarter
street([[44, 40], [44, 96]]); // the upper street, west
street([[86, 40], [86, 96]]); // the upper street, east

// The relief cut: Halvar's old channel, sealed, running down inside the west wall.
// Reached only by a gap in the rock from the lower quarter: easy to miss.
const CUT = { x: 22, y0: CREST.y1 + 3, y1: 104 };
for (let y = CUT.y0; y <= CUT.y1; y++) {
  rect(CUT.x - 2, y, CUT.x - 1, y, 'mountain');
  rect(CUT.x, y, CUT.x + 1, y, 'dam');
  if (y < CUT.y1 - 1) rect(CUT.x + 2, y, CUT.x + 3, y, 'mountain'); // rock between the cut and the street
}
rect(CUT.x + 2, CUT.y1 - 1, 26, CUT.y1, 'stone'); // the gap from the street

// --- Objects ---------------------------------------------------------------------

const objects = [];
const occupied = new Uint8Array(SIZE * SIZE);
const free = (x, y, w, h) => {
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) if (!inMap(tx, ty) || occupied[idx(tx, ty)]) return false;
  return true;
};
function place(name, x, y, w = 1, h = 1, extra = {}) {
  if (!free(x, y, w, h)) throw new Error(`Can't place ${name} at ${x},${y}: occupied`);
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) occupied[idx(tx, ty)] = 1;
  objects.push({ name, sprite: extra.sprite ?? name, x, y, w, h, rest: extra.rest, inspect: extra.inspect, type: extra.type });
}

// On the crest: Saint Maren, one hand flat on the stone.
place('statue', 56, CREST.y0, 1, 1, { inspect: 'place_dam_statue' });
// The gallery's door in the dam face, its approach on the street below.
place('gallery-door', 46, CREST.y1 + 4, 1, 1, { inspect: 'place_gallery' });
// The plug that seals the relief cut, at its top against the dam.
place('relief-plug', CUT.x, CUT.y0 - 2, 2, 2, { inspect: 'place_relief_cut' });

// West bank, upper terrace.
place('hollow-house', 31, 43, 3, 2, { inspect: 'place_hollow_house' }); // Edda's Hollow-house; Brita's room above
place('hall', 47, 44, 3, 3, { inspect: 'place_apprentices_hall' }); // the apprentices' hall, nine marks on the lintel
place('stonehouse', 31, 50, 2, 2);
place('stonehouse', 36, 54, 2, 2);
place('inn', 47, 58, 3, 2, { rest: true }); // where Signe rests in Järnfors
place('stonehouse-big', 31, 70, 3, 2);
place('stonehouse', 47, 70, 2, 2);
place('forge', 36, 76, 2, 2);
place('forge', 50, 80, 2, 2);
// East bank.
place('tithe-house', 89, 43, 3, 2, { inspect: 'place_tithe_house' }); // where those bound for Kronvall wait
place('stonehouse-big', 89, 50, 3, 2);
place('stonehouse', 80, 52, 2, 2);
place('stonehouse', 89, 70, 2, 2);
place('stonehouse-big', 80, 74, 3, 2);
// Gudmund's mason yard, below the dam's east end: blocks, crates and a sled to push.
place('crate', 92, 60);
place('crate', 94, 61);
place('sled', 95, 58, 2, 1);
// The lower quarter: forges and huts packed by the river, where the poor live.
for (const [x, y] of [[32, 100], [36, 104], [32, 110], [38, 112], [48, 100], [52, 106], [58, 112], [48, 114]]) place('hut', x, y, 2, 2);
place('forge', 56, 100, 2, 2);
// A few spruce on the snow, and rock heaped on the walls.
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const k = get(x, y);
    if (k === 'mountain' && hash2(x, y, 41) < 0.05 && free(x, y, 2, 2) && get(x + 1, y + 1) === 'mountain' && get(x + 1, y) === 'mountain' && get(x, y + 1) === 'mountain') {
      place(hash2(x, y, 42) < 0.5 ? 'mountain-2a' : 'mountain-2b', x, y, 2, 2, { type: 'mountain' });
    } else if (k === 'snow' && hash2(x, y, 43) < 0.03 && free(x, y, 1, 1) && !nearStone(x, y)) {
      place(hash2(x, y, 44) < 0.5 ? 'birch' : 'birch-2', x, y);
    }
  }
}
function nearStone(x, y) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (['stone', 'dam', 'wood'].includes(get(x + dx, y + dy))) return true;
  for (const o of objects) if (x >= o.x - 3 && x < o.x + o.w + 3 && y >= o.y - 3 && y < o.y + o.h + 3 && o.name !== 'birch' && o.name !== 'birch-2') return true;
  return false;
}

// Where Signe arrives: the south gate, from the Tithe road.
const spawn = { x: 45, y: 124 };

// --- Places worth finding (drafts, docs/chapter-2-jarnfors.md) ----------------------
const PLACES = [
  ['south-gate', 'The south gate', spawn.x, spawn.y - 2],
  ['dam-crest', "Maren's Dam", 64, CREST.y0 + 1],
  ['dam-statue', 'Saint Maren on the dam', 56, CREST.y0],
  ['gallery', 'The gallery door', 46, CREST.y1 + 5],
  ['hollow-house', 'The Hollow-house', 32, 45],
  ['apprentices-hall', "The apprentices' hall", 48, 47],
  ['inn', 'The inn', 48, 60],
  ['tithe-house', 'The Tithe-house', 90, 45],
  ['mason-yard', "Gudmund's yard", 93, 63],
  ['lower-quarter', 'The lower quarter', 44, 106],
  ['relief-cut', "Halvar's cut", CUT.x, CUT.y0 + 2],
];

// --- Checks: everything is on its ground and within reach -------------------------
const walkable = (x, y) => inMap(x, y) && ['snow', 'stone', 'dam', 'wood', 'ice'].includes(get(x, y)) && !occupied[idx(x, y)];
const problems = [];
for (const o of objects) {
  for (let ty = o.y; ty < o.y + o.h; ty++) {
    for (let tx = o.x; tx < o.x + o.w; tx++) {
      const k = get(tx, ty);
      if (o.type === 'mountain') continue;
      if (o.name === 'gallery-door' ? k !== 'damFace' : ['river', 'water', 'ice', 'damFace', 'mountain'].includes(k) && o.name !== 'relief-plug') problems.push(`${o.name} at ${tx},${ty} stands on ${k}`);
    }
  }
}
// Everything reachable on foot from the gate: each place, and a tile beside each object one looks at or rests by.
const reached = new Uint8Array(SIZE * SIZE);
const queue = [[spawn.x, spawn.y]];
reached[idx(spawn.x, spawn.y)] = 1;
while (queue.length) {
  const [x, y] = queue.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (walkable(nx, ny) && !reached[idx(nx, ny)]) {
      reached[idx(nx, ny)] = 1;
      queue.push([nx, ny]);
    }
  }
}
const besideReached = (o) => {
  for (let ty = o.y - 1; ty <= o.y + o.h; ty++) for (let tx = o.x - 1; tx <= o.x + o.w; tx++) if (inMap(tx, ty) && reached[idx(tx, ty)]) return true;
  return false;
};
for (const [id, , x, y] of PLACES) if (!reached[idx(x, y)] && !besideReached({ x, y, w: 1, h: 1 })) problems.push(`place ${id} at ${x},${y} can't be reached`);
for (const o of objects) if ((o.inspect || o.rest) && !besideReached(o)) problems.push(`${o.name} at ${o.x},${o.y} can't be reached`);
if (!walkable(spawn.x, spawn.y)) problems.push('the spawn is blocked');
if (problems.length > 0) {
  console.error('The Järnfors map has problems:\n  ' + problems.join('\n  '));
  process.exit(1);
}

// --- Output --------------------------------------------------------------------------
const ground = [];
const collision = [];
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const k = get(x, y);
    const alt = hash2(x, y, 99) < 0.2;
    const gid = {
      snow: alt ? GID.snow2 : GID.snow,
      stone: GID.stone,
      dam: GID.dam,
      damFace: GID.damFace,
      mountain: GID.rock,
      ice: alt ? GID.ice2 : GID.ice,
      water: GID.water,
      river: GID.river,
      wood: GID.wood,
    }[k];
    ground.push(gid);
    const blocked = ['damFace', 'mountain', 'water', 'river'].includes(k) || occupied[idx(x, y)];
    collision.push(blocked ? GID.blocked : 0);
  }
}

const tiledObjects = objects.map((o, i) => ({
  id: i + 1,
  name: o.name,
  type: o.type ?? o.name,
  x: o.x * TILE_H,
  y: o.y * TILE_H,
  width: o.w * TILE_H,
  height: o.h * TILE_H,
  rotation: 0,
  visible: true,
  properties: [
    { name: 'sprite', type: 'string', value: o.sprite },
    ...(o.rest ? [{ name: 'rest', type: 'bool', value: true }] : []),
    ...(o.inspect ? [{ name: 'inspect', type: 'string', value: o.inspect }] : []),
  ],
}));

const map = {
  type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'isometric', renderorder: 'right-down',
  infinite: false, width: SIZE, height: SIZE, tilewidth: TILE_W, tileheight: TILE_H,
  nextlayerid: 5, nextobjectid: tiledObjects.length + PLACES.length + 1,
  properties: [
    { name: 'spawnX', type: 'int', value: spawn.x },
    { name: 'spawnY', type: 'int', value: spawn.y },
    { name: 'crestY0', type: 'int', value: CREST.y0 },
    { name: 'crestY1', type: 'int', value: CREST.y1 },
  ],
  tilesets: [{
    firstgid: 1, name: 'tiles', image: '../sprites/tiles.png', imagewidth: TILE_W * 18, imageheight: TILE_H,
    tilewidth: TILE_W, tileheight: TILE_H, tilecount: 18, columns: 18, margin: 0, spacing: 0,
  }],
  layers: [
    { id: 1, name: 'ground', type: 'tilelayer', x: 0, y: 0, width: SIZE, height: SIZE, opacity: 1, visible: true, data: ground },
    { id: 2, name: 'objects', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects: tiledObjects },
    {
      id: 4, name: 'places', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown',
      objects: PLACES.map(([id, label, x, y], i) => ({
        id: tiledObjects.length + 1 + i, name: label, type: 'place', point: true,
        x: x * TILE_H + TILE_H / 2, y: y * TILE_H + TILE_H / 2, width: 0, height: 0, rotation: 0, visible: true,
        properties: [{ name: 'place', type: 'string', value: id }],
      })),
    },
    { id: 3, name: 'collision', type: 'tilelayer', x: 0, y: 0, width: SIZE, height: SIZE, opacity: 1, visible: false, data: collision },
  ],
};

mkdirSync(join(root, 'assets', 'maps'), { recursive: true });
writeFileSync(join(root, 'assets', 'maps', 'jarnfors.json'), JSON.stringify(map));
console.log(`wrote assets/maps/jarnfors.json (${SIZE}x${SIZE}, ${objects.length} objects)`);
