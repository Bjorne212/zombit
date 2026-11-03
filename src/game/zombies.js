// Zombie types: one row of data per type, plus a behavior function.
//
// To add a type:
//   1. Write a behavior if needed. It runs every step and must not allocate.
//   2. Add a row to ZOMBIES. Graphics are baked from it.
//
// Fields:
//   hp, speed, radius, damage
//   mass    heavier = less push
//   unlock  seconds before it can appear
//   weight  spawn chance among unlocked types
//   tint    palette swap, e.g. { g: '#a33', G: '#722', A: '#c55' }
//           g/G/A = skin, c = clothes
//   scale   integer sprite scale
//   act     behavior

import { STEP } from './config.js';
import { P, zx, zy, zvx, zvy, zspeed, zdir, dirOf } from './state.js';

// Steers toward (vx, vy). Soft, so pushes stay visible.
// The view follows the wanted direction, not the push.
export function steer(i, vx, vy, rate = 4) {
  const k = rate * STEP;
  zvx[i] += (vx - zvx[i]) * k;
  zvy[i] += (vy - zvy[i]) * k;
  zdir[i] = dirOf(vx, vy);
}

// Walks straight at the player.
function chase(i) {
  const ddx = P.x - zx[i], ddy = P.y - zy[i];
  const d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
  const s = zspeed[i] / d;
  steer(i, ddx * s, ddy * s);
}

export const ZOMBIES = [
  // Walker
  { hp: 3, speed: 20, radius: 5, mass: 1, damage: 1, unlock: 0, weight: 1, tint: null, scale: 1, act: chase },
];

// Picks a weighted type among those unlocked at time t.
export function pickType(t) {
  let sum = 0;
  for (let i = 0; i < ZOMBIES.length; i++) if (t >= ZOMBIES[i].unlock) sum += ZOMBIES[i].weight;
  let r = Math.random() * sum;
  for (let i = 0; i < ZOMBIES.length; i++) {
    if (t < ZOMBIES[i].unlock) continue;
    r -= ZOMBIES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}
