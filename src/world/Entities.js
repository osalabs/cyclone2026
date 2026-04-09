import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function createHelicopter() {
  const g = new THREE.Group();
  const flat = { flatShading: true };
  const redMat = new THREE.MeshStandardMaterial({ color: '#df4b43', roughness: 0.8, metalness: 0.08, ...flat });
  const redDarkMat = new THREE.MeshStandardMaterial({ color: '#ba3935', roughness: 0.84, metalness: 0.1, ...flat });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.68, metalness: 0.04, ...flat });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.9, metalness: 0.12, ...flat });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#343b47', roughness: 0.72, metalness: 0.18, ...flat });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#dfeaf5',
    transparent: true,
    opacity: 0.82,
    roughness: 0.24,
    metalness: 0.08,
    ...flat,
  });
  const sideGlassMat = new THREE.MeshStandardMaterial({ color: '#48505e', roughness: 0.38, metalness: 0.18, ...flat });

  const addMesh = (mesh, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(sx, sy, sz);
    g.add(mesh);
    return mesh;
  };

  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.96, 2.34, 7), redMat), 0, -0.02, 0.5, Math.PI / 2, 0, 0, 1, 0.84, 1);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.44, 1.7), redMat), 0, 0.28, 0.6);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.18, 1.38), whiteMat), 0, 0.64, 0.58);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.18, 0.86), whiteMat), 0, 0.54, -0.04);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.76, 1.14, 6), redMat), 0, 0.02, 1.82, Math.PI / 2, 0, 0, 1, 0.84, 1);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.36, 1.56), redDarkMat), 0, -0.31, 0.38);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.22, 0.78), trimMat), 0, -0.4, 1.52);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 1.08), trimMat), 0, 0.16, 1.57, -0.28, 0, 0);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.28, 0.76), redDarkMat), 0, 0.08, -0.84);

  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.14), glassMat), 0, 0.29, 2.03, -0.32, 0, 0);
  const windshieldLeft = addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 0.14), glassMat), -0.31, 0.26, 1.86, -0.16, 0.62, 0);
  const windshieldRight = windshieldLeft.clone();
  windshieldRight.position.x = 0.31;
  windshieldRight.rotation.y = -0.62;
  g.add(windshieldRight);

  const sideWindowGeo = new THREE.BoxGeometry(0.08, 0.38, 0.58);
  const sideWindowFrontL = addMesh(new THREE.Mesh(sideWindowGeo, sideGlassMat), -0.72, 0.22, 1.16);
  const sideWindowFrontR = sideWindowFrontL.clone();
  sideWindowFrontR.position.x = 0.72;
  g.add(sideWindowFrontR);

  const cabinWindowGeo = new THREE.BoxGeometry(0.08, 0.31, 0.28);
  for (const z of [0.72, 0.26, -0.18]) {
    const leftWindow = addMesh(new THREE.Mesh(cabinWindowGeo, sideGlassMat), -0.78, 0.14, z);
    const rightWindow = leftWindow.clone();
    rightWindow.position.x = 0.78;
    g.add(rightWindow);
  }

  const doorGeo = new THREE.BoxGeometry(0.1, 0.44, 0.5);
  const doorLeft = addMesh(new THREE.Mesh(doorGeo, trimMat), -0.77, -0.11, 0.48);
  const doorRight = doorLeft.clone();
  doorRight.position.x = 0.77;
  g.add(doorRight);

  addMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 2.8, 6), redMat),
    0,
    0.16,
    -2.1,
    Math.PI / 2,
    0,
    0,
    1,
    0.82,
    1,
  );
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.58), whiteMat), 0, 0.16, -1.22);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.92, 0.96), redMat), 0, 0.67, -3.3);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.46), redDarkMat), 0, 1.11, -3.19, -0.18, 0, 0);
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.24), whiteMat), 0, 0.1, -3.02);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.44, 6), redDarkMat), 0, 0.16, -3.57, Math.PI / 2, 0, 0, 1, 0.82, 1);

  const skidGeo = new THREE.CylinderGeometry(0.055, 0.055, 3.18, 8);
  const skidFrontGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.46, 8);
  const skidBackGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.4, 8);
  for (const x of [-0.66, 0.66]) {
    addMesh(new THREE.Mesh(skidGeo, darkMat), x, -0.83, 0.24, Math.PI / 2, 0, 0);
    addMesh(new THREE.Mesh(skidFrontGeo, darkMat), x, -0.73, 1.79, Math.PI / 2 - 0.58, 0, 0);
    addMesh(new THREE.Mesh(skidBackGeo, darkMat), x, -0.82, -1.38, Math.PI / 2 + 0.35, 0, 0);
  }

  const strutGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.78, 8);
  for (const z of [0.98, -0.18]) {
    const leftStrut = addMesh(new THREE.Mesh(strutGeo, darkMat), -0.42, -0.46, z, 0, 0, 0.38);
    const rightStrut = leftStrut.clone();
    rightStrut.position.x = 0.42;
    rightStrut.rotation.z = -0.38;
    g.add(rightStrut);
  }

  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 8), darkMat), 0, 0.87, 0.34);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8), darkMat), 0, 1.04, 0.34);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.08, 8), redDarkMat), 0, 1.11, 0.34);

  const rotor = new THREE.Group();
  rotor.position.set(0, 1.1, 0.34);
  g.add(rotor);
  const rotorBlades = [];
  const bladeGeo = new THREE.BoxGeometry(4.1, 0.05, 0.17);
  const bladeTipGeo = new THREE.BoxGeometry(0.42, 0.05, 0.19);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = i * Math.PI * 0.5;
    const blade = new THREE.Mesh(bladeGeo, darkMat);
    blade.position.x = 2.05;
    const tip = new THREE.Mesh(bladeTipGeo, redDarkMat);
    tip.position.x = 4.16;
    arm.add(blade, tip);
    rotor.add(arm);
    rotorBlades.push(blade, tip);
  }

  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.24), trimMat), 0, 0.68, -3.33);
  addMesh(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 5, 10), whiteMat), 0, 0.68, -3.33, 0, Math.PI / 2, 0);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0, 0.68, -3.33);
  const tBlade1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.08), darkMat);
  const tBlade2 = tBlade1.clone();
  tBlade2.rotation.x = Math.PI / 2;
  const tBlade3 = tBlade1.clone();
  tBlade3.rotation.z = Math.PI / 4;
  const tBlade4 = tBlade1.clone();
  tBlade4.rotation.z = -Math.PI / 4;
  tailRotor.add(tBlade1, tBlade2, tBlade3, tBlade4);
  g.add(tailRotor);

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
  const windowY = [bodyHeight * 0.36, bodyHeight * 0.72];
  const span = Math.max(0.6, width * 0.78);
  let xSlots = [];
  for (let i = 0; i < windowCols; i++) {
    const t = windowCols === 1 ? 0.5 : i / (windowCols - 1);
    xSlots.push(-span * 0.5 + t * span);
  }
  if (windowCols === 2) xSlots = [-span * 0.32, span * 0.32];

  const doorWidth = 0.56;
  const doorHeight = 1.02;
  if (hasDoor) {
    const maxDoorX = Math.max(0, span * 0.5 - doorWidth * 0.7);
    const dx = Math.max(-maxDoorX, Math.min(maxDoorX, doorOffset));
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.1), doorMat);
    door.position.set(dx, doorHeight * 0.5, sideZ + 0.01);
    g.add(door);
    xSlots = xSlots.filter((x) => Math.abs(x - dx) > doorWidth * 0.95);
  }

  const winW = Math.max(0.36, Math.min(0.62, width / (windowCols + 2)));
  for (const y of windowY) {
    for (const x of xSlots) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.36, 0.1), windowMat);
      w.position.set(x, y, sideZ + 0.01);
      g.add(w);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.08, 0.44, 0.03), trimMat);
      trim.position.set(x, y, sideZ + 0.06);
      g.add(trim);
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
