// Dev tool: regenerate levels/level{1,2,3}.json from inline LEVELS data.
// Run: `node bake_levels.mjs`
//
// Emits Tiled tile objects (not point markers) so the JSON renders sprite
// icons in Tiled. Entities tileset = levels/entities.tsj (external image
// collection). Per-theme GIDs picked from level.theme.
//
// Edit the LEVELS array below, then run. Output overwrites levels/*.json.

import { writeFileSync, mkdirSync, readFileSync } from 'fs';

const WIDTH = 800, HEIGHT = 480, TILE = 32;

const LEVELS = [
  {
    theme: 'bagel',
    name: "Schmear Campaign",
    worldWidth: 3400,
    playerStart: [60, HEIGHT - 100],
    groundGaps: [[380, 460], [720, 800], [1400, 1520], [2350, 2450], [2700, 2820], [3050, 3170]],
    floats: [
      [200, 380, 'platform'], [340, 320, 'platform'], [500, 380, 'platform'],
      [620, 320, 'platform'], [820, 380, 'platform'], [940, 320, 'platform'],
      [1100, 360, 'bigplatform'], [1280, 280, 'platform'], [1400, 220, 'bigplatform'],
      [1600, 280, 'platform'], [1740, 220, 'platform'], [1880, 280, 'bigplatform'],
      [2020, 220, 'platform'], [2160, 280, 'platform'],
      [2280, 320, 'platform'], [2400, 240, 'platform'], [2520, 180, 'platform'],
      [2640, 240, 'platform'], [2780, 180, 'bigplatform'], [2920, 240, 'platform'],
      [3050, 300, 'platform'], [3170, 240, 'platform'], [3290, 180, 'bigplatform']
    ],
    spikes: [400, 440, 740, 780, 1420, 1452, 1484, 1508, 2370, 2400, 2430, 2720, 2752, 2784, 2808, 3070, 3102, 3134, 3158],
    coins: [
      [120, 380], [340, 280], [500, 340], [620, 280], [820, 340], [940, 280], [1020, 380],
      [1100, 320], [1280, 240], [1340, 180], [1600, 240], [1740, 180], [1880, 240], [2020, 180], [2160, 240],
      [2280, 280], [2400, 200], [2520, 140], [2640, 200], [2740, 140], [2920, 200],
      [3050, 260], [3170, 200], [3260, 140], [3360, 380]
    ],
    enemies: [
      { x: 280, y: 400, min: 120, max: 360 },
      { x: 850, y: 400, min: 820, max: 990 },
      { x: 1450, y: 180, min: 1400, max: 1500 },
      { x: 1750, y: 400, min: 1600, max: 1880 },
      { x: 2580, y: 400, min: 2450, max: 2680 },
      { x: 2800, y: 140, min: 2740, max: 2830 },
      { x: 3220, y: 400, min: 3170, max: 3360 }
    ],
    hearts: [[1400, 170], [2780, 140], [3290, 140]],
    checkpoints: [[1020, HEIGHT - 32], [2200, HEIGHT - 32]],
    trees:  [80, 540, 900, 1900, 2700, 3300],
    bushes: [150, 480, 860, 1300, 1700, 2100, 2900, 3360],
    rocks:  [240, 600, 1180, 1620, 2050, 2850, 3220],
    goal: [3380, HEIGHT - 32]
  },
  {
    theme: 'outdoor',
    name: "Sky Climb",
    worldWidth: 2800,
    playerStart: [60, HEIGHT - 100],
    groundGaps: [[400, 560], [900, 1120], [1500, 1700], [2100, 2300]],
    floats: [
      [200, 360, 'platform'], [340, 290, 'platform'], [480, 220, 'platform'],
      [620, 280, 'platform'], [760, 220, 'platform'], [880, 160, 'platform'],
      [1020, 220, 'platform'], [1160, 280, 'bigplatform'],
      [1280, 240, 'platform'], [1420, 180, 'platform'], [1560, 240, 'platform'],
      [1700, 180, 'bigplatform'], [1860, 240, 'platform'], [2000, 180, 'platform'],
      [2150, 300, 'platform'], [2290, 240, 'platform'], [2430, 180, 'bigplatform'],
      [2600, 240, 'platform']
    ],
    spikes: [410, 450, 490, 530, 1510, 1550, 1590, 1630, 1670, 2110, 2150, 2190, 2230, 2270],
    coins: [
      [200, 320], [340, 250], [480, 180],
      [620, 240], [760, 180], [880, 120],
      [1020, 180], [1160, 240],
      [1280, 200], [1420, 140], [1560, 200], [1700, 140],
      [1860, 200], [2000, 140],
      [2150, 260], [2290, 200], [2430, 140], [2600, 200]
    ],
    enemies: [
      { x: 250, y: 400, min: 100, max: 380 },
      { x: 700, y: 200, min: 620, max: 880 },
      { x: 1300, y: 400, min: 1120, max: 1480 },
      { x: 1850, y: 400, min: 1720, max: 2080 },
      { x: 2500, y: 160, min: 2430, max: 2580 }
    ],
    hearts: [[880, 120], [1700, 140], [2430, 140]],
    checkpoints: [[1180, HEIGHT - 32], [1880, HEIGHT - 32]],
    trees: [80, 700, 1300, 1820, 2400, 2700],
    bushes: [150, 660, 1340, 1880, 2360, 2680],
    rocks: [120, 720, 1320, 1860, 2440, 2720],
    goal: [2740, HEIGHT - 32]
  },
  {
    theme: 'outdoor',
    name: "Spike Gauntlet",
    worldWidth: 3600,
    playerStart: [60, HEIGHT - 100],
    groundGaps: [[300, 480], [720, 920], [1240, 1440], [1820, 2020], [2400, 2620], [3000, 3200]],
    floats: [
      [220, 320, 'platform'], [360, 260, 'platform'],
      [520, 320, 'platform'], [640, 260, 'platform'], [780, 320, 'platform'], [880, 260, 'platform'],
      [960, 220, 'platform'], [1100, 280, 'bigplatform'], [1280, 220, 'platform'], [1420, 280, 'platform'],
      [1500, 220, 'platform'], [1620, 260, 'platform'], [1760, 200, 'platform'],
      [1880, 260, 'platform'], [1980, 320, 'platform'],
      [2080, 200, 'platform'], [2220, 260, 'bigplatform'], [2380, 200, 'platform'],
      [2520, 280, 'platform'], [2660, 220, 'platform'], [2800, 280, 'bigplatform'],
      [2940, 220, 'platform'], [3060, 280, 'platform'], [3220, 220, 'platform'],
      [3340, 280, 'platform'], [3460, 220, 'bigplatform']
    ],
    spikes: [
      320, 360, 400, 440,
      740, 780, 820, 860, 900,
      1260, 1300, 1340, 1380, 1420,
      1840, 1880, 1920, 1960, 2000,
      2420, 2460, 2500, 2540, 2580,
      3020, 3060, 3100, 3140, 3180
    ],
    coins: [
      [220, 280], [360, 220],
      [520, 280], [640, 220], [780, 280], [880, 220],
      [960, 180], [1100, 240], [1280, 180], [1420, 240],
      [1620, 220], [1760, 160],
      [2080, 160], [2220, 220], [2380, 160],
      [2660, 180], [2800, 240],
      [2940, 180], [3220, 180], [3460, 180]
    ],
    enemies: [
      { x: 150, y: 400, min: 50, max: 280 },
      { x: 1000, y: 180, min: 940, max: 1120 },
      { x: 1700, y: 400, min: 1620, max: 1800 },
      { x: 2200, y: 220, min: 2080, max: 2380 },
      { x: 2700, y: 400, min: 2620, max: 2780 },
      { x: 3400, y: 180, min: 3340, max: 3480 }
    ],
    hearts: [[1100, 240], [2220, 220], [3460, 180]],
    checkpoints: [[1140, 272], [2260, 252]],
    trees: [80, 600, 1100, 1600, 2200, 2800, 3300],
    bushes: [120, 580, 1050, 1640, 2240, 2820, 3340],
    rocks: [160, 560, 1080, 1620, 2300, 2840, 3380],
    goal: [3520, 212]
  }
];

