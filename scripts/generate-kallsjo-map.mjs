// Generates assets/maps/kallsjo.json: the vertical slice's 256 x 256 map of
// Kallsjö, a frozen lake ringed by birch forest and mountains, with Signe's
// village on the near shore. Also writes docs/map-overview.svg.
//
// The layout follows docs/design.md and is a draft (docs/decisions.md). The
// output is a normal Tiled JSON map; once the layout is approved it can be
// hand-edited in Tiled instead of regenerated.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png.mjs';

const SIZE = 256;
const TILE_W = 32;
const TILE_H = 16;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Global tile ids: tileset order in generate-placeholders.mjs, firstgid 1.
const GID = {
  snow: 1, snow2: 2, shore: 3, shore2: 4, ice: 5, ice2: 6, water: 7, blocked: 8,
  road: 9, road2: 10, iceRoad: 11, wood: 12, rock: 13, thinIce: 14,
};

// --- Noise -------------------------------------------------------------------

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

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
function noise(x, y, scale, seed) {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const sx = fx - x0, sy = fy - y0;
  const ease = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return lerp(lerp(a, b, ease(sx)), lerp(c, d, ease(sx)), ease(sy));
}

function fbm(x, y, seed) {
  return (noise(x, y, 40, seed) * 0.6 + noise(x, y, 14, seed + 1) * 0.3 + noise(x, y, 5, seed + 2) * 0.1);
}

// --- Terrain -----------------------------------------------------------------

const random = rng(2026);
const idx = (x, y) => y * SIZE + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;

/** Terrain kind per tile; becomes ground gids and collision at the end. */
const kind = new Array(SIZE * SIZE).fill('snow');
const set = (x, y, k) => inMap(x, y) && (kind[idx(x, y)] = k);
const get = (x, y) => (inMap(x, y) ? kind[idx(x, y)] : 'mountain');

const LAKE = { x: 128, y: 122, r: 68 };
const ISLAND = { x: 108, y: 106, r: 7 };
const MOUNTAIN_R = 122;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const n = fbm(x, y, 11) - 0.5;
    const lake = Math.hypot(x - LAKE.x, y - LAKE.y) / LAKE.r + n * 0.18;
    const island = Math.hypot(x - ISLAND.x, y - ISLAND.y) / ISLAND.r + n * 0.5;
    const edge = Math.hypot(x - 128, y - 128) / MOUNTAIN_R + (fbm(x, y, 23) - 0.5) * 0.3;
    if (lake < 1 && island >= 1) kind[idx(x, y)] = 'ice';
    else if (edge > 1) kind[idx(x, y)] = 'mountain';
  }
}

// Shore: land tiles next to the lake.
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (get(x, y) !== 'snow') continue;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (get(x + dx, y + dy) === 'ice') near = true;
    if (near) kind[idx(x, y)] = 'shore';
  }
}

/** Where the lake ends going from the centre along a line (the first non-ice tile). */
function shoreAlong(dx, dy) {
  let x = LAKE.x, y = LAKE.y;
  while (get(x, y) === 'ice' || get(x, y) === 'water') { x += dx; y += dy; }
  return { x, y };
}

// --- Roads -------------------------------------------------------------------

/** Lays a road along a path of points, `width` tiles wide; clears mountains in the way (a pass). */
function road(points, width, k = 'road') {
  for (let i = 0; i < points.length - 1; i++) {
    let [x, y] = points[i];
    const [tx, ty] = points[i + 1];
    while (x !== tx || y !== ty) {
      // Walk along one axis at a time so the road follows the iso grid.
      if (Math.abs(tx - x) >= Math.abs(ty - y)) x += Math.sign(tx - x);
      else y += Math.sign(ty - y);
      for (let o = -Math.floor(width / 2); o < Math.ceil(width / 2); o++) {
        const horizontal = Math.abs(tx - points[i][0]) >= Math.abs(ty - points[i][1]);
        const rx = horizontal ? x : x + o;
        const ry = horizontal ? y + o : y;
        if (!inMap(rx, ry)) continue;
        const here = get(rx, ry);
        if (k === 'iceRoad' ? here === 'ice' : here !== 'ice' && here !== 'water') set(rx, ry, k);
      }
    }
  }
}

