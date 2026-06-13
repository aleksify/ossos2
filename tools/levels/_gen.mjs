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

  // 1. opening street + a bounce-for-nata to teach the trampoline
  fillFloor(0, 40);
  put(3, 11, 'P');
  awn(14, 17); plat(11, 19, 7); put(15, 6, '*');      // pump the pad up onto the roof
  for (const x of [25, 31]) put(x, 11, '^');          // fogueiras
  put(36, 11, 'K');
  for (const x of [8, 21]) put(x, 11, '*');
  put(39, 11, 'F');

  // 2. ascending barraca roofs (gap 41-44 jump in) — bounce + hop the platforms
  fillFloor(45, 71);
  awn(50, 53); plat(47, 55, 6); put(51, 5, '*');      // big bounce to a high roof
  plat(60, 67, 8); put(64, 7, '*');                   // mid roof to hop to
  put(58, 11, '^'); put(69, 11, 'K');

  // 3. WALL GATE — pump the pad to clear the wall onto the terrace
  awn(72, 79); wall(80, 82, 6); fillFloor(83, 103, 6);
  put(86, 5, 'F'); for (const x of [91, 99]) put(x, 5, '*');

  // 4. descend + a bounce-chain over the street
  fillFloor(105, 135);
  awn(112, 115); plat(117, 124, 7); put(121, 6, '*'); // bounce to a floating nata
  put(128, 11, '^'); put(132, 11, 'K');
  for (const x of [108, 134]) put(x, 11, '*');

  // 5. finale: a big pump to the high exit (ground below = safe retries)
  fillFloor(137, 161);
  awn(141, 145); plat(149, 161, 5); put(155, 4, 'D'); put(152, 4, '*');
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
  put(165, 8, 'A'); // Alex waits at the miradouro
  emit('level13', g);
}
