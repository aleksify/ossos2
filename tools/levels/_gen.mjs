// Generator for the Lisbon arc levels (11-13). Run: node tools/levels/_gen.mjs
// Kept in-tree so the ASCII can be regenerated/tuned deterministically.
import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = dirname(fileURLToPath(import.meta.url));

const makeGrid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
function emit(name, g) {
  const lines = g.map(r => r.join('').replace(/\s+$/, ''));
  writeFileSync(`${DIR}/${name}.txt`, lines.join('\n') + '\n');
  console.log(`${name}: ${g[0].length}x${g.length}`);
}

// ===== LEVEL 11 — Telhados de Alfama (clothesline swing) =====
{
  const W = 190, H = 15, g = makeGrid(W, H);
  const fill = (x0, x1, top) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = '#'; };
  const put = (x, y, c) => { g[y][x] = c; };
  // buildings (x0,x1,topRow); the gaps between them are death pits crossed by swinging
  const B = [[0, 30, 9], [34, 60, 9], [67, 93, 9], [100, 128, 9], [137, 189, 9]];
  for (const [a, b, t] of B) fill(a, b, t);
  // clothesline poles at the gap edges (anchor row 5); progression 3,6,6,8 tiles
  for (const x of [31, 61, 66, 94, 99, 129, 135]) put(x, 5, 'Y');
  put(4, 8, 'P');
  for (const x of [28, 90, 126]) put(x, 8, 'F');
  // pigeons on later roofs only (building 1 stays a clean tutorial)
  for (const [x, r] of [[80, 8], [150, 8], [172, 8]]) put(x, r, 'W');
  // gaivotas hovering over the roofs (kept clear of the swing poles)
  for (const [x, r] of [[78, 6], [115, 5], [156, 5]]) put(x, r, 'B');
  // natas, including a couple mid-gap rewards at the swing apex
  for (const [x, r] of [[10, 7], [22, 7], [48, 7], [64, 3], [80, 7], [115, 7], [132, 3], [160, 7], [176, 7], [182, 7]]) put(x, r, '*');
  // a couple of roof spikes to dodge (flip flavour)
  put(115, 8, '^'); put(168, 8, '^');
  put(184, 8, 'D');
  emit('level11', g);
}

// ===== LEVEL 12 — Santos Populares (awning trampolines) =====
// Jump-based (no flip). A proper trampoline playground: several awning pads,
// floating barraca-roof platforms to bounce up onto for natas, a pump-the-
// awning wall gate, and a final big-bounce climb to a high exit.
{
  const W = 162, H = 15, g = makeGrid(W, H);
  const fillFloor = (x0, x1, top = 12) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = '#'; };
  const awn = (x0, x1, row = 12) => { for (let x = x0; x <= x1; x++) g[row][x] = 'n'; };
  const wall = (x0, x1, top) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = '#'; };
  const plat = (x0, x1, row) => { for (let x = x0; x <= x1; x++) g[row][x] = '#'; }; // thin floating platform
  const put = (x, y, c) => { g[y][x] = c; };

  // Every pad has OPEN SKY above it; the target it flings you to is higher AND
  // offset to the side (or over a wall) — never capped by a platform.

  // 1. opening street (jump the 4-tile gap at 31-34)
  fillFloor(0, 30);
  put(3, 11, 'P');
  for (const x of [13, 22]) put(x, 11, '^');          // fogueiras
  put(26, 11, 'K');
  for (const x of [8, 18]) put(x, 11, '*');
  put(28, 11, 'F');

  // 2. pad flings you up-and-RIGHT onto a high barraca roof (open sky over pad)
  fillFloor(35, 63);
  awn(38, 41);
  plat(45, 53, 6); put(49, 5, '*');                   // roof sits just to the right of the pad
  put(45, 11, '^'); put(58, 11, 'K');
  for (const x of [36, 61]) put(x, 11, '*');

  // 3. WALL GATE — pad beside a wall, bounce up the open side and over to terrace
  awn(64, 71); wall(72, 74, 6); fillFloor(75, 96, 6);
  put(78, 5, 'F'); for (const x of [83, 92]) put(x, 5, '*');

  // 4. drop to the street and run it
  fillFloor(98, 159);
  put(107, 11, '^'); put(113, 11, 'K'); put(140, 11, '^');
  for (const x of [101, 124, 134] ) put(x, 11, '*');
  put(126, 11, 'F');

  // 5. finale — pad lobs you up to the high exit ledge offset to the right
  //    (the street stays under it, so a missed bounce is a safe retry)
  awn(145, 148); plat(152, 159, 5); put(156, 4, 'D'); put(150, 6, '*');
  emit('level12', g);
}

