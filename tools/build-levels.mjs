// Converts ASCII level files in tools/levels/*.txt into Tiled JSON maps in
// public/assets/tilemaps/. Run: npm run levels
//
// Legend:
//   #  solid ground (auto-tiled grass/dirt)
//   =  wooden platform (solid)
//   ^  floor spikes        v  ceiling spikes (flipped gid)
//   *  collectible         P  player spawn
//   D  door (exit)         W  floor walker enemy
//   M  ceiling walker      S  saw blade
//   B  bat                 .  empty
//   C  customer            K  karen (coffee thrower)
//   L  lindy (boss)        F  checkpoint flag
//   G  stinky cage         t  palm tree (2x2 deco, brasil)
//   H  sosso's parents (beach finale exit)
//   a/b iron arch halves (2x2 deco, tower)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'tools/levels');
const OUT = join(ROOT, 'public/assets/tilemaps');
// shared with src/scenes/Game.ts and src/scenes/Preload.ts — keep names in one place
const VOCAB = JSON.parse(readFileSync(join(ROOT, 'src/assets/level-vocab.json'), 'utf8'));

const FLIP_V = 0x40000000;

// tilemap_packed.png indices (0-based); Tiled gid = index + 1
const T = {
  grassSingle: 0, grassL: 1, grassM: 2, grassR: 3,
  dirtSingle: 120, dirtL: 121, dirtM: 122, dirtR: 123,
  woodL: 48, woodM: 49, woodR: 50,
  spike: 68,
  doorTop: 130, doorBottom: 150,
  flag: 111,
  tufts: [124, 125, 128, 126], // grass, sprout, mushroom, pine
  cloud: [153, 154, 155],
  // paris theme: limestone (snow-capped) tops, lamp posts, railings
  stoneSingle: 80, stoneL: 81, stoneM: 82, stoneR: 83,
  lampTop: 109, lampPost: 129,
  rail: 105,
};

// levels using the paris tile/deco theme
const PARIS = new Set(['level4', 'level5', 'level6', 'level7', 'level8']);
// levels built from the riveted-iron tileset (second tileset, firstgid 181)
const TOWER = new Set(['level8']);
const IRON = { capSingle: 181, capL: 182, capM: 183, capR: 184, fillSingle: 185, fillL: 186, fillM: 187, fillR: 188, archL: 189, archR: 193 };
// brasil levels (third tileset, firstgid 197). TRAIN: the bottom row is the
// Ubatuba Express itself (roofs + car joints), everything above is concrete
// viaduct. BEACH: plain Ubatuba sand with umbrellas and beach balls.
const TRAIN = new Set(['level9']);
const BEACH = new Set(['level10']);
const BRAZIL = {
  trainL: 197, trainM: 198, trainR: 199, joint: 200,
  capSingle: 201, capL: 202, capM: 203, capR: 204,
  fillSingle: 205, fillL: 206, fillM: 207, fillR: 208,
  palm: 209, vent: 213, bunting: 214, poleTop: 215, poleShaft: 216,
  sandSingle: 217, sandL: 218, sandM: 219, sandR: 220,
  sandFillSingle: 221, sandFillL: 222, sandFillM: 223, sandFillR: 224,
  umbrella: 225, ball: 226,
};

const gid = (index, flipV = false) => (index + 1) | (flipV ? FLIP_V : 0);

