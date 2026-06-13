// Builds tools/sprites/lindy.txt — a meaner angry-Karen boss. Reuses the
// original (proven) apron/legs body and swaps in a new severe-bob, angry-brow,
// scowling head. Run: node tools/sprites/_lindy.mjs   then  npm run sprites
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = dirname(fileURLToPath(import.meta.url));

const W = 24, FRAME_H = 32, HEAD_H = 12, BODY_H = 20;
const pad = (s) => { if (s.length > W) throw new Error(`row too wide (${s.length}): ${s}`); return s + '.'.repeat(W - s.length); };
function frame(name, head, body) {
    if (head.length !== HEAD_H) throw new Error(`${name}: head ${head.length} rows`);
    if (body.length !== BODY_H) throw new Error(`${name}: body ${body.length} rows`);
    return `@frame ${name}\n` + [...head, ...body].map(pad).join('\n');
}

// voluminous blonde bob w/ highlight band (Y) + edge shadow (h/H), shaded skin
// (S on the right), thick angry brows (v), narrowed eyes, OPEN shouting mouth
const headAngry = [
    '.....hHhhhhhhHh',
    '...hHyyyyyyyyyyHh',
    '..hyyYYYYYYYYyyyyh',
    '..hyYYYyyyyyyyyyyH',
    '..hyyssssssssssSyH',
    '..hoysssssssssSSyo',
    '...oyvvvsssvvvsSyo',
    '...oyseessseessSyo',
    '...oysssssssssSSyo',
    '...oyssoooooosSSyo',
    '....osslllllsSSo',
    '.......o.ss.o',
];
// flushed crimson face + furious brows, hair flaring
const headRage = [
    '.....hHhhhhhhHh',
    '...hHyyyyyyyyyyHh.rr',
    '..hyyYYYYYYYYyyyyh.r',
    '..hyYYYyyyyyyyyyyH',
    '..hyyrrssssssrrSyH',
    '..hoyrrssssssrrSyo',
    '...oyvvvsssvvvsSyo',
    '...oyrseesssesrSyo',
    '...oyrrsssssssrSyo',
    '...oyssoooooosSSyo',
    '....orsllllllsSro',
    '.......o.ss.o',
];
// dazed: scrunched X eyes, slack mouth
const headHurt = [
    '.....hHhhhhhhHh',
    '...hHyyyyyyyyyyHh',
    '..hyyYYYYYYYYyyyyh',
    '..hyYYYyyyyyyyyyyH',
    '..hyyssssssssssSyH',
    '..hoysssssssssSSyo',
    '...oysvsssssvssSyo',
    '...oysvsssssvssSyo',
    '...oysssssssssSSyo',
    '...oyssoooooosSSyo',
    '....ossssssssSSo',
    '.......o.ss.o',
];
// arm punched up brandishing the rolling pin (right of the head)
const headThrow = headAngry.map((r, i) => {
    const pin = { 4: '...wWWw', 5: '..wWWw', 6: '..ww' };
    return pin[i] ? pad(r).slice(0, 24 - pin[i].length) + pin[i] : r;
});

const bodyWide = [ // stride1 — stance apart
    '........oooooooo',
    '.......otaaaaaato',
    '......sotallaaatos',
    '......sotaaaaaatos',
    '......sotaaaaaatos',
    '......sotaaaaaatos',
    '.......oaaaaaaaao',
    '.......oaAAAAAAao',
    '.......oaaaaaaaao',
    '.......oooooooooo',
    '........ojjjjjjo',
    '.......ojj....jjo',
    '.......ojj....jjo',
    '.......ojj....jjo',
    '.......ojj....jjo',
    '.......ojj....jjo',
    '.......ojj....jjo',
    '.......ojj....jjo',
    '......obbb....bbbo',
    '......oooo....oooo',
];
const bodyNarrow = [ // stride2 / throw / hurt — stance together
    '........oooooooo',
    '.......otaaaaaato',
    '......sotallaaatos',
    '......sotaaaaaatos',
    '......sotaaaaaatos',
    '......sotaaaaaatos',
    '.......oaaaaaaaao',
    '.......oaAAAAAAao',
    '.......oaaaaaaaao',
    '.......oooooooooo',
    '........ojjjjjjo',
    '........ojj..jjo',
    '........ojj..jjo',
    '........ojj..jjo',
    '........ojj..jjo',
    '........ojj..jjo',
    '........ojj..jjo',
    '........ojj..jjo',
    '.......obbb..bbbo',
    '.......oooo..oooo',
];

const palette = [
    '@palette',
    '. _',
    'o #2b2433',
    'y #e3b554',
    'Y #f7da86',
    'h #b8923a',
    'H #8f6f2a',
    's #f4d6c0',
    'S #dcb89c',
    'e #2b2433',
    'l #b14a52',
    'a #f3efe4',
    'A #d8d2c0',
    't #8a3b46',
    'j #3d5575',
    'J #4f6e94',
    'b #3c3744',
    'v #5a3a22',
    'r #d8584f',
    'w #c89b5e',
    'W #e7c58c',
].join('\n');

const out = [
    `@sheet lindy ${W} ${FRAME_H}`,
    palette,
    frame('stride1', headAngry, bodyWide),
    frame('stride2', headAngry, bodyNarrow),
    frame('throw', headThrow, bodyNarrow),
    frame('hurt', headHurt, bodyNarrow),
    frame('enraged', headRage, bodyWide),
].join('\n');
writeFileSync(join(DIR, 'lindy.txt'), out + '\n');
console.log('wrote lindy.txt (5 frames)');
