// Simulation: movement, collisions, weapon, difficulty. No DOM, no allocations.

import {
  W, H, STEP, MAX_Z, MAX_B, MAX_P, MAX_D, MAX_K, GUN_Y, MUZZLE, SPAWN_MARGIN, EDGE_X, EDGE_Y,
  STATS, DMG_STEP, SPD_STEP, PICK_RADIUS, BOSS_AT, ORB_EVERY, ORB_RADIUS, ORB_DAMAGE, spawnInterval,
} from './config.js';
import {
  G, P, input, hpScale, Z_ARRAYS, B_ARRAYS, K_ARRAYS, O_ARRAYS,
  orbX, orbY, orbVx, orbVy,
  kx, ky, ktype,
  zx, zy, zvx, zvy, zspeed, zhp, zflash, ztype,
  bx, by, bvx, bvy, blife,
  px, py, pvx, pvy, plife, pcol,
  dx, dy, dcol,
  C_BLOOD, C_DARK, C_STAIN, C_SPARK, C_WHITE,
} from './state.js';
import { ZOMBIES, BOSS, pickType } from './zombies.js';
import { buildGrid, head, next, COLS, ROWS, cellX, cellY } from './grid.js';
import { sfxShot, sfxHit, sfxKill, sfxHurt, sfxPickup, sfxBoss } from './audio.js';

export function reset() {
  G.zn = G.bn = G.dn = G.kn = G.orbN = G.time = G.tick = G.shake = G.bosses = 0;
  G.bossAt = BOSS_AT;
  G.orbIn = ORB_EVERY;
  G.spawnIn = 0.5;
  G.over = G.fight = false;
  STATS.damage = STATS.attackSpeed = 1;
  plife.fill(0);
  P.x = W / 2; P.y = H / 2;
  P.vx = P.vy = P.inv = P.cool = P.flash = P.walk = 0;
  P.dir = 2;
  P.hp = STATS.hp;
}

export function spawnZombie(type, x, y) {
  if (G.zn >= MAX_Z) return -1;
  const i = G.zn++, t = ZOMBIES[type];
  zx[i] = x; zy[i] = y;
  zvx[i] = zvy[i] = zflash[i] = 0;
  zspeed[i] = t.speed * (0.85 + Math.random() * 0.3); // spread, so the crowd is not in step
  zhp[i] = t.hp * hpScale();
  ztype[i] = type;
  return i;
}

// Spawns a zombie just outside the screen.
function spawnAtEdge(type) {
  const m = SPAWN_MARGIN, side = Math.random() * (W + H) * 2;
  let x, y;
  if (side < W) { x = side; y = -m; }
  else if (side < W * 2) { x = side - W; y = H + m; }
  else if (side < W * 2 + H) { x = -m; y = side - W * 2; }
  else { x = W + m; y = side - W * 2 - H; }
  spawnZombie(type, x, y);
}

function emit(x, y, n, speed, col, dirX, dirY) {
  for (let k = 0; k < n; k++) {
    const i = G.pi;
    G.pi = (i + 1) % MAX_P;
    const a = Math.random() * 6.283, s = speed * Math.random();
    px[i] = x; py[i] = y;
    pvx[i] = Math.cos(a) * s + dirX * speed * 0.6;
    pvy[i] = Math.sin(a) * s + dirY * speed * 0.6;
    plife[i] = 0.2 + Math.random() * 0.3;
    pcol[i] = col;
  }
}

function updatePlayer() {
  let mx = input.moveX, my = input.moveY;
  if (mx && my) { mx *= 0.7071; my *= 0.7071; }
  const k = Math.min(1, STATS.accel * STEP);
  P.vx += (mx * STATS.speed - P.vx) * k;
  P.vy += (my * STATS.speed - P.vy) * k;
  P.x += P.vx * STEP;
  P.y += P.vy * STEP;

  // Edges stop the player. Zombies may walk in.
  if (P.x < EDGE_X) { P.x = EDGE_X; P.vx = 0; } else if (P.x > W - EDGE_X) { P.x = W - EDGE_X; P.vx = 0; }
  if (P.y < EDGE_Y) { P.y = EDGE_Y; P.vy = 0; } else if (P.y > H - EDGE_Y) { P.y = H - EDGE_Y; P.vy = 0; }

  if (mx || my) P.walk += STEP;
  if (P.inv > 0) P.inv -= STEP;
  if (P.flash > 0) P.flash -= STEP;
  P.aim = Math.atan2(input.aimY - (P.y + GUN_Y), input.aimX - P.x);
  P.dir = (Math.round(P.aim / 0.7854) + 8) % 8; // player faces the aim
}

