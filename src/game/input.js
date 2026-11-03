// Keyboard and mouse, written to the input object.

import { W, H, SCALE } from './config.js';
import { input } from './state.js';

const held = { KeyW: 0, KeyA: 0, KeyS: 0, KeyD: 0 };
let originX = 0, originY = 0, scale = 1;

function updateMove() {
  input.moveX = held.KeyD - held.KeyA;
  input.moveY = held.KeyS - held.KeyW;
}

function setKey(e, v) {
  if (e.code in held) { held[e.code] = v; updateMove(); e.preventDefault(); }
}

// Integer scaling keeps pixels even.
function fit(canvas) {
  const zoom = Math.max(1, Math.min(innerWidth / (W * SCALE), innerHeight / (H * SCALE)) | 0);
  scale = zoom * SCALE;
  canvas.style.width = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
  const r = canvas.getBoundingClientRect();
  originX = r.left;
  originY = r.top;
}

export function releaseAll() {
  held.KeyW = held.KeyA = held.KeyS = held.KeyD = 0;
  input.fire = false;
  updateMove();
}

export function initInput(canvas, onPress) {
  fit(canvas);
  addEventListener('resize', () => fit(canvas));
  addEventListener('keydown', (e) => setKey(e, 1));
  addEventListener('keyup', (e) => setKey(e, 0));
  addEventListener('mousemove', (e) => {
    input.aimX = (e.clientX - originX) / scale;
    input.aimY = (e.clientY - originY) / scale;
  });
  addEventListener('mousedown', (e) => { input.fire = true; onPress(); e.preventDefault(); });
  addEventListener('mouseup', () => { input.fire = false; });
  addEventListener('contextmenu', (e) => e.preventDefault());
}
