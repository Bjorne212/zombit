// Spatial grid: one linked list per cell, rebuilt every step.

import { W, H, CELL, OFF, MAX_Z } from './config.js';
import { G, zx, zy } from './state.js';

export const COLS = ((W + OFF * 2) / CELL | 0) + 1, ROWS = ((H + OFF * 2) / CELL | 0) + 1;
export const head = new Int16Array(COLS * ROWS); // first zombie in cell, -1 = empty
export const next = new Int16Array(MAX_Z); // next zombie in cell, -1 = last

// Cell coordinate, clamped to the grid.
export const cellX = (x) => { const c = (x + OFF) / CELL | 0; return c < 0 ? 0 : c >= COLS ? COLS - 1 : c; };
export const cellY = (y) => { const c = (y + OFF) / CELL | 0; return c < 0 ? 0 : c >= ROWS ? ROWS - 1 : c; };

export function buildGrid() {
  head.fill(-1);
  for (let i = 0; i < G.zn; i++) {
    const c = cellY(zy[i]) * COLS + cellX(zx[i]);
    next[i] = head[c];
    head[c] = i;
  }
}
