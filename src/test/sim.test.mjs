// Physics tests. No DOM needed, audio stays silent.

import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_Z, STATS, STEP, W, H } from '../game/config.js';
import { G, P, bx, by, bvx, bvy, blife, zx, zy, zhp, input } from '../game/state.js';
import { reset, spawnZombie, update } from '../game/sim.js';

function setup() {
  reset();
  G.spawnIn = 1e9; // no automatic spawns
  input.moveX = input.moveY = 0;
  input.fire = false;
  input.aimX = W / 2;
  input.aimY = 0;
  P.x = 20; P.y = 20;
}

function shoot(x, y, vx, vy) {
  const b = G.bn++;
  bx[b] = x; by[b] = y; bvx[b] = vx; bvy[b] = vy; blife[b] = 2;
}

test('fast bullet does not pass through a zombie', () => {
  setup();
  const speed = STATS.bulletSpeed;
  STATS.bulletSpeed = 840;
  spawnZombie(0, 200, 100);
  const hp = zhp[0];
  shoot(100, 100, 840, 0); // 14 units per step, more than a zombie's diameter
  for (let i = 0; i < 20; i++) update();
  STATS.bulletSpeed = speed;
  assert.equal(zhp[0], hp - STATS.damage);
  assert.equal(G.bn, 0);
});

test('zombie dies after the right number of hits and the pool compacts', () => {
  setup();
  spawnZombie(0, 200, 100);
  spawnZombie(0, 280, 150);
  const survivorY = zy[1];
  for (let n = 0; n < 3; n++) {
    shoot(zx[0] - 10, zy[0], STATS.bulletSpeed, 0);
    for (let i = 0; i < 5; i++) update();
  }
  assert.equal(G.kills, 1);
  assert.equal(G.zn, 1);
  assert.ok(Math.abs(zy[0] - survivorY) < 5, 'survivor moved to the free index');
});

test('overlapping zombies are pushed apart', () => {
  setup();
  for (let i = 0; i < 10; i++) spawnZombie(0, 200, 120);
  for (let i = 0; i < 60; i++) update();
  let closest = Infinity;
  for (let i = 0; i < G.zn; i++) for (let j = i + 1; j < G.zn; j++) {
    closest = Math.min(closest, Math.hypot(zx[i] - zx[j], zy[i] - zy[j]));
  }
  assert.ok(closest > 5, `closest pair ${closest.toFixed(2)} px`);
});

test('contact hurts once per immunity period and pushes the player', () => {
  setup();
  P.x = 100; P.y = 100;
  spawnZombie(0, 106, 100);
  update();
  assert.equal(P.hp, STATS.hp - 1);
  assert.ok(P.vx < 0, 'pushed away from the zombie');
  const steps = Math.floor(STATS.invuln / STEP) - 5;
  for (let i = 0; i < steps; i++) { zx[0] = P.x + 6; zy[0] = P.y; update(); }
  assert.equal(P.hp, STATS.hp - 1);
  for (let i = 0; i < 10; i++) { zx[0] = P.x + 6; zy[0] = P.y; update(); }
  assert.equal(P.hp, STATS.hp - 2);
});

test('player dies at 0 HP', () => {
  setup();
  P.hp = 1;
  P.x = 100; P.y = 100;
  spawnZombie(0, 104, 100);
  update();
  assert.equal(G.over, true);
});

test('arena edge keeps the player inside', () => {
  setup();
  input.moveX = 1;
  input.moveY = 1;
  for (let i = 0; i < 600; i++) update();
  assert.ok(P.x <= W && P.y <= H);
});

test('player faces the aim, not the walk direction', () => {
  setup();
  P.x = 100; P.y = 100;
  input.moveX = -1; // keeps walking left
  const AIMS = [[200, 102, 0], [200, 202, 1], [100, 202, 2], [0, 202, 3], [0, 102, 4], [0, 2, 5], [100, 2, 6], [200, 2, 7]];
  for (const [x, y, dir] of AIMS) {
    P.x = 100; P.y = 100;
    input.aimX = x;
    input.aimY = y;
    update();
    assert.equal(P.dir, dir, `aim ${x},${y}`);
  }
});

test('pools stay within limits and values stay finite over a long run', () => {
  setup();
  G.spawnIn = 0;
  P.inv = 1e9; // player survives the whole test
  input.fire = true;
  input.aimX = W;
  input.aimY = H;
  for (let i = 0; i < 60 * 60 * 5; i++) update(); // 5 minutes of play
  assert.ok(G.zn <= MAX_Z);
  assert.ok(G.zn > 0);
  assert.ok(G.kills > 0);
  for (let i = 0; i < G.zn; i++) assert.ok(Number.isFinite(zx[i]) && Number.isFinite(zy[i]));
});
