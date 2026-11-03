// Entry point: game modes, high score, main loop.

import { STEP } from './config.js';
import { G } from './state.js';
import { reset, update, spawnZombie } from './sim.js';
import { initGfx, resetGround, drawWorld, drawHud, drawCross, dim, textCenter } from './gfx.js';
import { initInput, releaseAll } from './input.js';
import { initAudio, sfxOver } from './audio.js';

const TITLE = 0, PLAY = 1, PAUSED = 2, DEAD = 3;
const RETRY_DELAY = 700; // ms, so a held click does not restart at once
const KEY = 'zombit.best';

let mode = TITLE, best = 0, last = 0, acc = 0, deadAt = 0;
let killsLine = '', bestLine = '';

// localStorage may be blocked.
function loadBest() {
  try { best = +localStorage.getItem(KEY) || 0; } catch {}
}
function saveBest() {
  try { localStorage.setItem(KEY, best); } catch {}
}

function start() {
  reset();
  resetGround();
  acc = 0;
  mode = PLAY;
}

function onPress() {
  initAudio();
  if (mode === TITLE) start();
  else if (mode === PAUSED) mode = PLAY;
  else if (mode === DEAD && last - deadAt > RETRY_DELAY) start();
}

function die() {
  mode = DEAD;
  deadAt = last;
  const record = G.kills > best;
  if (record) { best = G.kills; saveBest(); }
  killsLine = 'KILLS ' + G.kills;
  bestLine = record ? 'NEW BEST' : 'BEST ' + best;
  sfxOver();
}

function frame(now) {
  requestAnimationFrame(frame);
  // Capped so a stall does not queue many steps.
  const dt = Math.min(now - last, 100) / 1000;
  last = now;

  if (mode === PLAY) {
    acc += dt;
    while (acc >= STEP && mode === PLAY) {
      update();
      acc -= STEP;
      if (G.over) die();
    }
  }

  drawWorld();
  if (mode !== TITLE) drawHud();
  if (mode === TITLE) {
    dim();
    textCenter('ZOMBIT', 44, 4);
    textCenter('WASD MOVE - MOUSE AIM - HOLD TO FIRE', 92);
    textCenter('CLICK TO START', 112, 1, '#ffd75e');
    if (best) textCenter('BEST ' + best, 128);
  } else if (mode === PAUSED) {
    dim();
    textCenter('PAUSED', 70, 2);
    textCenter('CLICK TO RESUME', 92, 1, '#ffd75e');
  } else if (mode === DEAD) {
    dim();
    textCenter('YOU DIED', 54, 3, '#d8343f');
    textCenter(killsLine, 88, 2);
    textCenter(bestLine, 106);
    textCenter('CLICK TO RETRY', 124, 1, '#ffd75e');
  }
  drawCross();
}

const canvas = window.c; // <canvas id=c> in index.html
loadBest();
reset();
initGfx(canvas);
initInput(canvas, onPress);
addEventListener('blur', () => {
  releaseAll();
  if (mode === PLAY) mode = PAUSED;
});
requestAnimationFrame(frame);

// Debug hook, dev build only.
if (__DEV__) window.Z = { G, spawnZombie };
