// Builds the Lindy boss sheet from CraftPix "Vampire_Girl" (human form) strips
// in tools/lindy-src/ (128x128 frames, mostly padding). Extracts the chosen
// frames, auto-crops to the character's shared bounding box, and lays them out
// as LindyFrames: stride1, stride2, throw, hurt, enraged.
// Run: node tools/sprites/_lindy.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'tools/lindy-src');
const OUT = join(ROOT, 'public/assets/tiles/lindy.png');
const CELL = 128;

function decode(buf) {
    let o = 8, w = 0, h = 0, ct = 6, idat = [];
    while (o < buf.length) {
        const len = buf.readUInt32BE(o);
        const t = buf.toString('ascii', o + 4, o + 8);
        const d = buf.subarray(o + 8, o + 8 + len);
        if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
        else if (t === 'IDAT') idat.push(d);
        else if (t === 'IEND') break;
        o += 12 + len;
    }
    const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : 4;
    const raw = inflateSync(Buffer.concat(idat));
    const st = w * ch, px = Buffer.alloc(h * st);
    let p = 0;
    for (let y = 0; y < h; y++) {
        const f = raw[p++];
        for (let x = 0; x < st; x++) {
            const v = raw[p++];
            const a = x >= ch ? px[y * st + x - ch] : 0;
            const b = y > 0 ? px[(y - 1) * st + x] : 0;
            const c = x >= ch && y > 0 ? px[(y - 1) * st + x - ch] : 0;
            let r;
            switch (f) {
                case 0: r = v; break; case 1: r = v + a; break; case 2: r = v + b; break;
                case 3: r = v + ((a + b) >> 1); break;
                case 4: { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
                default: r = v;
            }
            px[y * st + x] = r & 0xff;
        }
    }
    const rgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        const s = i * ch, d = i * 4;
        if (ch === 4) rgba.set(px.subarray(s, s + 4), d);
        else if (ch === 3) { rgba[d] = px[s]; rgba[d + 1] = px[s + 1]; rgba[d + 2] = px[s + 2]; rgba[d + 3] = 255; }
        else { rgba[d] = rgba[d + 1] = rgba[d + 2] = px[s]; rgba[d + 3] = 255; }
    }
    return { w, h, rgba };
}
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const o = Buffer.alloc(12 + d.length); o.writeUInt32BE(d.length, 0); o.write(t, 4); d.copy(o, 8); o.writeUInt32BE(crc(o.subarray(4, 8 + d.length)), 8 + d.length); return o; };
function encode(w, h, rgba) {
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
    const raw = Buffer.alloc(h * (1 + w * 4));
    for (let y = 0; y < h; y++) { raw[y * (1 + w * 4)] = 0; rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4); }
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// pull frame `idx` (a CELL-wide slice) out of a horizontal strip
function frameFromStrip(strip, idx) {
    const out = Buffer.alloc(CELL * CELL * 4);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const s = (y * strip.w + idx * CELL + x) * 4, d = (y * CELL + x) * 4;
        out.set(strip.rgba.subarray(s, s + 4), d);
    }
    return out;
}
const strips = {};
const load = (n) => (strips[n] ??= decode(readFileSync(join(SRC, `${n}.png`))));
// LindyFrames order: stride1, stride2, throw, hurt, enraged
const picks = [['Run', 1], ['Run', 4], ['Attack_1', 3], ['Hurt', 0], ['Idle', 2]];
const cells = picks.map(([n, i]) => frameFromStrip(load(n), i));

// shared bounding box of non-transparent pixels across all chosen frames
let x0 = CELL, y0 = CELL, x1 = 0, y1 = 0;
for (const c of cells) for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    if (c[(y * CELL + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
const SW = bw * cells.length;
const sheet = Buffer.alloc(SW * bh * 4);
cells.forEach((c, fi) => {
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const s = ((y + y0) * CELL + (x + x0)) * 4, d = (y * SW + fi * bw + x) * 4;
        sheet.set(c.subarray(s, s + 4), d);
    }
});
writeFileSync(OUT, encode(SW, bh, sheet));
console.log(`lindy.png ${SW}x${bh} (${cells.length} frames ${bw}x${bh}, cropped from bbox x[${x0}..${x1}] y[${y0}..${y1}])`);
