import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const SEA = new THREE.Color('#82E1F2');
const SHORE = new THREE.Color('#F2E66A');
const LAND_LIGHT = new THREE.Color('#83DE5C');
const LAND_MAIN = new THREE.Color('#71D040');
const LAND_DARK = new THREE.Color('#5CB838');
const LAND_DEEP = new THREE.Color('#489C2E');

function sampleHeight(world, x, z) {
  const fx = (x / world.size + 0.5) * (world.n - 1);
  const fz = (z / world.size + 0.5) * (world.n - 1);
  const ix = Math.max(0, Math.min(world.n - 1, Math.round(fx)));
  const iz = Math.max(0, Math.min(world.n - 1, Math.round(fz)));
  return world.h[iz * world.n + ix];
}

function terrainColor(h) {
  if (h < 0.18) return [SEA.r, SEA.g, SEA.b];
  if (h < 0.205) return [SHORE.r, SHORE.g, SHORE.b];
  if (h < 0.33) return [LAND_LIGHT.r, LAND_LIGHT.g, LAND_LIGHT.b];
  if (h < 0.47) return [LAND_MAIN.r, LAND_MAIN.g, LAND_MAIN.b];
  if (h < 0.62) return [LAND_DARK.r, LAND_DARK.g, LAND_DARK.b];
  return [LAND_DEEP.r, LAND_DEEP.g, LAND_DEEP.b];
}

function seedNumber(seedText) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hash2(x, y, s) {
  const v = Math.sin((x * 127.1 + y * 311.7 + s * 0.013) * 12.9898) * 43758.5453123;
  return v - Math.floor(v);
}

function buildSeaWaves(world, seaY) {
  const seed = seedNumber(world.seedText || 'SEA');
  const n = world.n;
  const size = world.size;
  const transforms = [];
  const step = 4;
  const toWorld = (gx, gy) => ({
    x: (gx / (n - 1) - 0.5) * size,
    z: (gy / (n - 1) - 0.5) * size,
  });

  for (let y = 2; y < n - 2; y += step) {
    for (let x = 2; x < n - 2; x += step) {
      const i = y * n + x;
      if (world.mask[i]) continue;
      const r = hash2(x, y, seed);
      if (r > 0.24) continue;

      const jitterX = (hash2(x + 13, y + 5, seed) - 0.5) * step * 0.45;
      const jitterY = (hash2(x + 7, y + 17, seed) - 0.5) * step * 0.45;
      const p = toWorld(x + jitterX, y + jitterY);
      transforms.push({
        x: p.x,
        z: p.z,
        y: seaY + 0.032,
        w: 0.55 + hash2(x + 3, y + 9, seed) * 1.1,
        d: 0.08 + hash2(x + 21, y + 11, seed) * 0.08,
        rot: (hash2(x + 31, y + 27, seed) - 0.5) * 0.22,
      });
      if (r < 0.11) {
        transforms.push({
          x: p.x + (hash2(x + 2, y + 19, seed) - 0.5) * 0.9,
          z: p.z + (hash2(x + 8, y + 23, seed) - 0.5) * 0.6,
          y: seaY + 0.034,
          w: 0.38 + hash2(x + 16, y + 33, seed) * 0.5,
          d: 0.07,
          rot: (hash2(x + 41, y + 29, seed) - 0.5) * 0.16,
        });
      }
    }
  }

  if (!transforms.length) return null;
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: '#ecfbff',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    p.set(t.x, t.y, t.z);
    e.set(0, t.rot, 0);
    q.setFromEuler(e);
    s.set(t.w, 1, t.d);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.renderOrder = 4;
  return mesh;
}

export function buildTerrain(world) {
  const geo = new THREE.PlaneGeometry(world.size, world.size, world.n - 1, world.n - 1).toNonIndexed();
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const seaY = 0.18 * 8;
  const quantStep = 0.26;

  for (let i = 0; i < pos.count; i += 3) {
    let hAvg = 0;
    for (let v = 0; v < 3; v++) {
      const idx = i + v;
      const h = sampleHeight(world, pos.getX(idx), pos.getZ(idx));
      hAvg += h;
      const y = h < 0.18 ? seaY : Math.floor((h * 8) / quantStep) * quantStep;
      pos.setY(idx, y);
    }
    hAvg /= 3;
    const [r, g, b] = terrainColor(hAvg);
    for (let v = 0; v < 3; v++) {
      const c = (i + v) * 3;
      colors[c] = r;
      colors[c + 1] = g;
      colors[c + 2] = b;
    }
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const terrain = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  const group = new THREE.Group();
  group.add(terrain);
  const waves = buildSeaWaves(world, seaY);
  if (waves) group.add(waves);
  return group;
}

export function sampleGroundHeight(world, x, z) {
  const fx = (x / world.size + 0.5) * (world.n - 1);
  const fz = (z / world.size + 0.5) * (world.n - 1);
  const ix = Math.max(0, Math.min(world.n - 1, Math.round(fx)));
  const iz = Math.max(0, Math.min(world.n - 1, Math.round(fz)));
  return world.h[iz * world.n + ix] * 8;
}

export function isLand(world, x, z) {
  const fx = (x / world.size + 0.5) * (world.n - 1);
  const fz = (z / world.size + 0.5) * (world.n - 1);
  const ix = Math.max(0, Math.min(world.n - 1, Math.round(fx)));
  const iz = Math.max(0, Math.min(world.n - 1, Math.round(fz)));
  return world.mask[iz * world.n + ix] === 1;
}
