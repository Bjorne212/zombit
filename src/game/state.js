// Game state in typed arrays. No DOM, so it runs in Node.

import { MAX_Z, MAX_B, MAX_P, MAX_D, MAX_K, MAX_O, HP_STEP } from './config.js';

const f32 = (n) => new Float32Array(n);

// Zombies: 0..G.zn-1 are alive.
export const zx = f32(MAX_Z), zy = f32(MAX_Z), zvx = f32(MAX_Z), zvy = f32(MAX_Z);
export const zspeed = f32(MAX_Z), zhp = f32(MAX_Z), zflash = f32(MAX_Z);
export const ztype = new Uint8Array(MAX_Z), zdir = new Uint8Array(MAX_Z); // zdir: 0 = E, clockwise to 7 = NE
export const Z_ARRAYS = [zx, zy, zvx, zvy, zspeed, zhp, zflash, ztype, zdir]; // add new fields here

// Bullets: 0..G.bn-1 are active.
export const bx = f32(MAX_B), by = f32(MAX_B), bvx = f32(MAX_B), bvy = f32(MAX_B), blife = f32(MAX_B);
export const B_ARRAYS = [bx, by, bvx, bvy, blife];

// Boss orbs: 0..G.orbN-1 are flying.
export const orbX = f32(MAX_O), orbY = f32(MAX_O), orbVx = f32(MAX_O), orbVy = f32(MAX_O);
export const O_ARRAYS = [orbX, orbY, orbVx, orbVy];

// Particles: ring buffer, plife <= 0 is free.
export const px = f32(MAX_P), py = f32(MAX_P), pvx = f32(MAX_P), pvy = f32(MAX_P), plife = f32(MAX_P);
export const pcol = new Uint8Array(MAX_P);

// Stains waiting to be drawn into the ground.
export const dx = f32(MAX_D), dy = f32(MAX_D);
export const dcol = new Uint8Array(MAX_D);

// Power-ups: 0..G.kn-1 are on the ground. ktype: 0 = damage, 1 = attack speed, 2 = life.
export const kx = f32(MAX_K), ky = f32(MAX_K);
export const ktype = new Uint8Array(MAX_K);
export const K_ARRAYS = [kx, ky, ktype];

// Particle colors. Below C_STAIN leaves a stain.
export const C_BLOOD = 0, C_DARK = 1, C_STAIN = 2, C_SPARK = 2, C_WHITE = 3;

export const G = {
  zn: 0, bn: 0, pi: 0, dn: 0, kn: 0, orbN: 0, orbIn: 0,
  time: 0, tick: 0, spawnIn: 0, // time: score, paused in boss fights. tick: animation clock
  shake: 0, over: false,
  fight: false, bossAt: 0, bosses: 0, // boss alive, next boss time, defeated bosses
};

export const P = {
  x: 0, y: 0, vx: 0, vy: 0,
  hp: 0, inv: 0, cool: 0, flash: 0,
  aim: 0, walk: 0, dir: 2, // same as zdir, starts facing down
};

// Health multiplier for all zombies.
export const hpScale = () => 1 + G.bosses * HP_STEP;

// Direction 0-7 from a vector: 0 = E, 2 = S, 4 = W, 6 = N.
export const dirOf = (x, y) => (Math.round(Math.atan2(y, x) / 0.7854) + 8) % 8;

// Set by input.js. moveX/moveY: -1, 0, 1. aimX/aimY: world units.
export const input = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false };
