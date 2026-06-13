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
// Jump-based (no flip). Normal jumps clear the small festa gaps; the awning
// trampoline is the gate — you PUMP it (each bounce climbs higher) to clear a
// wall onto a high terrace, so going up is required, not optional.
{
  const W = 150, H = 15, g = makeGrid(W, H);
  const fillFloor = (x0, x1, top = 12) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = '#'; };
  const awn = (x0, x1, row) => { for (let x = x0; x <= x1; x++) g[row][x] = 'n'; };
  const wall = (x0, x1, top) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = '#'; };
  const put = (x, y, c) => { g[y][x] = c; };

  // opening street — short jumpable gaps, hop the fogueiras
  fillFloor(0, 26);
  put(3, 11, 'P');
  for (const x of [9, 16]) put(x, 11, '*');
  for (const x of [13, 21]) put(x, 11, '^');   // fogueiras
  put(24, 11, 'K');                             // sardinha vendor lobs coffee
  fillFloor(31, 52);                            // gap 27-30 (4 wide) — jump it
  put(33, 11, 'F');
  put(42, 11, '^'); put(46, 11, 'K');
  for (const x of [38, 50]) put(x, 11, '*');

  // --- TRAMPOLINE GATE: pump the awning to climb over the wall ---
  awn(53, 60, 12);                              // bouncy pad at street level
  wall(61, 63, 6);                              // 6-tile wall, top at row 6
  fillFloor(64, 86, 6);                         // high terrace beyond the wall
  for (const [x, r] of [[55, 9], [57, 7], [54, 5]]) put(x, r, '*'); // natas luring you up the bounce
  for (const x of [69, 76, 83]) put(x, 5, '*'); // terrace reward
  put(67, 5, 'F');                              // checkpoint up top

  // descend back to the street (drop off the terrace at col 86)
  fillFloor(88, 120);
  put(98, 11, 'K'); for (const x of [104, 110]) put(x, 11, '^');
  for (const x of [92, 114]) put(x, 11, '*');
  put(116, 11, 'F');
  fillFloor(125, 149);                          // gap 121-124 — jump it
  put(132, 11, 'K'); put(138, 11, '^');
  for (const x of [129, 143]) put(x, 11, '*');
  put(146, 11, 'D');
  emit('level12', g);
}

// ===== LEVEL 13 — Subida ao Miradouro (tram 28) =====
{
  const W = 170, H = 15, g = makeGrid(W, H);
  const fill = (x0, x1, top) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) g[y][x] = '#'; };
  const spikes = (x0, x1, row) => { for (let x = x0; x <= x1; x++) g[row][x] = '^'; };
  const put = (x, y, c) => { g[y][x] = c; };
  // stepped ledges rising toward the miradouro, separated by tram gaps over spike pits
  fill(0, 24, 11);
  fill(44, 66, 11);
  fill(86, 104, 10);
  fill(124, 140, 10);
  fill(150, 169, 7);
  put(143, 9, '='); put(144, 9, '='); put(146, 8, '='); put(147, 8, '=');
  spikes(25, 43, 14); spikes(67, 85, 14); spikes(105, 123, 14);
  put(34, 9, 'T'); put(76, 9, 'T'); put(114, 8, 'T');
  put(4, 10, 'P');
  for (const [x, r] of [[20, 10], [96, 9], [136, 9]]) put(x, r, 'F');
  put(54, 8, 'B'); put(94, 8, 'W'); put(130, 8, 'B');
  for (const [x, r] of [[10, 10], [50, 10], [60, 10], [92, 9], [132, 9], [156, 6], [162, 6]]) put(x, r, '*');
  put(164, 6, 'A'); // Alex waits at the miradouro
  emit('level13', g);
}
