// Builds the game: art -> game/gen/art.js -> bundle -> minify -> pack -> ../dist/index.html.
//
// npm run build   writes dist and checks the size limit
// npm run dev     rebuilds on change and serves on http://localhost:8123, writes nothing to dist

import { mkdirSync, readFileSync, writeFileSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { minify as terser } from 'terser';
import { Packer } from 'roadroller';
import { loadProject, glyph } from 'pxl-pixelart';

const LIMIT = 20000; // bytes in dist
const PORT = 8123;
const SHELL = 'game/index.html';
const VIEWS = ['S', 'SE', 'E', 'NE', 'N'];
const RUNTIME_KEYS = 'keEtrRyw'; // colors used directly by the game
// lower: rows that change between frames. shift: moves S and N left to share rows.
// center: body center per view.
const NO_SHIFT = [0, 0, 0, 0, 0];
const FIGURES = {
  player: { lower: 6, shift: [3, 0, 0, 0, 3], center: [6.5, 6.5, 6.5, 6.5, 6.5] },
  zombie: { lower: 6, shift: NO_SHIFT, center: [9.5, 6.5, 6.5, 6.5, 9.5] },
  tank: { lower: 6, shift: NO_SHIFT, center: [13.5, 13, 13, 13, 13.5] },
  boss: { lower: 3, shift: NO_SHIFT, center: [23.5, 27, 25, 23, 23.5] },
};

// Per-row RLE: "gg" becomes "g2", trailing empty pixels are dropped.
const rle = (r) => r.replace(/\.+$/, '').replace(/(.)\1+/g, (m, c) => c + m.length);
// Row index in base 92, from character 35 up.
const indexChars = (i, digits) => (digits > 1
  ? String.fromCharCode(35 + (i / 92 | 0)) + String.fromCharCode(35 + i % 92)
  : String.fromCharCode(35 + i));
// Own property names shortened in dist. Add new fields here. Never list browser API names.
const MANGLE = /^(zn|bn|pi|dn|time|kills|spawnIn|shake|over|vx|vy|hp|inv|cool|flash|aim|walk|dir|moveX|moveY|aimX|aimY|fire|radius|speed|accel|invuln|hurtKnock|fireRate|damage|bulletSpeed|bulletLife|spread|knock|recoil|mass|unlock|weight|tint|act|ax|ay|solid|outline|flip|scale|fig|drops|hover|attackSpeed|kn|tick|bossAt|bosses|fight|noKnock|orbN|orbIn)$/;

function genArt() {
  const p = loadProject('art/art.px.js');
  const pal = p.pal, rev = pal.reverse(), used = new Set(RUNTIME_KEYS);
  const rowsOf = (img) => {
    const rows = [];
    for (let y = 0; y < img.h; y++) {
      let r = '';
      for (let x = 0; x < img.w; x++) {
        const c = img.data[y * img.w + x];
        if ((c & 255) === 0) { r += '.'; continue; }
        const k = rev.get(c);
        if (!k || /\d/.test(k)) throw new Error(`color ${c.toString(16)} has no palette key`);
        used.add(k);
        r += k;
      }
      rows.push(r);
    }
    return rows;
  };

  // Figures: dictionary of unique rows, then per view the upper body plus three sets of legs.
  const fig = {};
  for (const [name, { lower, shift, center }] of Object.entries(FIGURES)) {
    const dict = new Map(), ids = [];
    let upper = 0;
    VIEWS.forEach((v, n) => {
      const frames = p.frames(`${name}_${v}`).map((f) => rowsOf(f.img).map((r) => r.slice(shift[n])));
      upper = frames[0].length - lower;
      for (let y = 0; y < upper; y++) if (frames.some((f) => f[y] !== frames[0][y])) throw new Error(`${name}_${v} row ${y} changes between frames`);
      for (const r of [...frames[0].slice(0, upper), ...frames.flatMap((f) => f.slice(upper))]) {
        const k = rle(r);
        if (!dict.has(k)) dict.set(k, dict.size);
        ids.push(dict.get(k));
      }
    });
    const digits = dict.size > 92 ? 2 : 1;
    const w = p.frames(`${name}_S`)[0].img.w;
    fig[name] = [w, upper, lower, digits, [...dict.keys()].join(','), ids.map((i) => indexChars(i, digits)).join(''), center];
  }

  const spr = {};
  for (const name of p.exported()) {
    if (p.assets.get(name).kind === 'anim') continue;
    const img = p.image(name), rows = rowsOf(img);
    // Sprites made only of 2x2 blocks are stored at 1x.
    const half = img.w % 2 === 0 && img.h % 2 === 0 && rows.every((r, y) => [...r].every((c, x) => c === rows[y & ~1][x & ~1]));
    spr[name] = half
      ? [img.w / 2, rows.filter((_, y) => y % 2 === 0).map((r) => rle([...r].filter((_, x) => x % 2 === 0).join(''))).join(','), 2]
      : [img.w, rows.map(rle).join(',')];
  }
  // Names looked up as data must never be shortened.
  for (const k of [...Object.keys(fig), ...Object.keys(spr), ...used]) if (MANGLE.test(k)) throw new Error(`"${k}" is both data and in MANGLE`);
  let palette = '';
  for (const k of used) palette += k + (pal.keys.get(k) >>> 8).toString(16).padStart(6, '0');

  // 3x5 font: 15 bits per glyph, only digits, time marks and characters used in the game texts.
  const texts = ['game/main.js', 'game/gfx.js'].map((f) => readFileSync(f, 'utf8').match(/'[A-Z0-9 -]+'/g).join('')).join('');
  const fontChars = [...new Set('0123456789:.' + texts.replace(/[' ]/g, ''))].join('');
  let font = '';
  for (const ch of fontChars) {
    let bits = 0;
    for (const row of glyph(ch)) for (let x = 0; x < 3; x++) bits = bits * 2 + (row[x] === '#' ? 1 : 0);
    font += bits.toString(36).padStart(3, '0');
  }

  mkdirSync('game/gen', { recursive: true });
  writeFileSync('game/gen/art.js', `// Generated by tools/build.mjs. Edit art/art.px.js instead.
export const PALETTE = ${JSON.stringify(palette)};
export const FIG = ${JSON.stringify(fig)};
export const SPR = ${JSON.stringify(spr)};
export const FONT_CHARS = ${JSON.stringify(fontChars)};
export const FONT_DATA = ${JSON.stringify(font)};
`);
}

// Bundles and minifies. The dev build keeps long property names for debugging.
async function bundle(dev) {
  const { outputFiles } = await build({
    entryPoints: ['game/main.js'],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    define: { __DEV__: String(dev) },
    legalComments: 'none',
  });
  const { code } = await terser(outputFiles[0].text, {
    ecma: 2020,
    compress: { passes: 3, toplevel: true, pure_getters: true, unsafe_arrows: true },
    mangle: { toplevel: true, ...(dev ? {} : { properties: { regex: MANGLE } }) },
    format: { comments: false },
  });
  return code.replace(/<\/script/gi, '<\\/script');
}

// Packs with Roadroller: the code becomes a string unpacked when the page opens.
async function pack(js) {
  const packer = new Packer([{ data: js, type: 'js', action: 'eval' }], {});
  await packer.optimize(2);
  const { firstLine, secondLine } = packer.makeDecoder();
  const packed = firstLine + secondLine;
  if (/<\/script/i.test(packed)) throw new Error('packed code contains </script');
  return packed;
}

const page = (js) => readFileSync(SHELL, 'utf8').trim().replace('/*JS*/', () => js);

if (process.argv.includes('--serve')) {
  let html = '';
  const rebuild = async () => {
    try {
      genArt();
      html = page(await bundle(true));
      console.log(`built: ${Buffer.byteLength(html)} bytes (dev, not packed)`);
    } catch (e) {
      console.error(e.message);
    }
  };
  await rebuild();
  let timer;
  for (const dir of ['game', 'art']) {
    watch(dir, { recursive: true }, (_, file) => {
      if (String(file).startsWith('gen')) return;
      clearTimeout(timer);
      timer = setTimeout(rebuild, 50);
    });
  }
  createServer((_, res) => {
    res.setHeader('content-type', 'text/html');
    res.end(html);
  }).on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is in use. Stop the other server first.` : e.message);
    process.exit(1);
  }).listen(PORT, () => console.log(`http://localhost:${PORT}`));
} else {
  genArt();
  const js = await bundle(false);
  const html = page(await pack(js));
  mkdirSync('../dist', { recursive: true });
  writeFileSync('../dist/index.html', html);
  const size = Buffer.byteLength(html);
  console.log(`minified: ${Buffer.byteLength(page(js))} bytes`);
  console.log(`dist/index.html: ${size} bytes (${(size / LIMIT * 100).toFixed(1)} % of ${LIMIT})`);
  if (size > LIMIT) {
    console.error('Over the size limit.');
    process.exit(1);
  }
}
