import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function createHelicopter() {
  const g = new THREE.Group();
  const flat = { flatShading: true, side: THREE.DoubleSide };
  const redMat = new THREE.MeshStandardMaterial({ color: '#eb5347', roughness: 0.8, metalness: 0.08, ...flat });
  const redDarkMat = new THREE.MeshStandardMaterial({ color: '#d4473d', roughness: 0.84, metalness: 0.1, ...flat });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#f5f4ef', roughness: 0.68, metalness: 0.04, ...flat });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#14161a', roughness: 0.92, metalness: 0.12, ...flat });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#444c58', roughness: 0.72, metalness: 0.18, ...flat });
  const frontGlassMat = new THREE.MeshStandardMaterial({
    color: '#5b6572',
    transparent: true,
    opacity: 0.92,
    roughness: 0.22,
    metalness: 0.08,
    ...flat,
  });
  const sideGlassMat = new THREE.MeshStandardMaterial({ color: '#49515d', roughness: 0.4, metalness: 0.16, ...flat });

  const addMesh = (mesh, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(sx, sy, sz);
    g.add(mesh);
    return mesh;
  };

  const createLoftGeometry = (slices, radialSegments = 10) => {
    const positions = [];
    const indices = [];
    const ringSize = radialSegments;
    for (const slice of slices) {
      const cx = slice.x || 0;
      const cy = slice.y || 0;
      for (let i = 0; i < radialSegments; i++) {
        const a = (i / radialSegments) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const rx = Math.sign(ca) * Math.pow(Math.abs(ca), 1.16) * (slice.w * 0.5);
        const ry = Math.sign(sa) * Math.pow(Math.abs(sa), 1.05) * (slice.h * 0.5);
        positions.push(cx + rx, cy + ry, slice.z);
      }
    }

    for (let s = 0; s < slices.length - 1; s++) {
      const curr = s * ringSize;
      const next = (s + 1) * ringSize;
      for (let i = 0; i < radialSegments; i++) {
        const a = curr + i;
        const b = curr + ((i + 1) % radialSegments);
        const c = next + i;
        const d = next + ((i + 1) % radialSegments);
        indices.push(a, c, b, b, c, d);
      }
    }

    const firstCenterIndex = positions.length / 3;
    positions.push(slices[0].x || 0, slices[0].y || 0, slices[0].z);
    for (let i = 0; i < radialSegments; i++) {
      const a = i;
      const b = (i + 1) % radialSegments;
      indices.push(firstCenterIndex, b, a);
    }

    const last = slices.length - 1;
    const lastStart = last * ringSize;
    const lastCenterIndex = positions.length / 3;
    positions.push(slices[last].x || 0, slices[last].y || 0, slices[last].z);
    for (let i = 0; i < radialSegments; i++) {
      const a = lastStart + i;
      const b = lastStart + ((i + 1) % radialSegments);
      indices.push(lastCenterIndex, a, b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const addLink = (start, end, radius, material, radialSegments = 6) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const delta = new THREE.Vector3().subVectors(b, a);
    const len = delta.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, radialSegments), material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    g.add(mesh);
    return mesh;
  };

  const addSidePanel = (x, y, z, width, height, thickness = 0.016, material = sideGlassMat) =>
    addMesh(new THREE.Mesh(new THREE.BoxGeometry(thickness, height, width), material), x, y, z);

  const fuselage = new THREE.Mesh(createLoftGeometry([
    { z: -1.04, w: 0.46, h: 0.36, y: 0.14 },
    { z: -0.74, w: 0.84, h: 0.74, y: 0.1 },
    { z: -0.12, w: 1.18, h: 1.04, y: 0.06 },
    { z: 0.52, w: 1.36, h: 1.18, y: 0.05 },
    { z: 1.04, w: 1.42, h: 1.24, y: 0.06 },
    { z: 1.42, w: 1.24, h: 1.16, y: 0.04 },
    { z: 1.76, w: 0.96, h: 0.98, y: 0.02 },
    { z: 2.02, w: 0.6, h: 0.7, y: -0.01 },
    { z: 2.18, w: 0.22, h: 0.24, y: -0.02 },
  ], 12), redMat);
  g.add(fuselage);

  const underside = new THREE.Mesh(createLoftGeometry([
    { z: 0.08, w: 0.54, h: 0.1, y: -0.48 },
    { z: 0.6, w: 0.8, h: 0.18, y: -0.54 },
    { z: 1.1, w: 0.74, h: 0.18, y: -0.5 },
    { z: 1.5, w: 0.34, h: 0.08, y: -0.36 },
  ], 8), whiteMat);
  g.add(underside);

  const canopy = new THREE.Mesh(createLoftGeometry([
    { z: 0.0, w: 0.46, h: 0.1, y: 0.5 },
    { z: 0.34, w: 0.84, h: 0.24, y: 0.6 },
    { z: 0.74, w: 0.94, h: 0.34, y: 0.68 },
    { z: 1.08, w: 0.9, h: 0.34, y: 0.66 },
    { z: 1.34, w: 0.58, h: 0.12, y: 0.52 },
  ], 10), whiteMat);
  g.add(canopy);

  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.03), frontGlassMat), 0, 0.28, 1.98, -0.18, 0, 0);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.44, 0.24), frontGlassMat), -0.58, 0.23, 1.66, -0.08, -0.12, 0);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.44, 0.24), frontGlassMat), 0.58, 0.23, 1.66, -0.08, 0.12, 0);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), redDarkMat), 0, 0.23, 1.9, -0.14, 0, 0);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.05), redDarkMat), -0.3, 0.22, 1.78, -0.08, -0.24, -0.34);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.05), redDarkMat), 0.3, 0.22, 1.78, -0.08, 0.24, 0.34);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.18), redDarkMat), 0, 0.54, 1.22, -0.03, 0, 0);

  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.36, 0.34), sideGlassMat), -0.63, 0.15, 0.92, 0, 0, -0.12);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.36, 0.34), sideGlassMat), 0.63, 0.15, 0.92, 0, 0, 0.12);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.26, 0.18), sideGlassMat), -0.63, 0.15, 0.48);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.26, 0.18), sideGlassMat), 0.63, 0.15, 0.48);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.26, 0.18), sideGlassMat), -0.61, 0.15, 0.12);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.26, 0.18), sideGlassMat), 0.61, 0.15, 0.12);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.26, 0.18), sideGlassMat), -0.57, 0.15, -0.22);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.26, 0.18), sideGlassMat), 0.57, 0.15, -0.22);

  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 8), whiteMat), -0.24, 0.56, -0.12, Math.PI / 2, 0, 0);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 8), whiteMat), 0.24, 0.56, -0.12, Math.PI / 2, 0, 0);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), trimMat), -0.24, 0.56, -0.25, Math.PI / 2, 0, 0);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), trimMat), 0.24, 0.56, -0.25, Math.PI / 2, 0, 0);

  const tailRoot = new THREE.Mesh(createLoftGeometry([
    { z: -1.18, w: 0.38, h: 0.26, y: 0.16 },
    { z: -0.94, w: 0.54, h: 0.36, y: 0.14 },
  ], 8), redDarkMat);
  g.add(tailRoot);
  const tailBoom = new THREE.Mesh(createLoftGeometry([
    { z: -3.5, w: 0.08, h: 0.08, y: 0.26 },
    { z: -3.02, w: 0.11, h: 0.1, y: 0.24 },
    { z: -2.42, w: 0.16, h: 0.13, y: 0.22 },
    { z: -1.82, w: 0.24, h: 0.18, y: 0.19 },
    { z: -1.18, w: 0.38, h: 0.26, y: 0.16 },
  ], 8), redMat);
  g.add(tailBoom);
  const tailBand = new THREE.Mesh(createLoftGeometry([
    { z: -2.0, w: 0.18, h: 0.14, y: 0.2 },
    { z: -1.68, w: 0.28, h: 0.22, y: 0.18 },
    { z: -1.3, w: 0.42, h: 0.28, y: 0.16 },
  ], 8), whiteMat);
  g.add(tailBand);

  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.12), redMat), 0, 0.3, -3.06, 0, 0.02, 0);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.13), whiteMat), -0.31, 0.3, -3.06, 0, 0.02, 0);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.13), whiteMat), 0.31, 0.3, -3.06, 0, 0.02, 0);

  const rotor = new THREE.Group();
  rotor.position.set(0, 1.06, 0.38);
  g.add(rotor);
  const rotorBlades = [];
  const bladeGeo = new THREE.BoxGeometry(4.18, 0.04, 0.12);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = i * Math.PI * 0.5;
    const blade = new THREE.Mesh(bladeGeo, darkMat);
    blade.position.x = 2.09;
    arm.add(blade);
    rotor.add(arm);
    rotorBlades.push(blade);
  }

  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 8), darkMat), 0, 0.9, 0.38);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 8), darkMat), 0, 1.03, 0.38);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.07, 8), redDarkMat), 0, 1.1, 0.38);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0, 0.54, -3.62);
  const tBlade1 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.34, 0.05), darkMat);
  const tBlade2 = tBlade1.clone();
  tBlade2.rotation.x = Math.PI / 2;
  const tBlade3 = tBlade1.clone();
  tBlade3.rotation.z = Math.PI / 4;
  const tBlade4 = tBlade1.clone();
  tBlade4.rotation.z = -Math.PI / 4;
  tailRotor.add(tBlade1, tBlade2, tBlade3, tBlade4);
  g.add(tailRotor);

  for (const x of [-0.64, 0.64]) {
    addLink([x, -0.84, -0.68], [x, -0.84, 1.16], 0.044, darkMat, 8);
    addLink([x, -0.84, 1.16], [x * 0.9, -0.78, 1.54], 0.044, darkMat, 8);
    addLink([x * 0.9, -0.78, 1.54], [x * 0.82, -0.76, 1.7], 0.044, darkMat, 8);
    addLink([x, -0.84, -0.68], [x * 0.94, -0.81, -0.9], 0.044, darkMat, 8);
    addLink([x * 0.94, -0.81, -0.9], [x * 0.86, -0.8, -1.0], 0.044, darkMat, 8);

    addLink([x * 0.48, -0.24, 0.88], [x, -0.8, 0.88], 0.038, darkMat, 8);
    addLink([x * 0.4, -0.26, -0.02], [x, -0.81, -0.02], 0.038, darkMat, 8);
  }

  addLink([-0.28, -0.5, 0.88], [0.28, -0.5, 0.88], 0.034, darkMat, 8);
  addLink([-0.24, -0.52, -0.02], [0.24, -0.52, -0.02], 0.034, darkMat, 8);

  return {
    group: g,
    rotor,
    tailRotor,
    rotorBlades,
  };
}