// deterministic rng so rebuilds are stable
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(name, text, seed) {
  const paris = PARIS.has(name);
  const tower = TOWER.has(name);
  const train = TRAIN.has(name);
  const beach = BEACH.has(name);
  const rows = text.replace(/\n+$/, '').split('\n');
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? '#' : (rows[y][x] ?? '.'));
  const solid = (x, y) => at(x, y) === '#';

  const ground = new Array(w * h).fill(0);
  const deco = new Array(w * h).fill(0);
  const hazards = new Array(w * h).fill(0);
  const objects = [];
  let oid = 1;
  const px = (x) => x * 18 + 9;
  const py = (y) => y * 18 + 9;
  const obj = (type, x, y, extra = {}) =>
    objects.push({ id: oid++, name: type, type, point: true, x: px(x), y: py(y), rotation: 0, visible: true, ...extra });

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = at(x, y);
      if (c === '#') {
        const top = !solid(x, y - 1);
        const l = solid(x - 1, y);
        const r = solid(x + 1, y);
        const variant = !l && !r ? 0 : !l ? 1 : !r ? 3 : 2;
        if (tower) {
          const ironSet = top
            ? [IRON.capSingle, IRON.capL, IRON.capM, IRON.capR]
            : [IRON.fillSingle, IRON.fillL, IRON.fillM, IRON.fillR];
          ground[i] = ironSet[variant];
        } else if (train) {
          if (y === h - 1) {
            // the train: ribbed roofs with a coupling joint every car length
            ground[i] = x % 11 === 7 ? BRAZIL.joint : BRAZIL.trainM;
          } else {
            const set = top
              ? [BRAZIL.capSingle, BRAZIL.capL, BRAZIL.capM, BRAZIL.capR]
              : [BRAZIL.fillSingle, BRAZIL.fillL, BRAZIL.fillM, BRAZIL.fillR];
            ground[i] = set[variant];
          }
        } else if (beach) {
          const set = top
            ? [BRAZIL.sandSingle, BRAZIL.sandL, BRAZIL.sandM, BRAZIL.sandR]
            : [BRAZIL.sandFillSingle, BRAZIL.sandFillL, BRAZIL.sandFillM, BRAZIL.sandFillR];
          ground[i] = set[variant];
        } else {
          const set = top
            ? (paris
                ? [T.stoneSingle, T.stoneL, T.stoneM, T.stoneR]
                : [T.grassSingle, T.grassL, T.grassM, T.grassR])
            : [T.dirtSingle, T.dirtL, T.dirtM, T.dirtR];
          ground[i] = gid(set[variant]);
        }
      } else if (c === '=') {
        const l = at(x - 1, y) === '=';
        const r = at(x + 1, y) === '=';
        ground[i] = gid(!l ? T.woodL : !r ? T.woodR : T.woodM);
      } else if (c === '^') {
        hazards[i] = gid(T.spike);
      } else if (c === 'v') {
        hazards[i] = gid(T.spike, true);
      } else if (c === 'D') {
        deco[i] = gid(T.doorBottom);
        deco[i - w] = gid(T.doorTop);
        obj(VOCAB.objects.door, x, y);
      } else if (c === 'P') obj(VOCAB.objects.spawn, x, y);
      else if (c === '*') obj(VOCAB.objects.gem, x, y);
      else if (c === 'W') obj(VOCAB.objects.walker, x, y);
      else if (c === 'M') obj(VOCAB.objects.walkerCeiling, x, y);
      else if (c === 'S') obj(VOCAB.objects.saw, x, y);
      else if (c === 'B') obj(VOCAB.objects.bat, x, y);
      else if (c === 'C') obj(VOCAB.objects.customer, x, y);
      else if (c === 'K') obj(VOCAB.objects.karen, x, y);
      else if (c === 'L') obj(VOCAB.objects.lindy, x, y);
      else if (c === 'F') {
        deco[i] = gid(T.flag);
        obj(VOCAB.objects.checkpoint, x, y);
      }
      else if (c === 'G') obj(VOCAB.objects.stinky, x, y);
      else if (c === 'H') obj(VOCAB.objects.parents, x, y);
      else if (c === 'a' || c === 'b') {
        // 2x2 arch, anchor at top-left
        const base = c === 'a' ? IRON.archL : IRON.archR;
        deco[i] = base;
        deco[i + 1] = base + 1;
        deco[i + w] = base + 2;
        deco[i + w + 1] = base + 3;
      }
      else if (c === 't') {
        // 2x2 palm, anchor at top-left
        deco[i] = BRAZIL.palm;
        deco[i + 1] = BRAZIL.palm + 1;
        deco[i + w] = BRAZIL.palm + 2;
        deco[i + w + 1] = BRAZIL.palm + 3;
      }
      else if (c !== '.' && c !== ' ') throw new Error(`${name}: unknown char '${c}' at ${x},${y}`);
    }
  }

  // plants on grass tops, clouds in open sky
  const rng = mulberry32(seed);
  for (let y = 1; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y - 1) * w + x;
      if (solid(x, y) && !solid(x, y - 1) && at(x, y - 1) === '.' && deco[i] === 0 && rng() < 0.18) {
        const roll = rng();
        if (paris) {
          if (roll < 0.35 && y >= 2 && at(x, y - 2) === '.' && deco[i - w] === 0) {
            deco[i] = gid(T.lampPost);
            deco[i - w] = gid(T.lampTop);
          } else if (roll < 0.75) {
            deco[i] = gid(T.rail);
          }
        } else if (train) {
          // AC vents only on the train roof; viaduct tops stay bare
          if (y === h - 1 && roll < 0.5) deco[i] = BRAZIL.vent;
        } else if (beach) {
          if (roll < 0.3) deco[i] = BRAZIL.umbrella;
          else if (roll < 0.45) deco[i] = BRAZIL.ball;
        } else {
          deco[i] = gid(T.tufts[roll < 0.4 ? 0 : roll < 0.7 ? 1 : roll < 0.85 ? 2 : 3]);
        }
      }
      // festa bunting strung under viaduct ceilings
      if (train && solid(x, y - 1) && !solid(x, y) && at(x, y) === '.' && deco[y * w + x] === 0 && rng() < 0.12) {
        deco[y * w + x] = BRAZIL.bunting;
      }
    }
  }
  // catenary masts sweeping past behind the train
  if (train) {
    for (let x = 4; x < w - 2; x += 9) {
      const clear = [h - 7, h - 6, h - 5, h - 4, h - 3, h - 2].every(
        (y) => at(x, y) === '.' && deco[y * w + x] === 0,
      );
      if (!clear) continue;
      deco[(h - 3) * w + x] = BRAZIL.poleTop;
      deco[(h - 2) * w + x] = BRAZIL.poleShaft;
    }
  }
  // no clouds on brasil levels: mid-sky shapes read as platforms in a flip level
  for (let n = 0; n < (train || beach ? 0 : Math.floor(Math.max(w, h) / 6)); n++) {
    const x = 1 + Math.floor(rng() * (w - 5));
    const y = 2 + Math.floor(rng() * (h - 8));
    const clear = [0, 1, 2].every((d) => at(x + d, y) === '.' && deco[y * w + x + d] === 0);
    if (clear) T.cloud.forEach((t, d) => (deco[y * w + x + d] = gid(t)));
  }

  const layer = (id, lname, data) => ({
    data, height: h, width: w, id, name: lname, opacity: 1, type: 'tilelayer', visible: true, x: 0, y: 0,
  });

  const map = {
    compressionlevel: -1, height: h, width: w, infinite: false,
    layers: [
      layer(1, VOCAB.layers.ground, ground),
      layer(2, VOCAB.layers.deco, deco),
      layer(3, VOCAB.layers.hazards, hazards),
      { draworder: 'topdown', id: 4, name: VOCAB.layers.objects, objects, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 },
    ],
    nextlayerid: 5, nextobjectid: oid, orientation: 'orthogonal', renderorder: 'right-down',
    tiledversion: '1.10.2', tileheight: 18, tilewidth: 18, type: 'map', version: '1.10',
    tilesets: [{
      columns: 20, firstgid: 1, image: '../tiles/tiles.png', imageheight: 162, imagewidth: 360,
      margin: 0, name: VOCAB.tileset, spacing: 0, tilecount: 180, tileheight: 18, tilewidth: 18,
    }, {
      columns: 16, firstgid: 181, image: '../tiles/iron.png', imageheight: 18, imagewidth: 288,
      margin: 0, name: 'iron', spacing: 0, tilecount: 16, tileheight: 18, tilewidth: 18,
    }, {
      columns: 30, firstgid: 197, image: '../tiles/brazil.png', imageheight: 18, imagewidth: 540,
      margin: 0, name: 'brazil', spacing: 0, tilecount: 30, tileheight: 18, tilewidth: 18,
    }],
  };

  if (!objects.some((o) => o.type === VOCAB.objects.spawn)) throw new Error(`${name}: no spawn`);
  const hasExit = objects.some(
    (o) =>
      o.type === VOCAB.objects.door ||
      o.type === VOCAB.objects.stinky ||
      o.type === VOCAB.objects.parents,
  );
  if (!hasExit) throw new Error(`${name}: no door, stinky, or parents`);
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(map));
  console.log(`${name}: ${w}x${h}, ${objects.length} objects`);
}

for (const f of readdirSync(SRC).filter((f) => f.endsWith('.txt')).sort()) {
  build(f.replace('.txt', ''), readFileSync(join(SRC, f), 'utf8'), f.charCodeAt(5));
}
