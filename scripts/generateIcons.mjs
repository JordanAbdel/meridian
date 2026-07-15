// Generates the PWA PNG icons with no external dependencies (built-in zlib only).
// Mark: a terracotta "sun" on a cream horizon line over the app's dark background —
// a small nod to a meridian. Run: node scripts/generateIcons.mjs
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../public");

const BG = [26, 24, 20]; // #1a1814
const ACCENT = [217, 119, 87]; // #d97757
const CREAM = [245, 241, 232]; // #f5f1e8

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw[p++] = rgba[i];
      raw[p++] = rgba[i + 1];
      raw[p++] = rgba[i + 2];
      raw[p++] = rgba[i + 3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// Draw the mark. markScale shrinks it for maskable safe-zone.
function draw(size, markScale) {
  const rgba = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const sunR = size * 0.22 * markScale;
  const horizonY = cy + size * 0.02;
  const horizonHalf = size * 0.3 * markScale;
  const horizonThick = Math.max(1, size * 0.018);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let col = BG;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (Math.hypot(dx, dy) <= sunR) col = ACCENT;
      // horizon line
      if (
        Math.abs(y + 0.5 - horizonY) <= horizonThick / 2 &&
        Math.abs(x + 0.5 - cx) <= horizonHalf
      ) {
        col = CREAM;
      }
      const i = (y * size + x) * 4;
      rgba[i] = col[0];
      rgba[i + 1] = col[1];
      rgba[i + 2] = col[2];
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

fs.mkdirSync(path.join(OUT, "icons"), { recursive: true });
fs.writeFileSync(path.join(OUT, "icons/icon-192.png"), draw(192, 1));
fs.writeFileSync(path.join(OUT, "icons/icon-512.png"), draw(512, 1));
fs.writeFileSync(path.join(OUT, "icons/icon-512-maskable.png"), draw(512, 0.7));
fs.writeFileSync(path.join(OUT, "apple-touch-icon.png"), draw(180, 1));

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#1a1814"/>
  <circle cx="16" cy="16" r="7" fill="#d97757"/>
  <rect x="6" y="16.5" width="20" height="1.6" rx="0.8" fill="#f5f1e8"/>
</svg>`;
fs.writeFileSync(path.join(OUT, "favicon.svg"), favicon);

console.log("Icons written to public/");