const mapH = HEIGHT / TILE;
const groundRow = mapH - 1;
const themeGid = { outdoor: 1, bagel: 2 };
const prop = (name, type, value) => ({ name, type, value });

// Entities tileset starts at GID 9 (8 ground slots, GIDs 1-8, reserved).
const ENTITIES_FIRSTGID = 9;
// Tile IDs in entities.tsj (matches order in that file).
const TID = {
  coin: 0, spike_outdoor: 1, spike_bagel: 2, goal: 3, checkpoint: 4,
  enemy_outdoor: 5, enemy_bagel: 6, tree_outdoor: 7, tree_bagel: 8,
  bush_outdoor: 9, bush_bagel: 10, rock_outdoor: 11, rock_bagel: 12,
  platform: 13, bigplatform: 14, counter: 15, counter_big: 16,
  heart: 17, spawn: 18
};
const G = (k) => ENTITIES_FIRSTGID + TID[k];

// Entity native dimensions (pixel), mirrors entities.tsj.
const DIMS = {
  coin: [16, 16], spike: [16, 16], goal: [16, 48], checkpoint: [16, 48],
  enemy: [32, 24], tree: [64, 112], bush: [48, 24], rock: [28, 18],
  platform: [96, 16], bigplatform: [128, 16],
  heart: [64, 64], spawn: [92, 92]
};

