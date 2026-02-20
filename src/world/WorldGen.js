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
  while (retry < 300) {
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
    const landThreshold = 0.18;
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

    for (let i = 0; i < h.length; i++) {
      if (h[i] <= landThreshold) h[i] = seaLevel;
    }

    const mask = new Uint8Array(h.length);
    for (let i = 0; i < h.length; i++) mask[i] = h[i] > landThreshold ? 1 : 0;

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
    for (let i = 0; i < h.length; i++) {
      if (!cleanMask[i]) h[i] = seaLevel;
    }

    const toWorld = (cell) => {
      const x = cell % n;
      const y = Math.floor(cell / n);
      return { x: (x / (n - 1) - 0.5) * size, z: (y / (n - 1) - 0.5) * size };
    };
    const toCell = (x, z) => {
      const fx = (x / size + 0.5) * (n - 1);
      const fz = (z / size + 0.5) * (n - 1);
      return {
        cx: Math.max(0, Math.min(n - 1, Math.round(fx))),
        cz: Math.max(0, Math.min(n - 1, Math.round(fz))),
      };
    };
    const sampleWorldY = (x, z) => {
      const { cx, cz } = toCell(x, z);
      return h[cz * n + cx] * 8;
    };
    const isFlatArea = (x, z, radiusWorld = 3.2, maxDeltaY = 0.42) => {
      const { cx, cz } = toCell(x, z);
      const r = Math.max(1, Math.round((radiusWorld / size) * (n - 1)));
      let minY = Infinity;
      let maxY = -Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz > r * r) continue;
          const ix = cx + dx;
          const iz = cz + dz;
          if (ix < 0 || ix >= n || iz < 0 || iz >= n) return false;
          const idx = iz * n + ix;
          if (!cleanMask[idx]) return false;
          const y = h[idx] * 8;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (maxY - minY > maxDeltaY) return false;
        }
      }
      return true;
    };
    const sqDist = (ax, az, bx, bz) => {
      const dx = ax - bx;
      const dz = az - bz;
      return dx * dx + dz * dz;
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
    const pickOnIslandFiltered = (island, predicate, tries = 120) => {
      for (let i = 0; i < tries; i++) {
        const p = pickOnIsland(island);
        if (predicate(p)) return p;
      }
      return null;
    };
    const basePos = pickOnIslandFiltered(baseIsland, (p) => isFlatArea(p.x, p.z, 5.2, 0.26), 320)
      || pickOnIslandFiltered(baseIsland, (p) => isFlatArea(p.x, p.z, 4.4, 0.34), 220)
      || pickOnIsland(baseIsland);

    const islandsNoBase = islandInfos.filter((island) => island !== baseIsland);
    if (islandsNoBase.length < CONFIG.crateCount) {
      retry++;
      continue;
    }

    const houseTargetForIsland = (cells, isBase = false) => {
      let target = 0;
      if (cells < 70) target = 0; // tiny islands: no houses
      else if (cells < 120) target = 1;
      else if (cells < 200) target = 1 + (rng.next() < 0.35 ? 1 : 0);
      else if (cells < 320) target = 2 + (rng.next() < 0.45 ? 1 : 0);
      else target = 3 + (rng.next() < 0.55 ? 1 : 0);
      return isBase ? Math.max(2, target) : target;
    };

    const houseTargetByIsland = new Map();
    for (const island of islandInfos) {
      houseTargetByIsland.set(island.id, houseTargetForIsland(island.cells.length, island === baseIsland));
    }

    let helipads = [{ id: 'base', islandId: baseIsland.id, islandName: baseIsland.name, ...basePos }];
    const padsDesired = rng.int(...CONFIG.helipadRange);
    const padCandidates = islandsNoBase.filter((island) => (houseTargetByIsland.get(island.id) || 0) > 0 && island.cells.length >= 80);
    shuffleInPlace(padCandidates, rng);
    const selectedPadIslands = padCandidates.slice(0, Math.max(0, padsDesired - 1));
    let padId = 1;
    for (const island of selectedPadIslands) {
      const pos = pickOnIslandFiltered(
        island,
        (p) => isFlatArea(p.x, p.z, 4.3, 0.32)
          && helipads.every((hpad) => sqDist(p.x, p.z, hpad.x, hpad.z) > 30 * 30),
        170,
      ) || pickOnIslandFiltered(
        island,
        (p) => isFlatArea(p.x, p.z, 3.6, 0.42)
          && helipads.every((hpad) => sqDist(p.x, p.z, hpad.x, hpad.z) > 22 * 22),
        120,
      ) || pickOnIslandFiltered(
        island,
        (p) => helipads.every((hpad) => sqDist(p.x, p.z, hpad.x, hpad.z) > 20 * 20),
        80,
      );
      if (!pos) continue;
      helipads.push({ id: `pad-${padId++}`, islandId: island.id, islandName: island.name, ...pos });
    }

    const awayFromPads = (x, z, minDist = 9) => helipads.every((pad) => sqDist(x, z, pad.x, pad.z) > minDist * minDist);

    const crateCandidates = islandsNoBase.slice(0, Math.min(islandsNoBase.length, 24));
    shuffleInPlace(crateCandidates, rng);
    const crates = [];
    for (let i = 0; i < CONFIG.crateCount; i++) {
      const island = crateCandidates[i] || islandsNoBase[i % islandsNoBase.length];
      const pos = pickOnIslandFiltered(island, (p) => awayFromPads(p.x, p.z, 10) && isFlatArea(p.x, p.z, 2.4, 0.28), 210)
        || pickOnIslandFiltered(island, (p) => awayFromPads(p.x, p.z, 8) && isFlatArea(p.x, p.z, 2.0, 0.34), 160)
        || pickOnIslandFiltered(island, (p) => awayFromPads(p.x, p.z, 6), 90)
        || pickOnIsland(island);
      crates.push({
        id: `crate-${i}`,
        islandId: island.id,
        islandName: island.name,
        ...pos,
        collected: false,
      });
    }

    const refugees = [];
    const refugeeCount = rng.int(...CONFIG.refugeeRange);
    for (let i = 0; i < refugeeCount; i++) {
      const island = islandsNoBase[rng.int(0, islandsNoBase.length - 1)];
      const pos = pickOnIslandFiltered(island, (p) => awayFromPads(p.x, p.z, 8) && isFlatArea(p.x, p.z, 2.1, 0.3), 170)
        || pickOnIslandFiltered(island, (p) => awayFromPads(p.x, p.z, 6) && isFlatArea(p.x, p.z, 1.7, 0.38), 130)
        || pickOnIsland(island);
      refugees.push({
        id: `ref-${i}`,
        islandId: island.id,
        type: rng.next() < 0.5 ? 'man' : 'woman',
        ...pos,
        saved: false,
      });
    }

    const reservedPoints = [];
    const reserve = (x, z, r) => reservedPoints.push({ x, z, r });
    const isClear = (x, z, r) => reservedPoints.every((p) => sqDist(x, z, p.x, p.z) >= (r + p.r) * (r + p.r));
    const isBuildingFootprintFlat = (x, z, width, depth, rotY, maxDeltaY = 0.3) => {
      const c = Math.cos(rotY);
      const s = Math.sin(rotY);
      const halfW = width * 0.52 + 0.35;
      const halfD = depth * 0.52 + 0.35;
      const sx = Math.max(0.7, halfW / 2.5);
      const sz = Math.max(0.7, halfD / 2.5);
      let minY = Infinity;
      let maxY = -Infinity;
      for (let lz = -halfD; lz <= halfD + 0.001; lz += sz) {
        for (let lx = -halfW; lx <= halfW + 0.001; lx += sx) {
          const wx = x + lx * c - lz * s;
          const wz = z + lx * s + lz * c;
          const { cx, cz } = toCell(wx, wz);
          const idx = cz * n + cx;
          if (!cleanMask[idx]) return false;
          const y = h[idx] * 8;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (maxY - minY > maxDeltaY) return false;
        }
      }
      return true;
    };
    for (const pad of helipads) reserve(pad.x, pad.z, pad.id === 'base' ? 8.8 : 7.4);
    for (const crate of crates) reserve(crate.x, crate.z, 5.8);
    for (const ref of refugees) reserve(ref.x, ref.z, 4.9);

    const createBuildingSpec = (id, island, p, nearBase = false) => {
      const widthBlocks = rng.pick([2, 3, 4]);
      const width = 1.55 * widthBlocks + 0.7;
      const depth = 2.7 + rng.range(-0.08, 0.28);
      const bodyHeight = 2.8;
      const roofHeight = 0.9;
      const rotY = rng.pick([0, Math.PI]);
      const doorRange = Math.max(0, width * 0.3);
      const doorOffset = rng.range(-doorRange, doorRange);
      const windowCols = Math.max(2, widthBlocks + rng.int(0, 1));
      const groundY = sampleWorldY(p.x, p.z);
      return {
        id,
        islandId: island.id,
        x: p.x,
        z: p.z,
        groundY,
        widthBlocks,
        width,
        depth,
        bodyHeight,
        roofHeight,
        rotY,
        hasDoor: rng.next() < 0.75 || nearBase,
        doorOffset,
        windowCols,
      };
    };

    const buildings = [];
    const buildingsPerIsland = new Map();
    const addBuilding = (id, island, p, nearBase = false) => {
      const b = createBuildingSpec(id, island, p, nearBase);
      if (!isBuildingFootprintFlat(b.x, b.z, b.width, b.depth, b.rotY, 0.3)) return null;
      buildings.push(b);
      buildingsPerIsland.set(island.id, (buildingsPerIsland.get(island.id) || 0) + 1);
      reserve(p.x, p.z, Math.max(6.0, Math.max(b.width, b.depth) * 0.6));
      return b;
    };

    const baseBuildingRingMin = 10;
    const baseBuildingRingMax = 34;
    let baseFailed = false;
    for (let i = 0; i < 2; i++) {
      const p = pickOnIslandFiltered(
        baseIsland,
        (pt) => {
          const d2 = sqDist(pt.x, pt.z, basePos.x, basePos.z);
          return d2 >= baseBuildingRingMin * baseBuildingRingMin
            && d2 <= baseBuildingRingMax * baseBuildingRingMax
            && isFlatArea(pt.x, pt.z, 5.0, 0.24)
            && isClear(pt.x, pt.z, 6.4);
        },
        220,
      ) || pickOnIslandFiltered(
        baseIsland,
        (pt) => {
          const d2 = sqDist(pt.x, pt.z, basePos.x, basePos.z);
          return d2 >= 7 * 7 && d2 <= 42 * 42 && isFlatArea(pt.x, pt.z, 4.6, 0.3) && isClear(pt.x, pt.z, 5.6);
        },
        180,
      ) || pickOnIslandFiltered(baseIsland, (pt) => isFlatArea(pt.x, pt.z, 4.2, 0.36) && isClear(pt.x, pt.z, 5.0), 140);
      if (!p) {
        baseFailed = true;
        break;
      }
      addBuilding(`b-base-${i}`, baseIsland, p, true);
    }
    if (baseFailed || (buildingsPerIsland.get(baseIsland.id) || 0) < 2) {
      retry++;
      continue;
    }

    const islandsBySize = [...islandInfos].sort((a, b) => b.cells.length - a.cells.length);
    let bid = 0;
    for (const island of islandsBySize) {
      let needed = (houseTargetByIsland.get(island.id) || 0) - (buildingsPerIsland.get(island.id) || 0);
      if (needed <= 0) continue;
      const pad = helipads.find((hpad) => hpad.islandId === island.id);
      if (pad && needed > 0) {
        const nearPad = pickOnIslandFiltered(
          island,
          (pt) => {
            const d2 = sqDist(pt.x, pt.z, pad.x, pad.z);
            return d2 >= 8 * 8 && d2 <= 28 * 28 && isFlatArea(pt.x, pt.z, 4.6, 0.28) && isClear(pt.x, pt.z, 5.7);
          },
          180,
        );
        if (nearPad) {
          const b = addBuilding(`b-${bid++}`, island, nearPad, island === baseIsland);
          if (b) needed--;
        }
      }
      while (needed > 0) {
        const p = pickOnIslandFiltered(island, (pt) => isFlatArea(pt.x, pt.z, 4.4, 0.3) && isClear(pt.x, pt.z, 5.7), 190);
        if (!p) break;
        const b = addBuilding(`b-${bid++}`, island, p, island === baseIsland);
        if (b) needed--;
      }
    }

    // Helipads are allowed only on islands with at least one house.
    helipads = helipads.filter((pad) => (buildingsPerIsland.get(pad.islandId) || 0) > 0);
    if (!helipads.length || !helipads.some((p) => p.id === 'base')) {
      retry++;
      continue;
    }

    const trees = [];
    let treeId = 0;
    for (const island of islandInfos) {
      const density = Math.max(3, Math.floor(island.cells.length / rng.range(95, 145)));
      const target = Math.min(30, density + rng.int(2, 8) + (island.cells.length > 260 ? rng.int(2, 6) : 0));
      for (let t = 0; t < target; t++) {
        const p = pickOnIslandFiltered(
          island,
          (pt) => isClear(pt.x, pt.z, 2.4) && sqDist(pt.x, pt.z, basePos.x, basePos.z) > 8 * 8,
          130,
        );
        if (!p) continue;
        const kind = rng.next() < 0.5 ? 'pine' : 'broad';
        const scale = kind === 'pine' ? rng.range(0.85, 1.25) : rng.range(0.9, 1.2);
        const groundY = sampleWorldY(p.x, p.z);
        trees.push({
          id: `tree-${treeId++}`,
          islandId: island.id,
          kind,
          scale,
          x: p.x,
          z: p.z,
          groundY,
        });
        reserve(p.x, p.z, kind === 'pine' ? 1.7 : 2.1);
      }
    }

    const occluders = [];
    for (let i = 0; i < 105; i++) {
      const island = islandInfos[rng.int(0, Math.min(15, islandInfos.length - 1))];
      const p = pickOnIslandFiltered(island, (pt) => isClear(pt.x, pt.z, 2.9), 90);
      if (!p) continue;
      const rOcc = rng.range(1, 2.6);
      occluders.push({ ...p, r: rOcc, h: rng.range(2, 8) });
      reserve(p.x, p.z, rOcc + 1.2);
    }

    const obstacles = [];
    for (const b of buildings) {
      const topY = b.groundY + b.bodyHeight + b.roofHeight;
      const r = Math.max(b.width, b.depth) * 0.48;
      obstacles.push({ kind: 'building', id: b.id, x: b.x, z: b.z, r, topY });
    }
    for (const t of trees) {
      const r = (t.kind === 'pine' ? 0.58 : 0.86) * t.scale;
      const topY = t.groundY + (t.kind === 'pine' ? 4.2 : 3.6) * t.scale;
      obstacles.push({ kind: 'tree', id: t.id, x: t.x, z: t.z, r, topY });
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
      trees,
      buildings,
      obstacles,
      occluders,
      cyclonePath,
    };
  }

  throw new Error('Failed to generate suitable archipelago');
}
