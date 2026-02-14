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

function makeIslandName(rng) {
  const cons = ['b', 'c', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];
  const vows = ['a', 'e', 'i', 'o', 'u', 'ai', 'oa', 'ia'];
  const makePart = () => `${cons[rng.int(0, cons.length - 1)]}${vows[rng.int(0, vows.length - 1)]}${cons[rng.int(0, cons.length - 1)]}`;
  const suffix = [' Cay', ' Key', ' Point', ' Atoll', ' Isle'][rng.int(0, 4)];
  const raw = rng.bool(0.35) ? `${makePart()}${makePart()}` : makePart();
  return raw[0].toUpperCase() + raw.slice(1) + suffix;
}

export function generateWorld(seedText, round = 1) {
  let retry = 0;
  while (retry < 8) {
    const rng = new RNG(`${seedText}-r${round}-retry${retry}`);
    const n = CONFIG.terrainResolution;
    const size = CONFIG.worldSize;
    const h = new Float32Array(n * n);

    for (let b = 0; b < CONFIG.islandCount; b++) {
      const cx = rng.range(0.07, 0.93) * n;
      const cy = rng.range(0.07, 0.93) * n;
      const rad = rng.range(2.6, 8.2);
      const amp = rng.range(0.45, 1.35);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const dx = x - cx; const dy = y - cy;
        h[y * n + x] += amp * Math.exp(-(dx * dx + dy * dy) / (2 * rad * rad));
      }
    }

    for (let i = 0; i < h.length; i++) h[i] += rng.range(-0.08, 0.08);
    const mask = new Uint8Array(h.length);
    for (let i = 0; i < h.length; i++) mask[i] = h[i] > 0.5 ? 1 : 0;

    for (let y = 1; y < n - 1; y++) {
      for (let x = 1; x < n - 1; x++) {
        const i = y * n + x;
        if (!mask[i]) continue;
        const waterN = (mask[i - 1] ? 0 : 1) + (mask[i + 1] ? 0 : 1) + (mask[i - n] ? 0 : 1) + (mask[i + n] ? 0 : 1);
        if (waterN > 0 && rng.bool(0.22)) h[i] += rng.range(0.12, 0.34);
      }
    }

    for (let i = 0; i < h.length; i++) mask[i] = h[i] > 0.5 ? 1 : 0;
    const islands = countIslands(mask, n).filter((isl) => isl.length > 10 && isl.length < 650);
    if (islands.length < CONFIG.minIslands) { retry++; continue; }

    const toWorld = (cell) => {
      const x = cell % n; const y = Math.floor(cell / n);
      return { x: (x / (n - 1) - 0.5) * size, z: (y / (n - 1) - 0.5) * size };
    };

    const namedIslands = islands.map((cells, i) => {
      const nameRng = new RNG(`${seedText}:island:${i}`);
      const centerCell = cells[Math.floor(cells.length / 2)];
      return { id: `island-${i}`, name: makeIslandName(nameRng), cells, ...toWorld(centerCell) };
    });

    let baseIsland = namedIslands[0];
    let best = Infinity;
    for (const isl of namedIslands) {
      const d = isl.x * isl.x + isl.z * isl.z;
      if (d < best) { best = d; baseIsland = isl; }
    }

    const pickOnIsland = (isl, minHeight = 0.52) => {
      for (let k = 0; k < 30; k++) {
        const cell = isl.cells[rng.int(0, isl.cells.length - 1)];
        if (h[cell] >= minHeight) return toWorld(cell);
      }
      return toWorld(isl.cells[rng.int(0, isl.cells.length - 1)]);
    };

    const basePos = pickOnIsland(baseIsland, 0.62);
    const crates = [];
    for (let i = 0; i < CONFIG.crateCount; i++) {
      const isl = namedIslands[1 + (i % Math.min(namedIslands.length - 1, 12))];
      crates.push({ id: `crate-${i}`, islandName: isl.name, ...pickOnIsland(isl, 0.55), collected: false });
    }

    const refugees = [];
    for (let i = 0; i < rng.int(...CONFIG.refugeeRange); i++) {
      const isl = namedIslands[rng.int(1, namedIslands.length - 1)];
      refugees.push({ id: `ref-${i}`, islandName: isl.name, ...pickOnIsland(isl, 0.54), saved: false });
    }

    const helipads = [{ id: 'base', islandName: baseIsland.name, ...basePos }];
    for (let i = 1; i < rng.int(...CONFIG.helipadRange); i++) {
      const isl = namedIslands[rng.int(1, namedIslands.length - 1)];
      helipads.push({ id: `pad-${i}`, islandName: isl.name, ...pickOnIsland(isl, 0.6) });
    }

    const trees = [];
    const houses = [];
    for (const isl of namedIslands) {
      const treeCount = Math.min(22, Math.floor(isl.cells.length / 10));
      for (let i = 0; i < treeCount; i++) trees.push({ ...pickOnIsland(isl, 0.56), s: rng.range(0.8, 1.4) });
      if (isl.cells.length > 90) {
        const houseCount = Math.min(8, Math.floor(isl.cells.length / 55));
        for (let i = 0; i < houseCount; i++) houses.push({ ...pickOnIsland(isl, 0.62), s: rng.range(0.8, 1.3) });
      }
    }

    const occluders = [];
    for (let i = 0; i < 110; i++) {
      const isl = namedIslands[rng.int(0, Math.min(namedIslands.length - 1, 14))];
      const p = pickOnIsland(isl, 0.55);
      occluders.push({ ...p, r: rng.range(1, 2.6), h: rng.range(2, 8) });
    }

    const cyclonePath = {
      centerX: rng.range(-70, 70),
      centerZ: rng.range(-70, 70),
      radX: rng.range(80, 130),
      radZ: rng.range(70, 120),
      phase: rng.range(0, Math.PI * 2),
    };

    return { seedText, n, size, h, mask, islands, namedIslands, basePos, baseIslandName: baseIsland.name, crates, refugees, helipads, trees, houses, occluders, cyclonePath };
  }
  throw new Error('Failed to generate suitable archipelago');
}