function gidFor(theme, type, key) {
  if (type === 'coin') return G('coin');
  if (type === 'spike') return theme === 'bagel' ? G('spike_bagel') : G('spike_outdoor');
  if (type === 'goal') return G('goal');
  if (type === 'checkpoint') return G('checkpoint');
  if (type === 'enemy') return theme === 'bagel' ? G('enemy_bagel') : G('enemy_outdoor');
  if (type === 'tree') return theme === 'bagel' ? G('tree_bagel') : G('tree_outdoor');
  if (type === 'bush') return theme === 'bagel' ? G('bush_bagel') : G('bush_outdoor');
  if (type === 'rock') return theme === 'bagel' ? G('rock_bagel') : G('rock_outdoor');
  if (type === 'heart') return G('heart');
  if (type === 'spawn') return G('spawn');
  if (type === 'platform') {
    if (key === 'bigplatform') return theme === 'bagel' ? G('counter_big') : G('bigplatform');
    return theme === 'bagel' ? G('counter') : G('platform');
  }
  throw new Error('no gid for ' + type + '/' + key);
}

function entitiesTilesetInline() {
  let txt;
  try { txt = readFileSync('levels/entities.tsj', 'utf8'); }
  catch (e) { throw new Error('cannot read levels/entities.tsj — run from repo root: ' + e.message); }
  const tsj = JSON.parse(txt);
  // Drop the keys that only belong to a standalone tileset file (Tiled and
  // Phaser both accept the embedded form below).
  const { type, version, tiledversion, ...rest } = tsj;
  return rest;
}

