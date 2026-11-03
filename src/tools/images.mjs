// Renders the game art to ../images/characters.png. Run with: npm run images

import { mkdirSync } from 'node:fs';
import { Img, loadProject, writePng } from 'pxl-pixelart';

const OUT = '../images';
const ZOOM = 3;
const OUTLINE = 0x1a1c2cff >>> 0;
const GROUND = 0x3f3d36ff >>> 0;
const DIRS = [['S', 0], ['SE', 0], ['E', 0], ['NE', 0], ['N', 0], ['NE', 1], ['E', 1], ['SE', 1]];
const FIGURES = ['player', 'zombie', 'tank', 'boss'];

// Copies an image with a 1 px outline, optionally mirrored.
function blit(dst, src, dx, dy, flip) {
  const at = (x, y) => (x < 0 || y < 0 || x >= src.w || y >= src.h ? 0 : src.data[y * src.w + x]);
  for (let y = -1; y <= src.h; y++) for (let x = -1; x <= src.w; x++) {
    let c = at(x, y);
    if (!(c & 255)) {
      if (!((at(x - 1, y) | at(x + 1, y) | at(x, y - 1) | at(x, y + 1)) & 255)) continue;
      c = OUTLINE;
    }
    dst.data[(dy + y + 1) * dst.w + dx + (flip ? src.w - 1 - x : x) + 1] = c;
  }
}

const p = loadProject('art/art.px.js');
const sizes = FIGURES.map((n) => p.frames(`${n}_S`)[0].img);
const width = Math.max(...sizes.map((s) => (s.w + 4) * DIRS.length)) + 24;
const height = sizes.reduce((a, s) => a + s.h + 4, 4);
const img = new Img(width, height);
img.data.fill(GROUND);

let y = 2;
FIGURES.forEach((name, n) => {
  DIRS.forEach(([v, flip], d) => blit(img, p.frames(`${name}_${v}`)[0].img, 2 + d * (sizes[n].w + 4), y, flip));
  y += sizes[n].h + 4;
});
['pick_dmg', 'pick_spd', 'pick_hp'].forEach((name, i) => blit(img, p.image(name), width - 20, 2 + i * 20));

const zoomed = (src, s) => {
  const o = new Img(src.w * s, src.h * s);
  for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) o.data[j * o.w + i] = src.data[(j / s | 0) * src.w + (i / s | 0)];
  return o;
};
mkdirSync(OUT, { recursive: true });
writePng(`${OUT}/characters.png`, zoomed(img, ZOOM));

// The favicon: same crop as setFavicon in game/gfx.js.
const figure = new Img(22, 27), icon = new Img(16, 16);
blit(figure, p.frames('zombie_S')[0].img, 0, 0, 0);
for (let j = 0; j < 11; j++) for (let i = 0; i < 14; i++) icon.data[(j + 2) * 16 + i + 1] = figure.data[(j + 1) * 22 + i + 4];
for (const i of [1, 2, 13, 14]) icon.data[12 * 16 + i] = 0;
for (let i = 3; i < 13; i++) icon.data[13 * 16 + i] = OUTLINE;
writePng(`${OUT}/favicon.png`, zoomed(icon, 8));
console.log(`images written to ${OUT}`);
