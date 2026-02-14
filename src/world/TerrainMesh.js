import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function buildTerrain(world) {
  const geo = new THREE.PlaneGeometry(world.size, world.size, world.n - 1, world.n - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const y = world.h[i];
    pos.setY(i, y * 8);
    if (y < 0.41) colors.push(0.06, 0.38, 0.82);
    else if (y < 0.54) colors.push(0.9, 0.82, 0.58);
    else if (y < 0.84) colors.push(0.14, 0.72, 0.2);
    else colors.push(0.4, 0.4, 0.4);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
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