const south = shoreAlong(0, 1); // the village shore
const east = shoreAlong(1, 0); // the hermit's headland
const north = shoreAlong(0, -1); // where the ice road lands

const V = { x: south.x, y: south.y + 6 }; // village centre
// Mountain pass to the south: the way out of the valley.
road([[V.x, V.y], [V.x, SIZE - 1]], 3);
// The ice road: straight across the lake from the village to the far shore, then on through a northern pass.
road([[V.x + 4, south.y - 1], [V.x + 4, north.y + 1]], 3, 'iceRoad');
road([[V.x + 4, north.y], [V.x + 4, 0]], 3);
// The shore track east, around the lake to the hermit's headland.
const arc = [];
for (let a = 0; a <= 1.0001; a += 0.125) {
  const t = (a * Math.PI) / 2;
  arc.push([Math.round(LAKE.x + (LAKE.r + 10) * Math.sin(t)), Math.round(LAKE.y + (LAKE.r + 10) * Math.cos(t))]);
}
road([[V.x, V.y], ...arc, [east.x + 3, east.y]], 2);
// Village street to the shore road.
road([[V.x - 18, V.y], [V.x + 16, V.y]], 2);

// --- Objects -----------------------------------------------------------------

const objects = [];
const occupied = new Uint8Array(SIZE * SIZE);
const free = (x, y, w, h) => {
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
    if (!inMap(tx, ty) || occupied[idx(tx, ty)]) return false;
  }
  return true;
};

function place(name, x, y, w = 1, h = 1, extra = {}) {
  if (!free(x, y, w, h)) throw new Error(`Can't place ${name} at ${x},${y}: occupied`);
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) occupied[idx(tx, ty)] = 1;
  objects.push({ name, sprite: extra.sprite ?? name, x, y, w, h, npc: extra.npc, broken: extra.broken, rest: extra.rest });
}

/** Clears an area of terrain to plain snow (a yard or clearing), keeping roads. */
function clear(x0, y0, x1, y1, k = 'snow') {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const here = get(x, y);
    if (here === 'mountain' || here === 'snow' || here === 'shore') set(x, y, k);
  }
}

// The village, on the near (south) shore. Coordinates are relative to its centre.
const at = (dx, dy) => [V.x + dx, V.y + dy];
const sy = south.y; // first land row
for (let x = V.x - 22; x <= V.x + 22; x++) for (let y = sy; y <= sy + 1; y++) if (get(x, y) === 'snow') set(x, y, 'shore');

// Jetty: wooden planks from the shore out onto the ice.
for (let y = sy - 8; y <= sy; y++) for (const x of [V.x - 4, V.x - 3]) set(x, y, 'wood');

place('house', ...at(-4, 3), 3, 2, { rest: true }); // Signe's home: Torvald, Lilja, Signe. She rests here.
place('house-small', ...at(10, 3), 2, 2); // Old Gerda
place('hut', ...at(-14, 3), 2, 2); // Ebbe
// Ebbe's nets are torn: he has forgotten how to mend them.
place('net-rack', ...[V.x - 15, sy + 1], 2, 1, { broken: true });
place('net-rack', ...[V.x - 11, sy + 2], 2, 1, { broken: true });
place('boathouse', ...[V.x - 9, sy], 3, 2); // the boathouse where the Hollow sits
place('boathouse', ...[V.x + 14, sy], 3, 2);
place('statue', ...[V.x + 8, sy], 1, 1); // Saint Maren on the shore
place('sled', ...at(3, 1), 2, 1); // the Tithe-collector's sled
// By the boathouses: a stove-in boat (too big for Mend at first) and crates to push.
place('boat', ...[V.x - 6, sy], 2, 1, { broken: true });
place('crate', ...[V.x - 5, sy + 2]);
place('crate', ...[V.x - 2, sy + 1]);
place('crate', ...[V.x + 12, sy + 2]);
place('house-small', ...at(-9, 6), 2, 2);
place('house-small', ...at(4, 7), 2, 2);

