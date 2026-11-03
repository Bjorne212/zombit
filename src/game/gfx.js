// All drawing. Sprites are baked to an atlas at start, with outlines and mirrored views.
// One world unit is SCALE pixels.

import { W, H, SCALE, OFF, GUN_Y, GUN_HAND, MUZZLE, MAX_P, MAX_Z, STATS } from './config.js';
import {
  G, P, input,
  zx, zy, zflash, ztype, zdir,
  bx, by,
  px, py, plife, pcol,
  dx, dy, dcol,
} from './state.js';
import { ZOMBIES } from './zombies.js';
import { PALETTE, FIG, SPR, FONT_CHARS, FONT_DATA } from './gen/art.js';

const RW = W * SCALE, RH = H * SCALE;
const GUN_PIVOT = 3; // pivot in the gun sprite, pixels

// Palette string: key + 6 hex digits per color.
const PAL = {};
for (let i = 0; i < PALETTE.length; i += 7) PAL[PALETTE[i]] = '#' + PALETTE.substr(i + 1, 6);

const PART_COLORS = [PAL.r, PAL.R, PAL.y, PAL.w]; // index = C_* in state.js

// Direction 0-7 (E, SE, S, SW, W, NW, N, NE) to view and mirror. Views: S, SE, E, NE, N.
const VIEW = new Uint8Array([2, 1, 0, 1, 2, 3, 4, 3]);
const FLIP = new Uint8Array([0, 0, 0, 1, 1, 1, 0, 0]);
// Walk cycle: frames 0 and 2 are the same image.
const WALK = new Uint8Array([0, 1, 0, 2]);

let ctx, atlas, atlasCtx, ground, groundCtx, atlasX = 0;
let sPlayer, sPlayerWhite, sGun, sCross, sHeart, sHeartEmpty, sTuft, sPebble;
const sZombie = [], sZombieWhite = [];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// --- Baking ---

// RLE rows: "g2c3" becomes "ggccc".
const unpack = (s) => s.split(',').map((r) => r.replace(/(\D)(\d+)/g, (m, c, n) => c.repeat(n)));

// Paints rows to the atlas. tint swaps keys, solid gives a flat silhouette, outline adds 1 px.
function paintRows(rows, w, x0, y0, o) {
  const h = rows.length, s = o.scale || 1, pad = o.outline ? 1 : 0;
  const at = (x, y) => (rows[y] && rows[y][x]) || '.';
  for (let y = -pad; y < h + pad; y++) for (let x = -pad; x < w + pad; x++) {
    let k = at(x, y);
    if (k === '.') {
      if (!o.outline || (at(x - 1, y) === '.' && at(x + 1, y) === '.' && at(x, y - 1) === '.' && at(x, y + 1) === '.')) continue;
      k = 'k';
    }
    atlasCtx.fillStyle = o.solid || (o.tint && o.tint[k]) || PAL[k];
    atlasCtx.fillRect(x0 + (o.flip ? w - 1 - x : x) * s + pad * s, y0 + (y + pad) * s, s, s);
  }
}

// Plain sprite in its own atlas column. Some are stored at 1x.
function bakeSprite(name, tint) {
  const [w, data, scale = 1] = SPR[name], rows = unpack(data);
  const s = { x: atlasX, y: 0, w: w * scale, h: rows.length * scale };
  paintRows(rows, w, atlasX, 0, { tint, scale });
  atlasX += s.w + 1;
  return s;
}

// Figure: 5 views, 3 frames, each normal and mirrored.
function bakeFigure(name, tint, scale, solid) {
  const [w, upper, dict, index, center] = FIG[name], rows = unpack(dict);
  const cw = (w + 2) * scale, ch = (upper + 8) * scale, n = upper + 18;
  const rowAt = (code) => rows[code - 35];
  const s = { x: atlasX, w: cw, h: ch, ax: [], ay: ch / 2 };
  for (let v = 0; v < 5; v++) {
    s.ax[v] = (center[v] + 1) * scale; // body center in the image
    for (let f = 0; f < 3; f++) {
      const frame = [];
      for (let y = 0; y < upper; y++) frame.push(rowAt(index.charCodeAt(v * n + y)));
      for (let y = 0; y < 6; y++) frame.push(rowAt(index.charCodeAt(v * n + upper + f * 6 + y)));
      for (let m = 0; m < 2; m++) {
        paintRows(frame, w, atlasX + f * cw, (v * 2 + m) * ch, { tint, scale, solid, outline: true, flip: m });
      }
    }
  }
  atlasX += cw * 3 + 1;
  return s;
}