export function createCylinderMarker(color, radius, height) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), new THREE.MeshStandardMaterial({ color }));
}

export function createCrate(size = 1) {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#a97634', roughness: 0.92 });
  const plankMat = new THREE.MeshStandardMaterial({ color: '#875823', roughness: 0.95 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#6f4218', roughness: 0.96 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8 * size, 1.35 * size, 1.8 * size), woodMat);
  base.position.y = 0.68 * size;
  g.add(base);

  const slatTopA = new THREE.Mesh(new THREE.BoxGeometry(1.55 * size, 0.08 * size, 0.22 * size), plankMat);
  slatTopA.position.set(0, 1.36 * size, -0.44 * size);
  const slatTopB = slatTopA.clone();
  slatTopB.position.z = 0.44 * size;
  g.add(slatTopA, slatTopB);

  const sideBandGeo = new THREE.BoxGeometry(0.14 * size, 0.94 * size, 0.14 * size);
  for (const sx of [-0.82, 0.82]) {
    for (const sz of [-0.82, 0.82]) {
      const band = new THREE.Mesh(sideBandGeo, edgeMat);
      band.position.set(sx * size, 0.7 * size, sz * size);
      g.add(band);
    }
  }

  return g;
}

export function createHelipadMarker(radius = 3, isBase = false) {
  const g = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({ color: isBase ? '#ffffff' : '#e7f3ff', roughness: 0.9, metalness: 0.02 });
  const ringMat = new THREE.MeshStandardMaterial({ color: '#2a3038', roughness: 0.85 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.26, 28), padMat);
  base.position.y = 0.13;
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.66, radius * 0.86, 28), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.27;

  const legL = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.18, 0.08, radius * 0.78), ringMat);
  const legR = legL.clone();
  legL.position.set(-radius * 0.22, 0.3, 0);
  legR.position.set(radius * 0.22, 0.3, 0);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.44, 0.08, radius * 0.14), ringMat);
  bar.position.set(0, 0.3, 0);

  g.add(base, ring, legL, legR, bar);
  return g;
}