function updateWeapon() {
  P.cool -= STEP;
  if (!input.fire || P.cool > 0 || G.bn >= MAX_B) return;
  P.cool = STATS.fireRate / STATS.attackSpeed;
  P.flash = 0.05;

  const a = P.aim + (Math.random() - 0.5) * STATS.spread;
  const c = Math.cos(a), s = Math.sin(a), i = G.bn++;
  bx[i] = P.x + Math.cos(P.aim) * MUZZLE;
  by[i] = P.y + GUN_Y + Math.sin(P.aim) * MUZZLE;
  bvx[i] = c * STATS.bulletSpeed;
  bvy[i] = s * STATS.bulletSpeed;
  blife[i] = STATS.bulletLife;
  P.vx -= c * STATS.recoil;
  P.vy -= s * STATS.recoil;
  emit(bx[i], by[i], 2, 40, C_SPARK, c, s);
  sfxShot();
}

function updateZombies() {
  for (let i = 0; i < G.zn; i++) {
    ZOMBIES[ztype[i]].act(i);
    zx[i] += zvx[i] * STEP;
    zy[i] += zvy[i] * STEP;
    if (zflash[i] > 0) zflash[i] -= STEP;
  }
}

function hurtPlayer(damage, knock, ux, uy) {
  P.inv = STATS.invuln;
  P.hp -= damage;
  P.vx += ux * knock;
  P.vy += uy * knock;
  G.shake = 0.25;
  emit(P.x, P.y, 10, 60, C_BLOOD, ux, uy);
  sfxHurt();
  if (P.hp <= 0) {
    G.over = true;
    G.shake = 0; // the timer stops at death, so the shake would never end
  }
}

// Separates overlapping zombies and hurts the player on contact.
function collideBodies() {
  for (let i = 0; i < G.zn; i++) {
    const ti = ZOMBIES[ztype[i]], ri = ti.radius, cx = cellX(zx[i]), cy = cellY(zy[i]);
    const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < ROWS - 1 ? cy + 1 : cy;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < COLS - 1 ? cx + 1 : cx;
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      for (let j = head[gy * COLS + gx]; j >= 0; j = next[j]) {
        if (j <= i) continue;
        const tj = ZOMBIES[ztype[j]], min = ri + tj.radius;
        let ox = zx[j] - zx[i], oy = zy[j] - zy[i], d2 = ox * ox + oy * oy;
        if (d2 >= min * min) continue;
        if (d2 < 0.01) { ox = Math.random() - 0.5; oy = Math.random() - 0.5; d2 = ox * ox + oy * oy + 0.01; }
        const d = Math.sqrt(d2), push = (min - d) * 0.5 / d, wi = tj.mass / (ti.mass + tj.mass);
        zx[i] -= ox * push * wi;
        zy[i] -= oy * push * wi;
        zx[j] += ox * push * (1 - wi);
        zy[j] += oy * push * (1 - wi);
      }
    }

    // Light zombies give way, so the player never gets stuck. Heavy ones push the player.
    const ox = zx[i] - P.x, oy = zy[i] - P.y, min = ri + STATS.radius, d2 = ox * ox + oy * oy;
    if (d2 < min * min) {
      const d = Math.sqrt(d2) || 1, ux = ox / d, uy = oy / d;
      if (ti.mass > 1) { P.x = zx[i] - ux * min; P.y = zy[i] - uy * min; }
      else { zx[i] = P.x + ux * min; zy[i] = P.y + uy * min; }
      if (P.inv <= 0 && !G.over) {
        hurtPlayer(ti.damage, STATS.hurtKnock + (ti.mass - 1) * 40, -ux, -uy); // heavy zombies push harder
        if (!ti.noKnock) {
          zvx[i] += ux * 40;
          zvy[i] += uy * 40;
        }
      }
    }
  }
}

// Bullets are swept as segments, so fast ones cannot tunnel.
// Nearest hit wins.
function updateBullets() {
  for (let b = G.bn - 1; b >= 0; b--) {
    const sx = bvx[b] * STEP, sy = bvy[b] * STEP, ox = bx[b], oy = by[b];
    bx[b] = ox + sx;
    by[b] = oy + sy;
    blife[b] -= STEP;

    const len2 = sx * sx + sy * sy, cx = cellX(bx[b]), cy = cellY(by[b]);
    const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < ROWS - 1 ? cy + 1 : cy;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < COLS - 1 ? cx + 1 : cx;
    let hit = -1, best = 2;
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      for (let j = head[gy * COLS + gx]; j >= 0; j = next[j]) {
        if (zhp[j] <= 0) continue;
        const r = ZOMBIES[ztype[j]].radius + 1, zox = zx[j] - ox, zoy = zy[j] - oy;
        let t = (zox * sx + zoy * sy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = zox - sx * t, ey = zoy - sy * t;
        if (ex * ex + ey * ey < r * r && t < best) { best = t; hit = j; }
      }
    }

    if (hit >= 0) {
      const inv = 1 / STATS.bulletSpeed, ux = bvx[b] * inv, uy = bvy[b] * inv;
      const t = ZOMBIES[ztype[hit]];
      zhp[hit] -= STATS.damage;
      if (!t.noKnock) {
        zvx[hit] += ux * STATS.knock / t.mass;
        zvy[hit] += uy * STATS.knock / t.mass;
      }
      zflash[hit] = 0.07;
      emit(zx[hit], zy[hit], 4, 50, C_BLOOD, ux, uy);
      if (zhp[hit] > 0) sfxHit();
    }

    if (hit >= 0 || blife[b] <= 0 || bx[b] < -8 || bx[b] > W + 8 || by[b] < -8 || by[b] > H + 8) {
      const last = --G.bn;
      for (let a = 0; a < B_ARRAYS.length; a++) B_ARRAYS[a][b] = B_ARRAYS[a][last];
    }
  }
}

