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
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
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
