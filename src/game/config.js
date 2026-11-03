// Constants and balance values.

export const W = 320, H = 180; // world size in units
export const SCALE = 2; // pixels per world unit
export const STEP = 1 / 60; // fixed physics step

// Pool sizes, allocated once at start.
export const MAX_Z = 256, MAX_B = 128, MAX_P = 256, MAX_D = 64;

// Grid cell must exceed largest radius + bullet step.
export const CELL = 16;
export const OFF = 32; // grid margin outside the screen

export const SPAWN_MARGIN = 16; // spawn distance outside the screen
export const EDGE_X = 6, EDGE_Y = 7; // keeps the whole player on screen
// Gun offsets from player center, along the aim.
export const GUN_Y = 2, GUN_HAND = 3, MUZZLE = 8.5;

// Player and weapon stats, read on every use so upgrades can change them.
export const STATS = {
  hp: 5,
  radius: 4,
  speed: 90, // px/s
  accel: 14, // higher = tighter control
  invuln: 1, // seconds immune after a hit
  hurtKnock: 170,
  fireRate: 0.17, // seconds between shots
  damage: 1,
  bulletSpeed: 300,
  bulletLife: 1,
  spread: 0.05, // radians
  knock: 55, // push on hit
  recoil: 10,
};

// Difficulty: seconds between spawns.
export const spawnInterval = (t) => Math.max(0.22, 1.5 * Math.exp(-t / 80));
