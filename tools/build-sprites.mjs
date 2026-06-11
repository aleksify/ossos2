// Compiles ASCII pixel-art in tools/sprites/*.txt into PNG spritesheets in
// public/assets/tiles/. Run: npm run sprites
//
// Source format:
//   @sheet sosso 24 24          name, frame width, frame height
//   @palette
//   . _                         '_' = transparent
//   h #5d4037
//   @frame idle
//   <frame-height lines of frame-width chars each>
//   @frame walk1
//   ...
// Frames are packed left-to-right in one row.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'tools/sprites');
const OUT = join(ROOT, 'public/assets/tiles');

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = ~0;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
};

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function build(file) {
  const lines = readFileSync(join(SRC, file), 'utf8').split('\n');
  let name = '';
  let fw = 0;
  let fh = 0;
  const palette = new Map();
  const frames = [];
  let mode = '';
  let current = null;

  for (const line of lines) {
    if (line.startsWith('@sheet')) {
      const [, n, w, h] = line.split(/\s+/);
      name = n;
      fw = Number(w);
      fh = Number(h);
    } else if (line.startsWith('@palette')) {
      mode = 'palette';
    } else if (line.startsWith('@frame')) {
      mode = 'frame';
      current = { name: line.split(/\s+/)[1], rows: [] };
      frames.push(current);
    } else if (mode === 'palette' && line.trim()) {
      const [ch, hex] = line.trim().split(/\s+/);
      palette.set(ch, hex === '_' ? null : hex);
    } else if (mode === 'frame' && line.trim()) {
      current.rows.push(line);
    }
  }

  for (const f of frames) {
    if (f.rows.length !== fh) throw new Error(`${name}/${f.name}: ${f.rows.length} rows, want ${fh}`);
    for (const r of f.rows) {
      if (r.length !== fw) throw new Error(`${name}/${f.name}: row width ${r.length}, want ${fw}`);
    }
  }

  const width = fw * frames.length;
  const rgba = Buffer.alloc(width * fh * 4);
  frames.forEach((f, fi) => {
    f.rows.forEach((row, y) => {
      for (let x = 0; x < fw; x++) {
        const hex = palette.get(row[x]);
        if (hex === undefined) throw new Error(`${name}/${f.name}: unknown pixel '${row[x]}' at ${x},${y}`);
        if (hex === null) continue;
        const i = (y * width + fi * fw + x) * 4;
        rgba[i] = parseInt(hex.slice(1, 3), 16);
        rgba[i + 1] = parseInt(hex.slice(3, 5), 16);
        rgba[i + 2] = parseInt(hex.slice(5, 7), 16);
        rgba[i + 3] = 255;
      }
    });
  });

  writeFileSync(join(OUT, `${name}.png`), encodePng(width, fh, rgba));
  console.log(`${name}.png: ${frames.length} frames ${fw}x${fh} (${frames.map((f) => f.name).join(', ')})`);
}

for (const f of readdirSync(SRC).filter((f) => f.endsWith('.txt')).sort()) build(f);
