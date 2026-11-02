// Generates assets/maps/test-map.json: a 24 x 24 isometric Tiled map for build step 1.
// The output is a normal Tiled JSON map; open it in Tiled to edit it by hand from here on.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 24;
const HEIGHT = 24;
const TILE_W = 32;
const TILE_H = 16;

// Global tile ids, matching the tile order in generate-placeholders.mjs (firstgid 1).
const GID = { snow: 1, snow2: 2, shore: 3, shore2: 4, ice: 5, ice2: 6, water: 7, blocked: 8 };

const LAKE = { x: 12.5, y: 9.5, rx: 8, ry: 6.5 };
const SHORE_WIDTH = 1.6;

// Footprints in tiles. Every object has free tiles on all four sides so depth
// sorting can be checked from each direction.
const OBJECTS = [
  { name: 'boathouse', x: 9, y: 17, w: 3, h: 2 },
  { name: 'net-rack', x: 14, y: 18, w: 2, h: 1 },
  { name: 'statue', x: 18, y: 15, w: 1, h: 1 },
  { name: 'birch', x: 3, y: 3, w: 1, h: 1 },
  { name: 'birch', x: 5, y: 2, w: 1, h: 1 },
  { name: 'birch', x: 2, y: 6, w: 1, h: 1 },
  { name: 'birch', x: 4, y: 19, w: 1, h: 1 },
  { name: 'birch', x: 6, y: 21, w: 1, h: 1 },
  { name: 'birch', x: 20, y: 20, w: 1, h: 1 },
  // These two wall off the corner tile (23, 23), so it is unreachable.
  { name: 'birch', x: 22, y: 23, w: 1, h: 1 },
  { name: 'birch', x: 23, y: 22, w: 1, h: 1 },
];

// A hole in the ice: open water, blocked.
const OPEN_WATER = [
  [13, 8], [14, 8], [13, 9], [14, 9], [15, 9], [14, 10],
];

function lakeDistance(x, y) {
  const dx = (x + 0.5 - LAKE.x) / LAKE.rx;
  const dy = (y + 0.5 - LAKE.y) / LAKE.ry;
  return Math.sqrt(dx * dx + dy * dy);
}

function variant(x, y) {
  return (x * 7 + y * 13) % 5 === 0;
}

const ground = [];
const collision = [];
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const d = lakeDistance(x, y);
    let gid;
    if (d < 1) gid = variant(x, y) ? GID.ice2 : GID.ice;
    else if (d < 1 + SHORE_WIDTH / Math.min(LAKE.rx, LAKE.ry)) gid = variant(x, y) ? GID.shore2 : GID.shore;
    else gid = variant(x, y) ? GID.snow2 : GID.snow;
    ground.push(gid);
    collision.push(0);
  }
}

for (const [x, y] of OPEN_WATER) {
  ground[y * WIDTH + x] = GID.water;
  collision[y * WIDTH + x] = GID.blocked;
}
for (const o of OBJECTS) {
  for (let y = o.y; y < o.y + o.h; y++) {
    for (let x = o.x; x < o.x + o.w; x++) collision[y * WIDTH + x] = GID.blocked;
  }
}

const tileLayer = (id, name, data, visible = true) => ({
  id, name, type: 'tilelayer', x: 0, y: 0, width: WIDTH, height: HEIGHT,
  opacity: 1, visible, data,
});

// In isometric Tiled maps, object x/y/width/height are measured along the tile
// axes in units of the tile height, so tile (x, y) is at (x * TILE_H, y * TILE_H).
const objects = OBJECTS.map((o, i) => ({
  id: i + 1,
  name: o.name,
  type: o.name,
  x: o.x * TILE_H,
  y: o.y * TILE_H,
  width: o.w * TILE_H,
  height: o.h * TILE_H,
  rotation: 0,
  visible: true,
  properties: [{ name: 'sprite', type: 'string', value: o.name }],
}));

const map = {
  type: 'map',
  version: '1.10',
  tiledversion: '1.11.0',
  orientation: 'isometric',
  renderorder: 'right-down',
  infinite: false,
  width: WIDTH,
  height: HEIGHT,
  tilewidth: TILE_W,
  tileheight: TILE_H,
  nextlayerid: 4,
  nextobjectid: objects.length + 1,
  properties: [
    { name: 'spawnX', type: 'int', value: 12 },
    { name: 'spawnY', type: 'int', value: 21 },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'tiles',
      image: '../sprites/tiles.png',
      imagewidth: TILE_W * 8,
      imageheight: TILE_H,
      tilewidth: TILE_W,
      tileheight: TILE_H,
      tilecount: 8,
      columns: 8,
      margin: 0,
      spacing: 0,
    },
  ],
  layers: [
    tileLayer(1, 'ground', ground),
    { id: 2, name: 'objects', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects },
    tileLayer(3, 'collision', collision, false),
  ],
};

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'maps', 'test-map.json');
writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('wrote assets/maps/test-map.json');