export function createTree(kind = 'pine', scale = 1) {
  const g = new THREE.Group();
  const bend = new THREE.Group();
  g.add(bend);
  g.userData.bendNode = bend;
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6f4a2a', roughness: 0.95 });
  const leafMatA = new THREE.MeshStandardMaterial({ color: '#2e5e2d', roughness: 0.9 });
  const leafMatB = new THREE.MeshStandardMaterial({ color: '#84b63f', roughness: 0.88 });

  if (kind === 'broad') {
    const trunkH = 1.35 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.18 * scale, trunkH, 8), trunkMat);
    trunk.position.y = trunkH * 0.5;
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.9 * scale, 10, 8), leafMatA);
    canopy.position.set(0, trunkH + 0.72 * scale, 0);
    const canopy2 = new THREE.Mesh(new THREE.SphereGeometry(0.62 * scale, 9, 7), leafMatB);
    canopy2.position.set(0.45 * scale, trunkH + 0.56 * scale, 0.12 * scale);
    const canopy3 = canopy2.clone();
    canopy3.position.set(-0.42 * scale, trunkH + 0.62 * scale, -0.1 * scale);
    bend.add(trunk, canopy, canopy2, canopy3);
    return g;
  }

  const trunkH = 1.9 * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.16 * scale, trunkH, 8), trunkMat);
  trunk.position.y = trunkH * 0.5;
  const coneA = new THREE.Mesh(new THREE.ConeGeometry(0.6 * scale, 1.35 * scale, 8), leafMatA);
  coneA.position.y = trunkH + 0.5 * scale;
  const coneB = new THREE.Mesh(new THREE.ConeGeometry(0.5 * scale, 1.15 * scale, 8), leafMatB);
  coneB.position.y = trunkH + 1.08 * scale;
  const coneC = new THREE.Mesh(new THREE.ConeGeometry(0.38 * scale, 0.95 * scale, 8), leafMatA);
  coneC.position.y = trunkH + 1.58 * scale;
  bend.add(trunk, coneA, coneB, coneC);
  return g;
}

