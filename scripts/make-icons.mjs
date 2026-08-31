/**
 * Draws the SevenLights mark and writes every app icon from it.
 *
 * The mark is the app's own spine: seven lights on a thread, root at the
 * bottom, crown at the top, each one glowing in its chakra color. Nothing here
 * depends on a native image library — the pixels are computed directly and
 * packed into a PNG with zlib, so `node scripts/make-icons.mjs` is enough.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

/** Root to crown, matching src/data/chakras.ts. */
const LIGHTS = ['#C8402F', '#DD6E2A', '#DFA52C', '#4E9E6A', '#2F86B8', '#5566C4', '#9B6FD1'];
const INK = '#0E0C14';
const INK_2 = '#16131E';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/**
 * Render the mark into an RGBA buffer.
 *
 * `span` is the share of the canvas height the column of lights occupies;
 * Android's adaptive icon needs a smaller one to stay inside the safe circle.
 */
function renderMark({ size, span = 0.72, ground = INK, mono = false, bloom = 1, samples = 3 }) {
  const px = new Float32Array(size * size * 4);
  const cx = size / 2;
  const gap = (span * size) / (LIGHTS.length - 1);
  const top = (size - span * size) / 2;

  // Lights are listed root first, but the column runs crown at the top.
  const dots = LIGHTS.map((c, i) => ({
    x: cx,
    y: top + (LIGHTS.length - 1 - i) * gap,
    rgb: mono ? [255, 255, 255] : hex(c),
  }));

  const core = size * 0.045;
  const halo = size * 0.155;
  const thread = size * 0.0022;
  const threadTop = dots[dots.length - 1].y;
  const threadBottom = dots[0].y;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      if (ground) {
        // A barely-there vertical lift keeps the ground from reading as flat black.
        const t = y / (size - 1);
        const lo = hex(ground);
        const hi = hex(INK_2);
        r = lo[0] + (hi[0] - lo[0]) * t * 0.55;
        g = lo[1] + (hi[1] - lo[1]) * t * 0.55;
        b = lo[2] + (hi[2] - lo[2]) * t * 0.55;
        a = 255;
      }

      // The thread, drawn under the lights.
      if (Math.abs(x + 0.5 - cx) < thread && y + 0.5 > threadTop && y + 0.5 < threadBottom) {
        const w = 0.1;
        r += (255 - r) * w; g += (255 - g) * w; b += (255 - b) * w;
        a = Math.max(a, 255 * w);
      }

      // Halos add like light does: each one lifts whatever is already there.
      for (const dot of dots) {
        const d = Math.hypot(x + 0.5 - dot.x, y + 0.5 - dot.y);
        if (d >= halo) continue;
        const f = 1 - d / halo;
        // A soft square falloff reads as light; anything tighter reads as a dot.
        const w = f * f * (0.5 + 0.5 * f) * 0.5 * bloom;
        r += dot.rgb[0] * w; g += dot.rgb[1] * w; b += dot.rgb[2] * w;
        a = Math.max(a, Math.min(255, 255 * w * 1.9));
      }

      // The core of each light, supersampled so the edge stays smooth.
      for (const dot of dots) {
        if (Math.hypot(x + 0.5 - dot.x, y + 0.5 - dot.y) > core + 2) continue;
        let hits = 0;
        for (let sy = 0; sy < samples; sy++) {
          for (let sx = 0; sx < samples; sx++) {
            const px2 = x + (sx + 0.5) / samples;
            const py2 = y + (sy + 0.5) / samples;
            if (Math.hypot(px2 - dot.x, py2 - dot.y) <= core) hits++;
          }
        }
        if (!hits) continue;
        const cov = hits / (samples * samples);
        // Lights read hotter at the center than their flat color suggests.
        const lit = dot.rgb.map((v) => v + (255 - v) * 0.28);
        r += (lit[0] - r) * cov; g += (lit[1] - g) * cov; b += (lit[2] - b) * cov;
        a = Math.max(a, 255 * cov);
      }

      const o = (y * size + x) * 4;
      px[o] = Math.min(255, r);
      px[o + 1] = Math.min(255, g);
      px[o + 2] = Math.min(255, b);
      px[o + 3] = Math.min(255, a);
    }
  }
  return px;
}

/** A flat ink field, for Android's adaptive icon background layer. */
function renderGround(size) {
  const px = new Float32Array(size * size * 4);
  const lo = hex(INK);
  const hi = hex(INK_2);
  for (let y = 0; y < size; y++) {
    const t = (y / (size - 1)) * 0.55;
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      px[o] = lo[0] + (hi[0] - lo[0]) * t;
      px[o + 1] = lo[1] + (hi[1] - lo[1]) * t;
      px[o + 2] = lo[2] + (hi[2] - lo[2]) * t;
      px[o + 3] = 255;
    }
  }
  return px;
}

/* ---------- PNG packing ---------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function toPng(px, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size * 4; x++) raw[p++] = Math.round(px[y * size * 4 + x]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- the set ---------- */

const out = (name, px, size) => {
  const path = `assets/images/${name}`;
  writeFileSync(path, toPng(px, size));
  console.log(`wrote ${path}`);
};

out('icon.png', renderMark({ size: 1024 }), 1024);
out('favicon.png', renderMark({ size: 64, span: 0.74, samples: 5 }), 64);
out('android-icon-background.png', renderGround(1024), 1024);
out('android-icon-foreground.png', renderMark({ size: 1024, span: 0.5, ground: null }), 1024);
out('android-icon-monochrome.png', renderMark({ size: 1024, span: 0.5, ground: null, mono: true }), 1024);

// The splash mark is the column before it is lit: the in-app splash takes over
// from exactly this frame and brings the lights up one by one, so this one is
// drawn cold — bare dots, no bloom.
const unlit = renderMark({ size: 512, span: 0.74, ground: null, mono: true, bloom: 0, samples: 5 });
for (let i = 0; i < unlit.length; i += 4) unlit[i + 3] *= 0.3;
out('splash-icon.png', unlit, 512);
