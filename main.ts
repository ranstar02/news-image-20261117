// news-image-20261117
// Draws one infographic of the world's news of Tuesday 17 November 2026
// and writes it to <MAKEFUN_OUTPUT_DIR>/entry.png (default /output).
// Node 22, standard library only. No network, fully deterministic.
// The bitmap font below and the PNG encoder are written from scratch.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- font ----
// 5x7 bitmap font, defined by hand. Each glyph is 7 rows of 5 columns,
// "#" = ink, "." = empty. Advance is 6 columns (5 + 1 spacing).
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: [".....", ".....", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "10110", "11001", "10001", "10001", "11110"],
  c: [".....", ".....", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01101", "10011", "10001", "10001", "01111"],
  e: [".....", ".....", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: [".....", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "10110", "11001", "10001", "10001", "10001"],
  i: ["00100", ".....", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", ".....", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: [".....", ".....", "11010", "10101", "10101", "10101", "10101"],
  n: [".....", ".....", "10110", "11001", "10001", "10001", "10001"],
  o: [".....", ".....", "01110", "10001", "10001", "10001", "01110"],
  p: [".....", ".....", "10110", "11001", "10001", "11110", "10000"],
  q: [".....", ".....", "01101", "10011", "10001", "01111", "00001"],
  r: [".....", ".....", "10110", "11001", "10000", "10000", "10000"],
  s: [".....", ".....", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11110", "01000", "01000", "01001", "00110"],
  u: [".....", ".....", "10001", "10001", "10001", "10011", "01101"],
  v: [".....", ".....", "10001", "10001", "10001", "01010", "00100"],
  w: [".....", ".....", "10001", "10101", "10101", "10101", "01010"],
  x: [".....", ".....", "10001", "01010", "00100", "01010", "10001"],
  y: [".....", ".....", "10001", "10001", "01111", "00001", "01110"],
  z: [".....", ".....", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": [".....", ".....", ".....", ".....", ".....", "01100", "01100"],
  ",": [".....", ".....", ".....", ".....", "01100", "00100", "01000"],
  ";": [".....", "01100", "01100", ".....", "01100", "00100", "01000"],
  ":": [".....", "01100", "01100", ".....", "01100", "01100", "....."],
  "!": ["00100", "00100", "00100", "00100", "00100", ".....", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", ".....", "00100"],
  "'": ["00100", "00100", "01000", ".....", ".....", ".....", "....."],
  '"': ["01010", "01010", ".....", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", "01110", ".....", ".....", "....."],
  "–": [".....", ".....", ".....", "11111", ".....", ".....", "....."],
  "—": [".....", ".....", ".....", "11111", ".....", ".....", "....."],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "#": ["01010", "01010", "11111", "01010", "01010", "11111", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "+": [".....", "00100", "00100", "11111", "00100", "00100", "....."],
  "*": [".....", "10101", "01110", "11111", "01110", "10101", "....."],
  "=": [".....", ".....", "11111", ".....", "11111", ".....", "....."],
  "·": [".....", ".....", ".....", "01100", "01100", ".....", "....."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

// ------------------------------------------------------------- canvas ------
const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [248, 245, 236];
const NAVY: [number, number, number] = [20, 33, 61];
const INK: [number, number, number] = [20, 33, 61];
const BODY: [number, number, number] = [51, 48, 42];
const WHITE: [number, number, number] = [255, 255, 255];
const GOLD: [number, number, number] = [201, 162, 39];
const KICKER: [number, number, number] = [232, 199, 102];
const SUBLINE: [number, number, number] = [185, 196, 214];
const BORDER: [number, number, number] = [216, 210, 196];
const FOOTER: [number, number, number] = [107, 101, 88];

type RGB = [number, number, number];

const px = new Uint8Array(W * H * 3);

function fill(color: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = color[0];
    px[i * 3 + 1] = color[1];
    px[i * 3 + 2] = color[2];
  }
}

function rect(x: number, y: number, w: number, h: number, color: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
    }
  }
}

function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * 6 * scale - scale;
}

function drawText(x: number, y: number, text: string, scale: number, color: RGB): void {
  let cx = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch] ?? GLYPHS["?"];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if (bits[col] === "1") {
          rect(cx + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawCentered(y: number, text: string, scale: number, color: RGB): void {
  drawText(Math.floor((W - textWidth(text, scale)) / 2), y, text, scale, color);
}

// Greedy word wrap, returns at most maxLines lines.
function wrap(text: string, scale: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur === "" ? word : cur + " " + word;
    if (textWidth(next, scale) <= maxWidth || cur === "") {
      cur = next;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines.slice(0, maxLines);
}

// -------------------------------------------------------------- data -------
interface Story {
  tag: string;
  color: RGB;
  headline: string;
  summary: string;
}

const STORIES: Story[] = [
  { tag: "UKRAINE", color: [29, 78, 216], headline: "Crimea bridge struck again", summary: "Kyiv's strike collapsed part of the Kerch link; Russia hit Kyiv's bridges." },
  { tag: "MIDDLE EAST", color: [234, 88, 12], headline: "Iran drones hit US radar base", summary: "Third strike on US targets in Bahrain in 3 days; tankers mined at Hormuz." },
  { tag: "ASIA", color: [13, 148, 136], headline: "Xi, Trump, Putin meet Thursday", summary: "China confirms first three-way summit, on APEC sidelines in Shenzhen." },
  { tag: "EUROPE", color: [124, 58, 237], headline: "Five nations plan Rwanda hub", summary: "Five EU states to send rejected asylum seekers to a joint hub in Rwanda." },
  { tag: "USA", color: [21, 128, 61], headline: "Pentagon fails audit again", summary: "Ninth straight failure; auditors cannot verify $4.8 trillion in assets." },
  { tag: "ECONOMY", color: [146, 64, 14], headline: "JPMorgan glitch hits US banks", summary: "Outage disrupts online banking and Zelle; Dow drops 845 ahead of Nvidia." },
  { tag: "JAPAN", color: [51, 65, 85], headline: "Japan scrambles jets at Russia", summary: "Two suspected Russian planes entered Japanese airspace; Tokyo protested." },
];

// ------------------------------------------------------------ drawing ------
function drawInfographic(): void {
  fill(PAPER);

  // Header band.
  rect(0, 0, W, 160, NAVY);
  drawCentered(16, "THE WORLD IN ONE IMAGE", 3, KICKER);
  drawCentered(48, "TUESDAY, 17 NOVEMBER 2026", 6, WHITE);
  drawCentered(106, "Seven stories that defined the day", 3, SUBLINE);
  rect(0, 146, W, 3, GOLD);

  // Seven story rows.
  const rowX = 24;
  const rowW = W - 2 * rowX;
  const rowH = 112;
  const gap = 5;
  let y = 170;
  for (const s of STORIES) {
    rect(rowX, y, rowW, rowH, WHITE);
    // Thin border (drawn as four 1px rects).
    rect(rowX, y, rowW, 1, BORDER);
    rect(rowX, y + rowH - 1, rowW, 1, BORDER);
    rect(rowX, y, 1, rowH, BORDER);
    rect(rowX + rowW - 1, y, 1, rowH, BORDER);
    // Accent bar on the left.
    rect(rowX, y, 10, rowH, s.color);
    // Category chip.
    const chipW = textWidth(s.tag, 2) + 18;
    const chipX = rowX + 22;
    const chipY = y + 8;
    rect(chipX, chipY, chipW, 20, s.color);
    drawText(chipX + 9, chipY + 3, s.tag, 2, WHITE);
    // Headline (scale 5) and two-line summary (scale 3).
    drawText(rowX + 22, y + 31, s.headline, 5, INK);
    const lines = wrap(s.summary, 3, rowW - 44, 2);
    drawText(rowX + 22, y + 69, lines[0] ?? "", 3, BODY);
    if (lines[1]) drawText(rowX + 22, y + 90, lines[1], 3, BODY);
    y += rowH + gap;
  }

  // Footer.
  drawCentered(990, "Sources: Al Jazeera · Reuters · AP · Just Security · NYT — 17 Nov 2026", 2, FOOTER);
  drawCentered(1006, "make.fun · news-image-20261117", 2, FOOTER);
}

// Font test sheet: every glyph, so the font can be checked by eye.
function drawFontTest(): void {
  fill(WHITE);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?\"'-–—/()&%$#@+*=·";
  drawText(24, 16, "FONT TEST - 5x7 BITMAP", 4, INK);
  let y = 80;
  let line = "";
  for (const ch of chars) {
    if (textWidth(line + ch, 4) > W - 48) {
      drawText(24, y, line, 4, INK);
      y += 48;
      line = "";
    }
    line += ch;
  }
  if (line !== "") drawText(24, y, line, 4, INK);
  y += 96;
  const pangram = wrap("The quick brown fox jumps over the lazy dog 0123456789", 4, W - 48, 2);
  for (const line of pangram) {
    drawText(24, y, line, 4, INK);
    y += 48;
  }
  drawText(24, y, "TUESDAY, 17 NOVEMBER 2026 - Crimea bridge struck again!", 3, BODY);
}

// -------------------------------------------------------- PNG encoder ------
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let row = 0; row < H; row++) {
    raw[row * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, row * W * 3, W * 3).copy(raw, row * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --------------------------------------------------------------- main ------
function main(): void {
  if (process.env.FONT_TEST === "1") {
    drawFontTest();
  } else {
    drawInfographic();
  }
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), encodePng());
}

main();