// ===== LEVEL 13 — Subida ao Miradouro (tram 28) =====
// Rising ledges split by spike pits crossed on the tram. Pits are ~12 wide so
// the tram (travels ~9 tiles) reaches within a jump of each ledge.
{
  const W = 170, H = 15, g = makeGrid(W, H);
  const fill = (x0, x1, top) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = '#'; };
  const spikes = (x0, x1, row) => { for (let x = x0; x <= x1; x++) g[row][x] = '^'; };
  const put = (x, y, c) => { g[y][x] = c; };
  fill(0, 24, 11);     // ledge 1
  fill(37, 58, 11);    // ledge 2   (pit 25-36)
  fill(71, 92, 10);    // ledge 3   (pit 59-70), one step up
  fill(105, 128, 9);   // ledge 4   (pit 93-104), one step up
  fill(141, 169, 9);   // miradouro (gap 129-140 crossed by stepping platforms)
  spikes(25, 36, 14); spikes(59, 70, 14); spikes(93, 104, 14); spikes(129, 140, 14);
  // trams centred in each pit, ~1 row below the lower ledge so boarding is a short hop
  put(30, 10, 'T'); put(64, 10, 'T'); put(98, 9, 'T');
  // final gap: three 2-tile stepping platforms (jump between, spikes below)
  for (const x of [131, 132, 135, 136, 139, 140]) put(x, 9, '=');
  put(4, 10, 'P');
  for (const [x, r] of [[20, 10], [84, 9], [120, 8]]) put(x, r, 'F');
  put(48, 10, 'B'); put(82, 9, 'W'); put(118, 8, 'B'); // gaivotas + a pigeon
  for (const [x, r] of [[12, 10], [50, 10], [80, 9], [112, 8], [150, 8], [160, 8]]) put(x, r, '*');
  put(165, 8, 'D'); // miradouro tram stop — Alex moved on to the recital (level 14)
  emit('level13', g);
}

// ===== LEVEL 14 — Concerto no Municipal (rhythm beat platforms) =====
// Sosso's cello recital at the Teatro Municipal de São Paulo. The orchestra
// pit is crossed on beat blocks that pulse in and out of solidity: gold
// (phase A, char '1') and blue (phase B, char '2') take turns, overlapping
// briefly so a well-timed hop always finds footing. Jump-based (forceJump).
// Alex flew in and waits on centre stage to hear her play — reaching him ends
// the journey.
{
  const W = 168, H = 15, g = makeGrid(W, H);
  const fill = (x0, x1, top = 12) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = '#'; };
  const plat = (x0, x1, row) => { for (let x = x0; x <= x1; x++) g[row][x] = '#'; };
  const spikes = (x0, x1, row = 14) => { for (let x = x0; x <= x1; x++) g[row][x] = '^'; };
  // a beat platform is a wide run of same-phase blocks (gold '1' / blue '2') so
  // there is a generous landing area; the whole run toggles together on the beat
  const beat = (x0, ch, row = 11, w = 3) => { for (let i = 0; i < w; i++) g[row][x0 + i] = ch; };
  const put = (x, y, c) => { g[y][x] = c; };

  // 1. opening stage — a single 3-wide gold platform to learn the timing
  fill(0, 28);
  put(3, 11, 'P');
  for (const x of [9, 16, 23]) put(x, 10, '*');
  put(25, 11, 'C');
  spikes(29, 35);
  beat(31, '1');                                    // gold, 3-wide, centred in the pit
  fill(36, 56);
  for (const x of [44, 50]) put(x, 10, '*');
  put(48, 11, 'C');
  put(38, 11, 'F');

  // 2. orchestra pit — wide platforms alternating gold/blue, 2-tile gaps
  spikes(57, 88);
  beat(59, '1'); beat(64, '2'); beat(69, '1'); beat(74, '2'); beat(79, '1'); beat(84, '2');
  for (const x of [66, 76]) put(x, 7, '*');         // rewards floating over the pit
  fill(89, 108);
  for (const x of [98, 104]) put(x, 10, '*');
  put(101, 11, 'C');
  put(94, 11, 'F');

  // 3. rising beat-staircase up to a balcony of notes, then down to the floor
  spikes(109, 132);
  beat(111, '1', 10); beat(116, '2', 9); beat(121, '1', 8); beat(126, '2', 7);
  fill(133, 150);
  plat(133, 150, 6);                                // balcony ledge above the floor
  for (const x of [138, 144, 148]) put(x, 5, '*');
  put(142, 5, 'C');
  put(147, 11, 'K');                                // a critic heckling from the stalls
  put(136, 11, 'F');

  // 4. finale crossing to centre stage where Alex waits
  spikes(151, 162);
  beat(153, '1'); beat(158, '2');
  fill(163, 167);
  put(165, 11, 'A');                                // Alex — reaching him ends the recital
  emit('level14', g);
}