// Drops a random power-up near (x, y), always inside the arena.
function dropPickup(x, y) {
  if (G.kn >= MAX_K) return;
  const i = G.kn++, a = Math.random() * 6.283, r = 6 + Math.random() * 16;
  kx[i] = Math.min(W - EDGE_X, Math.max(EDGE_X, x + Math.cos(a) * r));
  ky[i] = Math.min(H - EDGE_Y, Math.max(EDGE_Y, y + Math.sin(a) * r));
  ktype[i] = Math.random() * 3;
}

function updatePickups() {
  for (let i = G.kn - 1; i >= 0; i--) {
    const ox = kx[i] - P.x, oy = ky[i] - P.y;
    if (ox * ox + oy * oy > PICK_RADIUS * PICK_RADIUS) continue;
    if (ktype[i] === 2) {
      if (P.hp >= STATS.hp) continue; // hearts stay on the ground at full life
      P.hp++;
    } else if (ktype[i]) STATS.attackSpeed += SPD_STEP;
    else STATS.damage += DMG_STEP;
    sfxPickup();
    const last = --G.kn;
    for (let a = 0; a < K_ARRAYS.length; a++) K_ARRAYS[a][i] = K_ARRAYS[a][last];
  }
}

// Orbs fly straight and only stop at the player or outside the screen.
function updateOrbs() {
  for (let o = G.orbN - 1; o >= 0; o--) {
    orbX[o] += orbVx[o] * STEP;
    orbY[o] += orbVy[o] * STEP;
    const ox = P.x - orbX[o], oy = P.y - orbY[o], r = ORB_RADIUS + STATS.radius;
    const hit = P.inv <= 0 && !G.over && ox * ox + oy * oy < r * r;
    if (hit) {
      const d = Math.sqrt(ox * ox + oy * oy) || 1;
      hurtPlayer(ORB_DAMAGE, STATS.hurtKnock, ox / d, oy / d);
    }
    if (hit || orbX[o] < -8 || orbX[o] > W + 8 || orbY[o] < -8 || orbY[o] > H + 8) {
      const last = --G.orbN;
      for (let a = 0; a < O_ARRAYS.length; a++) O_ARRAYS[a][o] = O_ARRAYS[a][last];
    }
  }
}

// Runs after bullets: the grid holds old indices until the next rebuild.
function removeDead() {
  for (let i = G.zn - 1; i >= 0; i--) {
    if (zhp[i] > 0) continue;
    emit(zx[i], zy[i], 12, 70, C_DARK, 0, 0);
    emit(zx[i], zy[i], 6, 40, C_WHITE, 0, 0);
    sfxKill();
    if (ztype[i] === BOSS) { G.fight = false; G.bosses++; }
    for (let k = ZOMBIES[ztype[i]].drops; k > 0; k--) dropPickup(zx[i], zy[i]);
    const last = --G.zn;
    for (let a = 0; a < Z_ARRAYS.length; a++) Z_ARRAYS[a][i] = Z_ARRAYS[a][last];
  }
}

function updateParticles() {
  for (let i = 0; i < MAX_P; i++) {
    if (plife[i] <= 0) continue;
    pvx[i] *= 0.92;
    pvy[i] *= 0.92;
    px[i] += pvx[i] * STEP;
    py[i] += pvy[i] * STEP;
    plife[i] -= STEP;
    if (plife[i] <= 0 && pcol[i] < C_STAIN && G.dn < MAX_D) {
      dx[G.dn] = px[i];
      dy[G.dn] = py[i];
      dcol[G.dn++] = pcol[i];
    }
  }
}

function updateDirector() {
  if (!G.fight && G.time >= G.bossAt) {
    G.fight = true;
    G.bossAt += BOSS_AT;
    G.orbIn = ORB_EVERY;
    spawnAtEdge(BOSS);
    sfxBoss();
  }
  if (G.fight) return;
  G.spawnIn -= STEP;
  if (G.spawnIn > 0) return;
  G.spawnIn = spawnInterval(G.time);
  spawnAtEdge(pickType(G.time));
}

export function update() {
  G.tick += STEP;
  if (!G.fight) G.time += STEP; // the timer waits for the boss to die
  if (G.shake > 0) G.shake -= STEP;
  updatePlayer();
  updateWeapon();
  updateZombies();
  buildGrid();
  collideBodies();
  updateBullets();
  updateOrbs();
  removeDead();
  updatePickups();
  updateParticles();
  updateDirector();
}
