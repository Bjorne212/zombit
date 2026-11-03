// Entry point: game modes, high score, main loop.

import { STEP, STATS } from './config.js';
import { G, P, kx, ky, input } from './state.js';
import { reset, update, spawnZombie } from './sim.js';
import { initGfx, resetGround, drawWorld, drawHud, drawCross, drawMute, dim, textCenter, clock } from './gfx.js';
import { initInput, releaseAll } from './input.js';
import { initAudio, sfxOver, toggleMute } from './audio.js';

const TITLE = 0, PLAY = 1, PAUSED = 2, DEAD = 3;
const RETRY_DELAY = 700; // ms, so a held click does not restart at once
const KEY = 'zombit.time';

let mode = TITLE, best = 0, last = 0, acc = 0, deadAt = 0;
let timeLine = '', bestLine = '', muted = false;

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

function onMute() {
  muted = toggleMute();
}

// Esc pauses and resumes. A click also resumes.
function onPause() {
  if (mode === PLAY) { mode = PAUSED; releaseAll(); }
  else if (mode === PAUSED) mode = PLAY;
}

function onPress() {
  initAudio();
  // A click on the sound label only toggles the sound.
  if (input.aimX < 30 && input.aimY > 8 && input.aimY < 17) {
    input.fire = false;
    onMute();
    return;
  }
  if (mode === TITLE) start();
  else if (mode === PAUSED) mode = PLAY;
  else if (mode === DEAD && last - deadAt > RETRY_DELAY) start();
}

function die() {
  mode = DEAD;
  deadAt = last;
  const record = G.time > best;
  if (record) { best = G.time; saveBest(); }
  timeLine = 'TIME ' + clock(G.time);
  bestLine = record ? 'NEW BEST' : 'BEST ' + clock(best);
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
    if (best) textCenter('BEST ' + clock(best), 128);
  } else if (mode === PAUSED) {
    dim();
    textCenter('PAUSED', 70, 2);
    textCenter('CLICK TO RESUME', 92, 1, '#ffd75e');
  } else if (mode === DEAD) {
    dim();
    textCenter('YOU DIED', 54, 3, '#d8343f');
    textCenter(timeLine, 88, 2);
    textCenter(bestLine, 106);
    textCenter('CLICK TO RETRY', 124, 1, '#ffd75e');
  }
  drawMute(muted);
  drawCross();
}

const canvas = window.c; // <canvas id=c> in index.html
loadBest();
reset();
initGfx(canvas);
initInput(canvas, onPress, onMute, onPause);
addEventListener('blur', () => {
  releaseAll();
  if (mode === PLAY) mode = PAUSED;
});
requestAnimationFrame(frame);

// Debug hook, dev build only.
if (__DEV__) window.Z = { G, P, STATS, kx, ky, spawnZombie };
