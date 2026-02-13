import { RNG } from '../engine/RNG.js';
import { CONFIG } from '../config.js';

function countIslands(mask, n) {
  const vis = new Uint8Array(n * n);
  const regions = [];
  const dirs = [1, -1, n, -n];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || vis[i]) continue;
    const q = [i]; vis[i] = 1; const cells = [];
    while (q.length) {
      const c = q.pop(); cells.push(c);
      for (const d of dirs) {
        const nx = c + d;
        if (nx < 0 || nx >= mask.length || vis[nx] || !mask[nx]) continue;
        if ((d === 1 && nx % n === 0) || (d === -1 && c % n === 0)) continue;
        vis[nx] = 1; q.push(nx);
      }
    }
    regions.push(cells);
  }
  return regions.sort((a, b) => b.length - a.length);
}

export function generateWorld(seedText, round = 1) {
  let retry = 0;
  while (retry < 8) {
    const rng = new RNG(`${seedText}-r${round}-retry${retry}`);
    const n = CONFIG.terrainResolution;
    const size = CONFIG.worldSize;
    const h = new Float32Array(n * n);
    for (let b = 0; b < CONFIG.islandCount; b++) {
      const cx = rng.range(0.15, 0.85) * n;
      const cy = rng.range(0.15, 0.85) * n;
      const rad = rng.range(4, 13);
      const amp = rng.range(0.35, 1.2);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const dx = x - cx, dy = y - cy;
        h[y * n + x] += amp * Math.exp(-(dx * dx + dy * dy) / (2 * rad * rad));
      }
    }
    for (let i = 0; i < h.length; i++) h[i] += rng.range(-0.12, 0.12);
    const mask = new Uint8Array(h.length);
    for (let i = 0; i < h.length; i++) mask[i] = h[i] > 0.37 ? 1 : 0;
    const islands = countIslands(mask, n);
    if (islands.length < CONFIG.minIslands) { retry++; continue; }

    const toWorld = (cell) => {
      const x = cell % n, y = Math.floor(cell / n);
      return { x: (x / (n - 1) - 0.5) * size, z: (y / (n - 1) - 0.5) * size };
    };
    const center = { x: 0, z: 0 };
    let baseIsland = islands[0];
    let best = Infinity;
    for (const isl of islands.slice(0, 8)) {
      const c = toWorld(isl[Math.floor(isl.length / 2)]);
      const d = (c.x - center.x) ** 2 + (c.z - center.z) ** 2;
      if (d < best && isl.length > 20) { best = d; baseIsland = isl; }
    }

    const pickOnIsland = (isl) => toWorld(isl[rng.int(0, isl.length - 1)]);
    const basePos = pickOnIsland(baseIsland);
    const crates = [];
    const used = new Set([baseIsland]);
    for (let i = 0; i < CONFIG.crateCount; i++) {
      const isl = islands[1 + (i % Math.min(islands.length - 1, 10))];
      crates.push({ id: `crate-${i}`, ...pickOnIsland(isl), collected: false });
      used.add(isl);
    }
    const refugees = [];
    const refugeeCount = rng.int(...CONFIG.refugeeRange);
    for (let i = 0; i < refugeeCount; i++) refugees.push({ id: `ref-${i}`, ...pickOnIsland(islands[rng.int(1, islands.length - 1)]), saved: false });
    const helipads = [{ id: 'base', ...basePos }];
    const pads = rng.int(...CONFIG.helipadRange);
    for (let i = 1; i < pads; i++) helipads.push({ id: `pad-${i}`, ...pickOnIsland(islands[rng.int(1, islands.length - 1)]) });

    const occluders = [];
    for (let i = 0; i < 80; i++) {
      const p = pickOnIsland(islands[rng.int(0, 9)]);
      occluders.push({ ...p, r: rng.range(1, 2.6), h: rng.range(2, 8) });
    }
    const cyclonePath = {
      centerX: rng.range(-40, 40),
      centerZ: rng.range(-40, 40),
      radX: rng.range(60, 95),
      radZ: rng.range(45, 90),
      phase: rng.range(0, Math.PI * 2),
    };
    return { seedText, n, size, h, mask, islands, basePos, crates, refugees, helipads, occluders, cyclonePath };
  }
  throw new Error('Failed to generate suitable archipelago');
}