// Reeds where the shore meets the ice, beside the jetty.
for (const [dx, dy] of [[-7, -1], [-6, -2], [-7, -3], [-1, -1], [-1, -3], [0, -2]]) {
  const x = V.x + dx, y = sy + dy;
  if (get(x, y) === 'ice' && free(x, y, 1, 1)) place('reeds', x, y);
}

// Torvald's fishing hole out on the ice, near the start of the ice road.
const hole = { x: V.x + 1, y: sy - 9 };
set(hole.x, hole.y, 'water');

// The hermit's place: a lone hut on the eastern headland.
const hermitHut = { x: east.x + 5, y: east.y - 3 };
clear(hermitHut.x - 3, hermitHut.y - 3, hermitHut.x + 5, hermitHut.y + 6);
place('hut', hermitHut.x, hermitHut.y, 2, 2);

// Maren's ruined birth village on the island.
for (const [dx, dy] of [[-2, -2], [2, -1], [-1, 2]]) place('ruin', ISLAND.x + dx, ISLAND.y + dy, 2, 2);

// A hole in the ice away from the road.
for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) set(LAKE.x + 30 + dx, LAKE.y - 18 + dy, 'water');

// The ice road is breaking up: a band of cracked ice, three tiles deep, runs right
// across the lake halfway over and cuts the road in two (quest: The ice road).
const BAND = { y0: Math.round((north.y + sy) / 2) - 1, y1: Math.round((north.y + sy) / 2) + 1 };
for (let y = BAND.y0; y <= BAND.y1; y++) {
  for (let x = 0; x < SIZE; x++) if (get(x, y) === 'ice' || get(x, y) === 'iceRoad') set(x, y, 'thinIce');
}
// The hermit remembers one place where the cracked ice is thick enough to walk: east of the road.
const SAFE_ROUTE_X = V.x + 16;

// Ice road markers every 6 tiles along both edges.
for (let y = north.y + 3; y <= sy - 3; y += 6) {
  if (y >= BAND.y0 - 1 && y <= BAND.y1 + 1) continue;
  for (const x of [V.x + 2, V.x + 6]) if (get(x, y) === 'ice' && free(x, y, 1, 1)) place('ice-marker', x, y);
}

// People. Each stands where their dialogue puts them.
const people = [
  ['Torvald', 'torvald', hole.x + 1, hole.y], // fishing at his hole in the ice
  ['Lilja', 'lilja', V.x - 2, sy - 7], // on the ice by the end of the jetty
  ['Ebbe', 'ebbe', V.x - 13, sy + 2], // at his net racks
  ['The Hollow', 'hollow', V.x - 8, sy + 2], // at the boathouse door
  ['Old Gerda', 'gerda', V.x + 9, sy + 2], // by the statue, near her house
  ['Reeve Olle', 'olle', V.x + 3, V.y], // by his sled in the street
  ['The hermit', 'hermit', hermitHut.x - 1, hermitHut.y + 2], // outside his hut
];
for (const [name, npc, x, y] of people) place(name, x, y, 1, 1, { npc, sprite: `npc-${npc}` });

const spawn = { x: V.x - 3, y: V.y + 5 }; // at the door of Signe's home

// Mountains: cover every mountain tile with mountain blocks, biggest first.
for (const size of [8, 4, 2, 1]) {
  for (let y = 0; y < SIZE; y += size) {
    for (let x = 0; x < SIZE; x += size) {
      let all = true;
      for (let ty = y; ty < y + size && all; ty++) for (let tx = x; tx < x + size; tx++) {
        if (get(tx, ty) !== 'mountain' || occupied[idx(tx, ty)]) { all = false; break; }
      }
      if (all) place(`mountain-${size}`, x, y, size, size, { sprite: `mountain-${size}${random() < 0.5 ? 'a' : 'b'}` });
    }
  }
}