function buildLevelJSON(level) {
  const mapW = Math.ceil(level.worldWidth / TILE);
  const gid = themeGid[level.theme];
  const holes = level.groundGaps.map(([a, b]) => ({
    left: Math.ceil(a / TILE) * TILE,
    right: Math.ceil(b / TILE) * TILE
  })).filter(h => h.left < h.right);
  const inHole = px => holes.some(h => px >= h.left && px < h.right);

  const data = new Array(mapW * mapH).fill(0);
  for (let tx = 0; tx < mapW; tx++) {
    if (!inHole(tx * TILE)) data[groundRow * mapW + tx] = gid;
  }

  let nextId = 1;
  const objects = [];

  // Center-anchored: object x/y = bottom-left of tile bbox.
  function pushCenter(type, cx, cy, key, properties) {
    const [w, h] = (type === 'platform') ? DIMS[key] : DIMS[type];
    objects.push({
      id: nextId++, gid: gidFor(level.theme, type, key), name: '', type,
      x: cx - w / 2, y: cy + h / 2, width: w, height: h,
      rotation: 0, visible: true,
      ...(properties ? { properties } : {})
    });
  }
  // Bottom-anchored: object x = bottomCenterX - w/2, y = bottomY.
  function pushBottom(type, bcx, by, properties) {
    const [w, h] = DIMS[type];
    objects.push({
      id: nextId++, gid: gidFor(level.theme, type), name: '', type,
      x: bcx - w / 2, y: by, width: w, height: h,
      rotation: 0, visible: true,
      ...(properties ? { properties } : {})
    });
  }

  pushCenter('spawn', level.playerStart[0], level.playerStart[1]);
  pushBottom('goal', level.goal[0], level.goal[1]);
  level.coins.forEach(([x, y]) => pushCenter('coin', x, y));
  // Spikes are auto-filled per ground hole at runtime (see _buildGeometry).
  // Object-layer spikes are intentionally ignored, so we no longer emit them.
  level.enemies.forEach(e => pushCenter('enemy', e.x, e.y, null, [
    prop('min', 'int', e.min),
    prop('max', 'int', e.max)
  ]));
  (level.hearts || []).forEach(([x, y]) => pushCenter('heart', x, y));
  level.checkpoints.forEach(([x, y]) => pushBottom('checkpoint', x, y));
  level.floats.forEach(([x, y, key]) => pushCenter('platform', x, y, key, [prop('key', 'string', key)]));
  (level.trees || []).forEach(x => pushBottom('tree', x, HEIGHT - 32));
  (level.bushes || []).forEach(x => pushBottom('bush', x, HEIGHT - 32));
  (level.rocks || []).forEach(x => pushBottom('rock', x, HEIGHT - 32));

  return {
    compressionlevel: -1,
    width: mapW,
    height: mapH,
    tilewidth: TILE,
    tileheight: TILE,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    nextlayerid: 3,
    nextobjectid: nextId,
    properties: [
      prop('theme', 'string', level.theme),
      prop('name', 'string', level.name)
    ],
    tilesets: [
      {
        firstgid: 1,
        name: 'tileset',
        image: '../tileset.png',
        imagewidth: 256,
        imageheight: 32,
        tilewidth: TILE,
        tileheight: TILE,
        columns: 8,
        tilecount: 8,
        margin: 0,
        spacing: 0,
        tiles: [
          { id: 0, properties: [prop('collides', 'bool', true)] },
          { id: 1, properties: [prop('collides', 'bool', true)] }
        ]
      },
      // Entities tileset inlined: Phaser tilemap loader does not fetch external
      // tileset refs ("External tilesets unsupported"). Tiled still recognizes
      // inline tilesets fine, so visual editing works either way.
      { firstgid: ENTITIES_FIRSTGID, ...entitiesTilesetInline() }
    ],
    layers: [
      {
        id: 1, name: 'ground', type: 'tilelayer',
        width: mapW, height: mapH, x: 0, y: 0,
        opacity: 1, visible: true, data
      },
      {
        id: 2, name: 'objects', type: 'objectgroup',
        x: 0, y: 0, opacity: 1, visible: true,
        draworder: 'topdown', objects
      }
    ]
  };
}

mkdirSync('levels', { recursive: true });
LEVELS.forEach((lvl, i) => {
  const out = `levels/level${i + 1}.json`;
  writeFileSync(out, JSON.stringify(buildLevelJSON(lvl), null, 2));
  console.log('wrote', out);
});
