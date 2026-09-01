// Generates favicon.ico from icon-192.png.
//
// /favicon.ico was returning the 404 page: the site only declares an SVG icon
// plus apple-touch-icon, which covers modern browsers, but crawlers, feed
// readers and older clients still request /favicon.ico at the domain root
// blindly and got HTML back.
//
// PNG decoding and downscaling are done here rather than through an image
// dependency: the source is a plain 8-bit non-interlaced RGB PNG and 192 is an
// exact multiple of both target sizes, so a box filter is both trivial and
// lossless enough for a 32px icon.
//
// Run: node build-favicon-ico.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const SRC = "icon-192.png";
const OUT = "favicon.ico";
const SIZES = [16, 32, 48];

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${SRC}: not a PNG`);

  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];

  for (let i = 8; i < buf.length; ) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString("ascii", i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      if (bitDepth !== 8) throw new Error(`${SRC}: expected 8-bit, got ${bitDepth}`);
      if (data[12] !== 0) throw new Error(`${SRC}: interlaced PNG not supported`);
      if (colorType === 2) channels = 3;
      else if (colorType === 6) channels = 4;
      else throw new Error(`${SRC}: unsupported color type ${colorType}`);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    i += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  const line = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);
  prev.fill(0);

  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    raw.copy(line, 0, pos, pos + stride);
    pos += stride;

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) {
        throw new Error(`${SRC}: unknown filter ${filter} on row ${y}`);
      }
      line[x] = value & 0xff;
    }

    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      out[d] = line[s];
      out[d + 1] = line[s + 1];
      out[d + 2] = line[s + 2];
      out[d + 3] = channels === 4 ? line[s + 3] : 255;
    }
    line.copy(prev);
  }

  return { width, height, pixels: out };
}

function boxResize(src, size) {
  const factor = src.width / size;
  const out = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(x * factor);
      const y0 = Math.floor(y * factor);
      const x1 = Math.min(src.width, Math.ceil((x + 1) * factor));
      const y1 = Math.min(src.height, Math.ceil((y + 1) * factor));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * src.width + sx) * 4;
          r += src.pixels[i];
          g += src.pixels[i + 1];
          b += src.pixels[i + 2];
          a += src.pixels[i + 3];
          n++;
        }
      }

      const d = (y * size + x) * 4;
      out[d] = Math.round(r / n);
      out[d + 1] = Math.round(g / n);
      out[d + 2] = Math.round(b / n);
      out[d + 3] = Math.round(a / n);
    }
  }
  return out;
}

// A 32-bit ICO frame is a BITMAPINFOHEADER whose height covers the colour rows
// and the legacy AND mask, followed by bottom-up BGRA rows and that mask. The
// mask stays all-zero (fully opaque) because alpha already carries the shape.
function icoFrame(rgba, size) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);

  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = ((size - 1 - y) * size + x) * 4;
      const d = (y * size + x) * 4;
      pixels[d] = rgba[s + 2];
      pixels[d + 1] = rgba[s + 1];
      pixels[d + 2] = rgba[s];
      pixels[d + 3] = rgba[s + 3];
    }
  }

  const maskStride = Math.ceil(size / 32) * 4;
  return Buffer.concat([header, pixels, Buffer.alloc(maskStride * size)]);
}

const source = decodePng(readFileSync(SRC));
const frames = SIZES.map((size) => ({ size, data: icoFrame(boxResize(source, size), size) }));

const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2);
dir.writeUInt16LE(frames.length, 4);

let offset = 6 + frames.length * 16;
const entries = frames.map(({ size, data }) => {
  const e = Buffer.alloc(16);
  e[0] = size === 256 ? 0 : size;
  e[1] = size === 256 ? 0 : size;
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(data.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += data.length;
  return e;
});

writeFileSync(OUT, Buffer.concat([dir, ...entries, ...frames.map((f) => f.data)]));
console.log(`${OUT}: ${SIZES.join(", ")}px from ${SRC} (${offset} bytes)`);
