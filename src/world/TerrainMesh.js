import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function buildTerrain(world) {
  const geo = new THREE.PlaneGeometry(world.size, world.size, world.n - 1, world.n - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const y = world.h[i];
    pos.setY(i, y * 8);
    if (y < 0.18) colors.push(0.09, 0.34, 0.57);
    else if (y < 0.25) colors.push(0.86, 0.78, 0.48);
    else if (y < 0.38) colors.push(0.5, 0.86, 0.33);
    else if (y < 0.52) colors.push(0.38, 0.78, 0.27);
    else if (y < 0.7) colors.push(0.28, 0.67, 0.22);
    else colors.push(0.2, 0.56, 0.18);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
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