// New random ground each round. Blood is drawn into it during play.
export function resetGround() {
  const g = groundCtx;
  g.fillStyle = PAL.e;
  g.fillRect(0, 0, RW, RH);
  g.fillStyle = PAL.E;
  for (let i = 0; i < 40; i++) {
    g.fillRect(Math.random() * RW | 0, Math.random() * RH | 0, 12 + Math.random() * 56 | 0, 2 + Math.random() * 6 | 0);
  }
  for (let i = 0; i < 70; i++) {
    const s = i % 2 ? sTuft : sPebble;
    g.drawImage(atlas, s.x, s.y, s.w, s.h, Math.random() * RW | 0, Math.random() * RH | 0, s.w, s.h);
  }
}

export function initGfx(canvas) {
  ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  atlas = makeCanvas(1024, 1024);
  atlasCtx = atlas.getContext('2d');
  ground = makeCanvas(RW, RH);
  groundCtx = ground.getContext('2d');

  sPlayer = bakeFigure('player', null, 1);
  sPlayerWhite = bakeFigure('player', null, 1, PAL.w);
  for (let i = 0; i < ZOMBIES.length; i++) {
    const t = ZOMBIES[i];
    sZombie[i] = bakeFigure('zombie', t.tint, t.scale);
    sZombieWhite[i] = bakeFigure('zombie', null, t.scale, PAL.w);
  }
  sGun = bakeSprite('gun');
  sCross = bakeSprite('cross');
  sHeart = bakeSprite('heart');
  sHeartEmpty = bakeSprite('heart', { r: PAL.m, R: PAL.m, w: PAL.m }); // empty heart is a palette swap
  sTuft = bakeSprite('tuft');
  sPebble = bakeSprite('pebble');
  resetGround();
  decodeFont();
}

// Draws a figure with its body center at (x, y), world units.
function drawFigure(s, dir, frame, x, y) {
  const v = VIEW[dir], flip = FLIP[dir], ax = flip ? s.w - s.ax[v] : s.ax[v];
  ctx.drawImage(atlas, s.x + frame * s.w, (v * 2 + flip) * s.h, s.w, s.h,
    (x * SCALE - ax) | 0, (y * SCALE - s.ay) | 0, s.w, s.h);
}

// Draws a sprite centered at (x, y), pixels.
function drawSprite(s, x, y) {
  ctx.drawImage(atlas, s.x, s.y, s.w, s.h, (x - s.w / 2) | 0, (y - s.h / 2) | 0, s.w, s.h);
}

// --- Bitmap font: 3x5, 15 bits per glyph ---

const glyphs = new Uint16Array(128);

function decodeFont() {
  for (let i = 0; i < FONT_CHARS.length; i++) {
    glyphs[FONT_CHARS.charCodeAt(i)] = parseInt(FONT_DATA.substr(i * 3, 3), 36);
  }
}

function glyph(code, x, y, s) {
  const g = glyphs[code];
  for (let b = 0; b < 15; b++) {
    if (g >> (14 - b) & 1) ctx.fillRect(x + (b % 3) * s, y + (b / 3 | 0) * s, s, s);
  }
}

function text(str, x, y, s) {
  for (let i = 0; i < str.length; i++) glyph(str.charCodeAt(i), x + i * 4 * s, y, s);
}

// Centered text with shadow. y and size in world units.
export function textCenter(str, y, size = 1, color = PAL.w) {
  const s = size * SCALE, py2 = y * SCALE, x = (RW - (str.length * 4 - 1) * s) / 2 | 0;
  ctx.fillStyle = PAL.k;
  text(str, x + SCALE, py2 + SCALE, s);
  ctx.fillStyle = color;
  text(str, x, py2, s);
}

// Right-aligned integer, without building a string.
function number(n, right, y) {
  let x = right - 3 * SCALE;
  do {
    glyph(48 + n % 10, x, y, SCALE);
    x -= 4 * SCALE;
    n = n / 10 | 0;
  } while (n > 0);
}

// --- World ---

