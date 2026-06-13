// Decode legacy hand-drawn Sosso sheets, recolor the white/cream dress to red,
// re-encode as PNG (reusing the project's zlib-based encoder). Run: node tools/sosso-recolor.mjs [analyze]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- minimal PNG decode (8-bit RGBA, colortype 6) ----
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let off = 8, width = 0, height = 0, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      const bd = data[8], ct = data[9];
      if (bd !== 8 || ct !== 6) throw new Error(`unsupported bitdepth/colortype ${bd}/${ct}`);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const ft = raw[p++];
    for (let x = 0; x < stride; x++) {
      const v = raw[p++];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = (x >= bpp && y > 0) ? out[(y - 1) * stride + x - bpp] : 0;
      let r;
      switch (ft) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + b; break;
        case 3: r = v + ((a + b) >> 1); break;
        case 4: { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
                  const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); r = v + pr; break; }
        default: throw new Error('bad filter ' + ft);
      }
      out[y * stride + x] = r & 0xff;
    }
  }
  return { width, height, data: out };
}

// ---- PNG encode (filter 0 every row) ----
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4); data.copy(out, 8); out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out; }
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) { raw[y * (1 + width * 4)] = 0; rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4); }
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const SRC = process.env.SOSSO_SRC || join(ROOT, 'tools/sosso-src');
const OUT = join(ROOT, 'public/assets/sprites');
const sheets = { run: 'sprites_player_run.png', jump: 'sprites_player_jump.png', punch: 'sprites_player_punch.png', spin: 'sprites_player_spin.png' };
const FW = 92;

// dress is neutral near-white (min channel high, low saturation); skin is warm
// (248,212,175 — fails min>200) so it stays untouched.
function recolorPixel(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
  if (a < 8) return;
  const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
  if (mn > 200 && mx - mn < 30) {
    const L = (r + g + b) / 3; // preserve dress shading as red luminance
    d[i] = Math.min(255, Math.round(70 + (L / 255) * 185));
    d[i + 1] = Math.round((L / 255) * 52);
    d[i + 2] = Math.round((L / 255) * 52);
  }
}

const analyze = process.argv[2] === 'analyze';
mkdirSync(OUT, { recursive: true });
for (const [name, file] of Object.entries(sheets)) {
  const img = decodePng(readFileSync(join(SRC, file)));
  const frames = img.width / FW;
  if (!analyze) {
    for (let i = 0; i < img.data.length; i += 4) recolorPixel(img.data, i);
    writeFileSync(join(OUT, `sosso_${name}.png`), encodePng(img.width, img.height, img.data));
    console.log(`sosso_${name}.png  ${img.width}x${img.height} (${frames}f)`);
    continue;
  }
  if (analyze) {
    // overall non-transparent bbox + color histogram
    let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
    const hist = new Map();
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4, a = img.data[i + 3];
      if (a > 100) {
        const fx = x % FW;
        if (fx < minx) minx = fx; if (fx > maxx) maxx = fx;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
        const key = `${img.data[i]},${img.data[i+1]},${img.data[i+2]}`;
        hist.set(key, (hist.get(key) || 0) + 1);
      }
    }
    const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
    console.log(`\n${name}: ${frames} frames, char bbox x[${minx}..${maxx}] y[${miny}..${maxy}] (w${maxx-minx+1} h${maxy-miny+1})`);
    for (const [c, n] of top) console.log(`   ${c}  x${n}`);
  }
}
