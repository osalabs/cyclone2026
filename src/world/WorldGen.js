import { RNG } from '../engine/RNG.js';
import { CONFIG } from '../config.js';

function countIslands(mask, n) {
  const vis = new Uint8Array(n * n);
  const regions = [];
  const dirs = [1, -1, n, -n];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || vis[i]) continue;
    const q = [i];
    vis[i] = 1;
    const cells = [];
    while (q.length) {
      const c = q.pop();
      cells.push(c);
      for (const d of dirs) {
        const nx = c + d;
        if (nx < 0 || nx >= mask.length || vis[nx] || !mask[nx]) continue;
        if ((d === 1 && nx % n === 0) || (d === -1 && c % n === 0)) continue;
        vis[nx] = 1;
        q.push(nx);
      }
    }
    regions.push(cells);
  }
  return regions.sort((a, b) => b.length - a.length);
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function makeNameWord(rng) {
  const onsets = ['', 'b', 'c', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z', 'br', 'cr', 'dr', 'gr', 'pr', 'st', 'tr', 'cl', 'gl', 'th', 'sh'];
  const vowels = ['a', 'e', 'i', 'o', 'u', 'ai', 'ea', 'io', 'oa', 'ou'];
  const codas = ['', '', '', '', 'n', 'r', 'l', 's', 't', 'm', 'k'];
  const syllables = rng.int(2, 3);
  let word = '';
  for (let i = 0; i < syllables; i++) word += rng.pick(onsets) + rng.pick(vowels) + rng.pick(codas);
  word = word.replace(/([aeiou])\1+/g, '$1').replace(/[^a-z]/g, '').slice(0, 9);
  if (!word) word = `isle${rng.int(10, 999)}`;
  return capitalize(word);
}

function makeIslandName(index, rng, used) {
  let name = '';
  let tries = 0;
  do {
    name = makeNameWord(rng);
    if (rng.next() < 0.42) name = `${name} ${makeNameWord(rng)}`;
    tries++;
  } while (used.has(name) && tries < 18);
  if (used.has(name)) name = `${makeNameWord(rng)}-${index + 1}`;
  used.add(name);
  return name;
}

export function generateWorld(seedText, round = 1) {
  let retry = 0;
  while (retry < 14) {
    const rng = new RNG(`${seedText}-r${round}-retry${retry}`);
    const n = CONFIG.terrainResolution;
    const size = CONFIG.worldSize;
    const h = new Float32Array(n * n);

    for (let i = 0; i < h.length; i++) h[i] = rng.range(-0.44, -0.3);

    const mains = [];
    const shapes = [];
    const targetIslands = CONFIG.islandCount + rng.int(-3, 3);

    for (let attempts = 0; attempts < 1800 && mains.length < targetIslands; attempts++) {
      const cx = rng.range(0.07, 0.93) * n;
      const cy = rng.range(0.07, 0.93) * n;
      const tier = rng.next();
      const big = tier < 0.34;
      const medium = tier >= 0.34 && tier < 0.72;
      const rx = big ? rng.range(12, 21) : (medium ? rng.range(8, 14) : rng.range(5, 9));
      const ry = big ? rng.range(10, 18) : (medium ? rng.range(7, 12) : rng.range(4.5, 8));
      const sep = big ? rng.range(20, 29) : (medium ? rng.range(14, 21) : rng.range(10, 16));
      let ok = true;
      for (const c of mains) {
        const dx = cx - c.cx;
        const dy = cy - c.cy;
        const minSep = sep + c.sep;
        if (dx * dx + dy * dy < minSep * minSep) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const base = {
        cx,
        cy,
        rx,
        ry,
        sep,
        amp: big ? rng.range(1.08, 1.45) : (medium ? rng.range(0.95, 1.3) : rng.range(0.82, 1.15)),
        rot: rng.range(0, Math.PI),
        ridgeDir: rng.range(0, Math.PI),
        phaseA: rng.range(0, Math.PI * 2),
        phaseB: rng.range(0, Math.PI * 2),
        profile: rng.int(0, 3),
      };
      mains.push(base);
      shapes.push(base);

      const lobeCount = big ? rng.int(2, 4) : (medium ? rng.int(1, 3) : rng.int(0, 2));
      for (let l = 0; l < lobeCount; l++) {
        const angle = rng.range(0, Math.PI * 2);
        const dist = rng.range(Math.max(rx, ry) * 0.35, Math.max(rx, ry) * 0.92);
        shapes.push({
          cx: cx + Math.cos(angle) * dist,
          cy: cy + Math.sin(angle) * dist,
          rx: rng.range(rx * 0.35, rx * 0.78),
          ry: rng.range(ry * 0.35, ry * 0.78),
          amp: base.amp * rng.range(0.45, 0.72),
          rot: rng.range(0, Math.PI),
          ridgeDir: rng.range(0, Math.PI),
          phaseA: base.phaseA + rng.range(-1.2, 1.2),
          phaseB: base.phaseB + rng.range(-1.2, 1.2),
          profile: rng.int(0, 3),
        });
      }
    }

    for (const s of shapes) {
      const maxR = Math.max(s.rx, s.ry) * 1.95;
      const x0 = Math.max(0, Math.floor(s.cx - maxR));
      const x1 = Math.min(n - 1, Math.ceil(s.cx + maxR));
      const y0 = Math.max(0, Math.floor(s.cy - maxR));
      const y1 = Math.min(n - 1, Math.ceil(s.cy + maxR));
      const cs = Math.cos(s.rot);
      const sn = Math.sin(s.rot);
      const ridgeCos = Math.cos(s.ridgeDir);
      const ridgeSin = Math.sin(s.ridgeDir);

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - s.cx;
          const dy = y - s.cy;
          const rx = dx * cs - dy * sn;
          const ry = dx * sn + dy * cs;
          const d = Math.sqrt((rx * rx) / (s.rx * s.rx) + (ry * ry) / (s.ry * s.ry));
          if (d > 1.65) continue;
          const edge = Math.max(0, 1 - d / 1.65);
          const warp = 1 + Math.sin(rx * 0.27 + ry * 0.13 + s.phaseA) * 0.16 + Math.cos(ry * 0.31 - rx * 0.11 + s.phaseB) * 0.13;

          let contrib = 0;
          if (s.profile === 0) {
            contrib = s.amp * Math.pow(edge, 0.5);
          } else if (s.profile === 1) {
            const ridgeAxis = (rx * ridgeCos + ry * ridgeSin) / (s.rx * 1.05);
            const ridge = Math.max(0, 1 - Math.abs(ridgeAxis));
            contrib = s.amp * Math.pow(edge, 0.88) * (0.5 + ridge * 0.7);
          } else if (s.profile === 2) {
            const stepped = Math.floor(Math.pow(edge, 0.7) * 6) / 6;
            contrib = s.amp * stepped;
          } else {
            const block = Math.max(0, 1 - Math.max(Math.abs(rx) / (s.rx * 1.08), Math.abs(ry) / (s.ry * 1.08)));
            contrib = s.amp * Math.pow(block, 0.85);
          }

          h[y * n + x] += contrib * warp;
        }
      }
    }

    const phaseA = rng.range(0, Math.PI * 2);
    const phaseB = rng.range(0, Math.PI * 2);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const wave = Math.sin(x * 0.05 + phaseA) * Math.cos(y * 0.055 + phaseB) * 0.07 + Math.sin((x + y) * 0.03 + phaseB) * 0.04;
        h[i] += wave + rng.range(-0.02, 0.02);
      }
    }

    const seaLevel = 0.17;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (h[i] <= seaLevel) continue;
        let local = h[i] - seaLevel;
        const plateau = 0.34 + 0.1 * Math.sin(x * 0.045 + phaseA) * Math.cos(y * 0.042 + phaseB);
        local = Math.min(local, plateau + local * 0.25);
        const terraceStep = 0.045 + 0.015 * (0.5 + 0.5 * Math.sin((x + y) * 0.035 + phaseA));
        local = Math.max(0, Math.floor(local / terraceStep) * terraceStep);
        local -= Math.max(0, Math.sin(x * 0.09 + phaseB) * Math.cos(y * 0.08 + phaseA)) * 0.012;
        h[i] = seaLevel + Math.max(0, local);
      }
    }

    const mask = new Uint8Array(h.length);
    for (let i = 0; i < h.length; i++) mask[i] = h[i] > 0.18 ? 1 : 0;

    let islands = countIslands(mask, n).filter((isl) => isl.length >= CONFIG.minIslandCells);
    if (islands.length < CONFIG.minIslands) {
      retry++;
      continue;
    }
    if (islands[0].length < n * n * 0.025) {
      retry++;
      continue;
    }
    if (islands[0].length > n * n * CONFIG.maxIslandShare) {
      retry++;
      continue;
    }

    const cleanMask = new Uint8Array(mask.length);
    for (const isl of islands) for (const cell of isl) cleanMask[cell] = 1;

    const toWorld = (cell) => {
      const x = cell % n;
      const y = Math.floor(cell / n);
      return { x: (x / (n - 1) - 0.5) * size, z: (y / (n - 1) - 0.5) * size };
    };

    const usedNames = new Set();
    const islandInfos = islands.map((cells, index) => {
      let sx = 0;
      let sy = 0;
      for (const c of cells) {
        sx += c % n;
        sy += Math.floor(c / n);
      }
      const cx = sx / cells.length;
      const cy = sy / cells.length;
      const cxCell = Math.max(0, Math.min(n - 1, Math.round(cx)));
      const cyCell = Math.max(0, Math.min(n - 1, Math.round(cy)));
      const center = toWorld(cyCell * n + cxCell);
      return {
        id: `isle-${index}`,
        name: makeIslandName(index, rng, usedNames),
        cells,
        center,
      };
    });

    const center = { x: 0, z: 0 };
    let baseIsland = islandInfos[0];
    let best = Infinity;
    for (const island of islandInfos.slice(0, 12)) {
      if (island.cells.length < 50) continue;
      const d = (island.center.x - center.x) ** 2 + (island.center.z - center.z) ** 2;
      if (d < best) {
        best = d;
        baseIsland = island;
      }
    }

    const pickOnIsland = (island) => toWorld(island.cells[rng.int(0, island.cells.length - 1)]);
    const basePos = pickOnIsland(baseIsland);

    const islandsNoBase = islandInfos.filter((island) => island !== baseIsland);
    if (islandsNoBase.length < CONFIG.crateCount) {
      retry++;
      continue;
    }

    const crateCandidates = islandsNoBase.slice(0, Math.min(islandsNoBase.length, 20));
    shuffleInPlace(crateCandidates, rng);
    const crates = [];
    for (let i = 0; i < CONFIG.crateCount; i++) {
      const island = crateCandidates[i];
      crates.push({
        id: `crate-${i}`,
        islandId: island.id,
        islandName: island.name,
        ...pickOnIsland(island),
        collected: false,
      });
    }

    const refugees = [];
    const refugeeCount = rng.int(...CONFIG.refugeeRange);
    for (let i = 0; i < refugeeCount; i++) {
      const island = islandsNoBase[rng.int(0, islandsNoBase.length - 1)];
      refugees.push({ id: `ref-${i}`, islandId: island.id, ...pickOnIsland(island), saved: false });
    }

    const helipads = [{ id: 'base', islandId: baseIsland.id, islandName: baseIsland.name, ...basePos }];
    const pads = rng.int(...CONFIG.helipadRange);
    for (let i = 1; i < pads; i++) {
      const island = islandsNoBase[rng.int(0, islandsNoBase.length - 1)];
      helipads.push({ id: `pad-${i}`, islandId: island.id, islandName: island.name, ...pickOnIsland(island) });
    }

    const occluders = [];
    for (let i = 0; i < 105; i++) {
      const island = islandInfos[rng.int(0, Math.min(15, islandInfos.length - 1))];
      const p = pickOnIsland(island);
      occluders.push({ ...p, r: rng.range(1, 2.6), h: rng.range(2, 8) });
    }

    const cyclonePath = {
      centerX: rng.range(-70, 70),
      centerZ: rng.range(-70, 70),
      radX: rng.range(95, 155),
      radZ: rng.range(80, 140),
      phase: rng.range(0, Math.PI * 2),
    };

    islands = islandInfos.map((island) => island.cells);
    return {
      seedText,
      n,
      size,
      h,
      mask: cleanMask,
      islands,
      islandInfos,
      basePos,
      baseIslandName: baseIsland.name,
      crates,
      refugees,
      helipads,
      occluders,
      cyclonePath,
    };
  }

  throw new Error('Failed to generate suitable archipelago');
}