// Birch forest: dense between the shore and the mountains, thinning near open ground.
const nearRoad = (x, y, r) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const k = get(x + dx, y + dy);
    if (k === 'road' || k === 'iceRoad' || k === 'wood') return true;
  }
  return false;
};
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (get(x, y) !== 'snow' || occupied[idx(x, y)]) continue;
    if (Math.abs(x - V.x) < 26 && y > sy - 2 && y < V.y + 16) continue; // village clearing
    if (Math.abs(x - hermitHut.x) < 5 && Math.abs(y - hermitHut.y) < 6) continue;
    if (nearRoad(x, y, 1)) continue;
    const density = fbm(x, y, 31);
    const chance = density > 0.55 ? 0.45 : density > 0.45 ? 0.18 : 0.04;
    if (random() < chance) place(random() < 0.3 ? 'birch-2' : 'birch', x, y);
  }
}

// --- Output ------------------------------------------------------------------

const ground = [];
const collision = [];
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const k = get(x, y);
    const alt = hash2(x, y, 99) < 0.2;
    const gid = {
      snow: alt ? GID.snow2 : GID.snow,
      shore: alt ? GID.shore2 : GID.shore,
      ice: alt ? GID.ice2 : GID.ice,
      thinIce: GID.thinIce,
      water: GID.water,
      mountain: GID.rock,
      road: alt ? GID.road2 : GID.road,
      iceRoad: GID.iceRoad,
      wood: GID.wood,
    }[k];
    ground.push(gid);
    collision.push(k === 'water' || k === 'mountain' || occupied[idx(x, y)] ? GID.blocked : 0);
  }
}

const tileLayer = (id, name, data, visible = true) => ({
  id, name, type: 'tilelayer', x: 0, y: 0, width: SIZE, height: SIZE, opacity: 1, visible, data,
});

const tiledObjects = objects.map((o, i) => ({
  id: i + 1,
  name: o.name,
  type: o.npc ? 'npc' : o.name,
  x: o.x * TILE_H,
  y: o.y * TILE_H,
  width: o.w * TILE_H,
  height: o.h * TILE_H,
  rotation: 0,
  visible: true,
  properties: [
    { name: 'sprite', type: 'string', value: o.sprite },
    ...(o.npc ? [{ name: 'npc', type: 'string', value: o.npc }] : []),
    ...(o.broken ? [{ name: 'broken', type: 'bool', value: true }] : []),
    ...(o.rest ? [{ name: 'rest', type: 'bool', value: true }] : []),
  ],
}));

const map = {
  type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'isometric', renderorder: 'right-down',
  infinite: false, width: SIZE, height: SIZE, tilewidth: TILE_W, tileheight: TILE_H,
  nextlayerid: 4, nextobjectid: tiledObjects.length + 1,
  properties: [
    { name: 'spawnX', type: 'int', value: spawn.x },
    { name: 'spawnY', type: 'int', value: spawn.y },
    // The cracked-ice band (rows) and the hermit's safe route through it (one column).
    { name: 'bandY0', type: 'int', value: BAND.y0 },
    { name: 'bandY1', type: 'int', value: BAND.y1 },
    { name: 'safeRouteX', type: 'int', value: SAFE_ROUTE_X },
    // Ice road columns, which the village marks safe once the road is open again.
    { name: 'iceRoadX0', type: 'int', value: V.x + 3 },
    { name: 'iceRoadX1', type: 'int', value: V.x + 5 },
  ],
  tilesets: [{
    firstgid: 1, name: 'tiles', image: '../sprites/tiles.png', imagewidth: TILE_W * 14, imageheight: TILE_H,
    tilewidth: TILE_W, tileheight: TILE_H, tilecount: 14, columns: 14, margin: 0, spacing: 0,
  }],
  layers: [
    tileLayer(1, 'ground', ground),
    { id: 2, name: 'objects', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects: tiledObjects },
    tileLayer(3, 'collision', collision, false),
  ],
};