export function createBuilding(def = {}) {
  const g = new THREE.Group();
  const widthBlocks = def.widthBlocks || 3;
  const width = def.width || (1.55 * widthBlocks + 0.7);
  const depth = def.depth || 2.9;
  const bodyHeight = def.bodyHeight || 2.8;
  const roofHeight = def.roofHeight || 0.9;
  const hasDoor = def.hasDoor !== false;
  const doorOffset = def.doorOffset || 0;
  const windowCols = Math.max(2, def.windowCols || widthBlocks);

  const wallMat = new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.92 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#2f2f34', roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#c04234', roughness: 0.88 });
  const roofDarkMat = new THREE.MeshStandardMaterial({ color: '#8e2c22', roughness: 0.9 });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#4f3b2a', roughness: 0.9 });
  const windowMat = new THREE.MeshStandardMaterial({ color: '#191f2c', roughness: 0.5, metalness: 0.1 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyHeight, depth), wallMat);
  body.position.y = bodyHeight * 0.5;
  g.add(body);

  const roofHalfW = width * 0.58;
  const roofDepth = depth + 0.52;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-roofHalfW, 0);
  roofShape.lineTo(0, roofHeight);
  roofShape.lineTo(roofHalfW, 0);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: roofDepth,
    steps: 1,
    bevelEnabled: false,
  });
  roofGeo.translate(0, bodyHeight + 0.02, -roofDepth * 0.5);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.08, 0.08, roofDepth + 0.02), roofDarkMat);
  ridge.position.set(0, bodyHeight + roofHeight + 0.02, 0);
  g.add(roof, ridge);

  const sideZ = depth * 0.5 + 0.04;
  const sideX = width * 0.5 + 0.04;
  const windowY = [bodyHeight * 0.36, bodyHeight * 0.72];
  const frontSpan = Math.max(0.6, width * 0.78);
  const sideSpan = Math.max(0.38, depth * 0.54);
  const buildSlots = (count, span) => {
    if (count <= 1) return [0];
    const slots = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      slots.push(-span * 0.5 + t * span);
    }
    return slots;
  };

  let frontSlots = buildSlots(windowCols, frontSpan);
  if (windowCols === 2) frontSlots = [-frontSpan * 0.32, frontSpan * 0.32];
  const backSlots = [...frontSlots];
  const sideCols = depth >= 2.8 ? 2 : 1;
  const sideSlots = sideCols === 1 ? [0] : buildSlots(2, sideSpan);

  const addFrontWindow = (x, y, zDir = 1) => {
    const winW = Math.max(0.36, Math.min(0.62, width / (windowCols + 2)));
    const w = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.36, 0.1), windowMat);
    w.position.set(x, y, zDir * sideZ);
    g.add(w);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.08, 0.44, 0.03), trimMat);
    trim.position.set(x, y, zDir * (sideZ + 0.025));
    g.add(trim);
  };

  const addSideWindow = (xDir, y, z) => {
    const winW = Math.max(0.28, Math.min(0.46, depth / 4.8));
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, winW), windowMat);
    w.position.set(xDir * sideX, y, z);
    g.add(w);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.44, winW + 0.08), trimMat);
    trim.position.set(xDir * (sideX + 0.025), y, z);
    g.add(trim);
  };

  const doorWidth = 0.56;
  const doorHeight = 1.02;
  if (hasDoor) {
    const maxDoorX = Math.max(0, frontSpan * 0.5 - doorWidth * 0.7);
    const dx = Math.max(-maxDoorX, Math.min(maxDoorX, doorOffset));
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.1), doorMat);
    door.position.set(dx, doorHeight * 0.5, sideZ + 0.01);
    g.add(door);
    frontSlots = frontSlots.filter((x) => Math.abs(x - dx) > doorWidth * 0.95);
  }

  for (const y of windowY) {
    for (const x of frontSlots) addFrontWindow(x, y, 1);
    for (const x of backSlots) addFrontWindow(x, y, -1);
    for (const z of sideSlots) {
      addSideWindow(1, y, z);
      addSideWindow(-1, y, z);
    }
  }

  return g;
}

