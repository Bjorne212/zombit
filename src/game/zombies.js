// Zombie types: one row of data per type, plus a behavior function.
//
// To add a type:
//   1. Write a behavior if needed. It runs every step and must not allocate.
//   2. Add a row to ZOMBIES. Graphics are baked from it.
//
// Fields:
//   fig     figure name in art/art.px.js
//   hp, speed, radius, damage
//   mass    heavier = less push
//   drops   power-ups dropped on death
//   hover   floats up and down
//   noKnock takes no knockback
//   unlock  seconds before it can appear
//   weight  spawn chance among unlocked types, 0 = never at random
//   tint    palette swap, e.g. { g: '#a33', G: '#722', A: '#c55' }
//           g/G/A = skin, c = clothes
//   scale   integer sprite scale
//   act     behavior

import { STEP, MAX_O, ORB_EVERY, ORB_SPEED, ORB_RATE_STEP, ORB_SPEED_STEP } from './config.js';
import { G, P, zx, zy, zvx, zvy, zspeed, zdir, dirOf, orbX, orbY, orbVx, orbVy } from './state.js';
import { sfxOrb } from './audio.js';

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

// Chases and shoots orbs at where the player is. Faster and more often per defeated boss.
function caster(i) {
  chase(i);
  G.orbIn -= STEP;
  if (G.orbIn > 0 || G.orbN >= MAX_O) return;
  G.orbIn = ORB_EVERY / (1 + G.bosses * ORB_RATE_STEP);
  const ddx = P.x - zx[i], ddy = P.y - zy[i], o = G.orbN++;
  const s = ORB_SPEED * (1 + G.bosses * ORB_SPEED_STEP) / (Math.sqrt(ddx * ddx + ddy * ddy) || 1);
  orbX[o] = zx[i];
  orbY[o] = zy[i];
  orbVx[o] = ddx * s;
  orbVy[o] = ddy * s;
  sfxOrb();
}

export const ZOMBIES = [
  // Walker
  { fig: 'zombie', hp: 3, speed: 20, radius: 5, mass: 1, damage: 1, drops: 0, unlock: 0, weight: 6, tint: null, scale: 1, act: chase },
  // Tank: slow and tough
  { fig: 'tank', hp: 14, speed: 12, radius: 7, mass: 3, damage: 2, drops: 1, unlock: 20, weight: 1, noKnock: true, tint: null, scale: 1, act: chase },
  // Boss: spawned once by the director
  { fig: 'boss', hp: 90, speed: 14, radius: 10, mass: 8, damage: 2, drops: 5, unlock: 0, weight: 0, hover: true, noKnock: true, tint: null, scale: 1, act: caster },
];

export const BOSS = 2; // index in ZOMBIES

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