mkdirSync(join(root, 'assets', 'maps'), { recursive: true });
writeFileSync(join(root, 'assets', 'maps', 'kallsjo.json'), JSON.stringify(map) + '\n');
console.log(`wrote assets/maps/kallsjo.json (${SIZE}x${SIZE}, ${objects.length} objects)`);

// --- Overview ----------------------------------------------------------------

// An isometric overview, 4 x 2 px per tile, with labels, for reviewing the layout.
const PX = 4, PY = 2;
const W = SIZE * 2 * (PX / 2) * 1, H = SIZE * 2 * (PY / 2);
const img = Buffer.alloc(W * H * 4);
const colour = {
  snow: [221, 228, 236], shore: [138, 130, 117], ice: [167, 198, 217], water: [44, 70, 88], mountain: [109, 111, 114],
  road: [184, 170, 140], iceRoad: [214, 226, 234], wood: [122, 92, 68], thinIce: [93, 127, 150],
};
const objColour = (name) =>
  name.startsWith('mountain') ? [150, 152, 156]
    : name.startsWith('birch') ? [74, 92, 64]
      : name === 'reeds' ? [181, 154, 94]
        : name === 'ice-marker' ? [63, 90, 58]
          : [74, 51, 38];
const npcAt = new Set(objects.filter((o) => o.npc).map((o) => idx(o.x, o.y)));
const objAt = new Map();
for (const o of objects) for (let ty = o.y; ty < o.y + o.h; ty++) for (let tx = o.x; tx < o.x + o.w; tx++) objAt.set(idx(tx, ty), o.name);
const toOverview = (x, y) => [(x - y + SIZE) * (PX / 2), (x + y) * (PY / 2)];
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = idx(x, y);
    const c = npcAt.has(i) ? [200, 40, 40] : objAt.has(i) ? objColour(objAt.get(i)) : colour[get(x, y)];
    const [ox, oy] = toOverview(x, y);
    // A 4 x 2 diamond: two pixels on the top row, four on the bottom.
    for (const [dx, dy] of [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1]]) {
      const px = ox + dx, py = oy + dy;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const p = (py * W + px) * 4;
      img[p] = c[0]; img[p + 1] = c[1]; img[p + 2] = c[2]; img[p + 3] = 255;
    }
  }
}
const png = encodePng(W, H, img).toString('base64');
const label = (text, x, y, dy = -6) => {
  const [ox, oy] = toOverview(x, y);
  return `<text x="${ox}" y="${oy + dy}">${text}</text><circle cx="${ox + 2}" cy="${oy + 1}" r="3"/>`;
};
const labels = [
  label('Signe starts here', spawn.x, spawn.y, 14),
  ...people.map(([name, , x, y]) => label(name, x, y)),
  label('The ice road', V.x + 4, Math.round((north.y + south.y) / 2)),
  label('Island: Maren’s ruined village', ISLAND.x, ISLAND.y),
  label('Pass south (way out)', V.x, SIZE - 12),
  label('Pass north', V.x + 4, 8, 14),
  label('Open water', LAKE.x + 31, LAKE.y - 17),
  label('Cracked ice', V.x - 30, BAND.y0),
  label('Birch forest', 60, 175),
  label('Birch forest', 190, 60),
  label('Mountains', 20, 20, 14),
];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<title>Kallsjö slice map, draft layout</title>
<rect width="100%" height="100%" fill="#0b0d10"/>
<image href="data:image/png;base64,${png}" width="${W}" height="${H}" style="image-rendering:pixelated"/>
<g font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="middle">
${labels.join('\n')}
</g>
</svg>
`;
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'map-overview.svg'), svg);
console.log('wrote docs/map-overview.svg');