export function createRefugee(type = 'man') {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: '#f2c59d', roughness: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({ color: type === 'woman' ? '#5f3425' : '#2d2a28', roughness: 0.9 });
  const topMat = new THREE.MeshStandardMaterial({ color: type === 'woman' ? '#d85f7a' : '#4f8fcf', roughness: 0.88 });
  const legMat = new THREE.MeshStandardMaterial({ color: '#2c3340', roughness: 0.92 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.25), topMat);
  torso.position.y = 0.68;
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.23), topMat);
  pelvis.position.y = 0.36;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), skinMat);
  head.position.y = 1.09;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(type === 'woman' ? 0.2 : 0.18, 10, 8), hairMat);
  hair.position.y = type === 'woman' ? 1.13 : 1.14;
  hair.scale.set(1, type === 'woman' ? 0.78 : 0.62, 1);

  const armGeo = new THREE.BoxGeometry(0.1, 0.45, 0.1);
  const armL = new THREE.Mesh(armGeo, skinMat);
  const armR = armL.clone();
  armL.position.set(0, -0.22, 0);
  armR.position.set(0, -0.22, 0);
  const armLPivot = new THREE.Group();
  const armRPivot = new THREE.Group();
  armLPivot.position.set(-0.31, 0.88, 0);
  armRPivot.position.set(0.31, 0.88, 0);
  armLPivot.add(armL);
  armRPivot.add(armR);

  const legGeo = new THREE.BoxGeometry(0.12, 0.46, 0.12);
  const legL = new THREE.Mesh(legGeo, legMat);
  const legR = legL.clone();
  legL.position.set(-0.11, 0.12, 0);
  legR.position.set(0.11, 0.12, 0);

  const footGeo = new THREE.BoxGeometry(0.13, 0.06, 0.2);
  const footL = new THREE.Mesh(footGeo, legMat);
  const footR = footL.clone();
  footL.position.set(-0.11, -0.12, 0.03);
  footR.position.set(0.11, -0.12, 0.03);

  g.add(torso, pelvis, head, hair, armLPivot, armRPivot, legL, legR, footL, footR);
  g.userData.armLPivot = armLPivot;
  g.userData.armRPivot = armRPivot;
  return g;
}