// Depth sort: one linked list per world row.
const rowHead = new Int16Array(H + OFF * 2), rowNext = new Int16Array(MAX_Z);
const rowOf = (y) => { const r = y + OFF | 0; return r < 0 ? 0 : r >= rowHead.length ? rowHead.length - 1 : r; };

function drawZombie(i) {
  const t = ztype[i], s = zflash[i] > 0 ? sZombieWhite[t] : sZombie[t];
  drawFigure(s, zdir[i], WALK[(G.time * 5 + i * 0.37 | 0) & 3], zx[i], zy[i]);
}

function drawGun() {
  const c = Math.cos(P.aim), s = Math.sin(P.aim), f = c < 0 ? -1 : 1;
  ctx.setTransform(c, s, -s * f, c * f, (P.x + c * GUN_HAND) * SCALE | 0, (P.y + GUN_Y + s * GUN_HAND) * SCALE | 0);
  ctx.drawImage(atlas, sGun.x, sGun.y, sGun.w, sGun.h, -GUN_PIVOT, -GUN_PIVOT, sGun.w, sGun.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawPlayer() {
  if (P.inv > 0 && (G.time * 16 | 0) & 1) return; // blink while immune
  const frame = input.moveX || input.moveY ? WALK[(P.walk * 8 | 0) & 3] : 0;
  const gunBehind = Math.sin(P.aim) < -0.3;
  if (gunBehind) drawGun();
  drawFigure(sPlayer, P.dir, frame, P.x, P.y);
  if (!gunBehind) drawGun();
  if (P.flash > 0) {
    const mx = (P.x + Math.cos(P.aim) * MUZZLE) * SCALE | 0, my = (P.y + GUN_Y + Math.sin(P.aim) * MUZZLE) * SCALE | 0;
    ctx.fillStyle = PAL.y;
    ctx.fillRect(mx - 3, my - 3, 6, 6);
    ctx.fillStyle = PAL.w;
    ctx.fillRect(mx - 1, my - 1, 2, 2);
  }
}

export function drawWorld() {
  // Stains stay in the ground for the round.
  for (let i = 0; i < G.dn; i++) {
    groundCtx.fillStyle = PART_COLORS[dcol[i]];
    groundCtx.fillRect(dx[i] * SCALE | 0, dy[i] * SCALE | 0, SCALE, SCALE);
  }
  G.dn = 0;

  const shake = G.shake > 0 ? 4 : 0;
  ctx.fillStyle = PAL.E;
  ctx.fillRect(0, 0, RW, RH);
  ctx.drawImage(ground, shake && Math.random() * 9 - 4 | 0, shake && Math.random() * 9 - 4 | 0);

  // Back to front, player on its own row.
  rowHead.fill(-1);
  for (let i = 0; i < G.zn; i++) {
    const r = rowOf(zy[i]);
    rowNext[i] = rowHead[r];
    rowHead[r] = i;
  }
  const playerRow = rowOf(P.y);
  for (let r = 0; r < rowHead.length; r++) {
    for (let i = rowHead[r]; i >= 0; i = rowNext[i]) drawZombie(i);
    if (r === playerRow) drawPlayer();
  }

  ctx.fillStyle = PAL.y;
  for (let i = 0; i < G.bn; i++) {
    ctx.fillRect(bx[i] * SCALE - 1 | 0, by[i] * SCALE - 1 | 0, 3, 3);
  }

  let last = -1;
  for (let i = 0; i < MAX_P; i++) {
    if (plife[i] <= 0) continue;
    if (pcol[i] !== last) { last = pcol[i]; ctx.fillStyle = PART_COLORS[last]; }
    ctx.fillRect(px[i] * SCALE | 0, py[i] * SCALE | 0, SCALE, SCALE);
  }
}

export function drawHud() {
  for (let i = 0; i < STATS.hp; i++) {
    drawSprite(i < P.hp ? sHeart : sHeartEmpty, 12 + i * 16, 10);
  }
  ctx.fillStyle = PAL.k;
  number(G.kills, RW - 6, 8);
  ctx.fillStyle = PAL.w;
  number(G.kills, RW - 8, 6);
}

export function dim() {
  ctx.fillStyle = '#0009';
  ctx.fillRect(0, 0, RW, RH);
}

export function drawCross() {
  drawSprite(sCross, input.aimX * SCALE, input.aimY * SCALE);
}
