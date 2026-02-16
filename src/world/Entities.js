import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function createHelicopter() {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#c6a43b', roughness: 0.72, metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#7a6323', roughness: 0.8, metalness: 0.18 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#191919', roughness: 0.9 });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: '#7bc8de',
    transparent: true,
    opacity: 0.52,
    roughness: 0.35,
    metalness: 0.08,
  });

  const cabinRear = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.8, 1.3), bodyMat);
  cabinRear.position.set(0, 0.02, 0.45);

  const cabinMid = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.72, 0.8), bodyMat);
  cabinMid.position.set(0, 0.03, 1.25);

  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.5, 0.82, 6), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.03, 1.9);

  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.2, 0.56), accentMat);
  chin.position.set(0, -0.34, 1.56);

  const roofFairing = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 0.9), accentMat);
  roofFairing.position.set(0, 0.5, 0.62);

  const engineDeck = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 0.6), accentMat);
  engineDeck.position.set(0, 0.36, -0.02);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.24, 0.3), canopyMat);
  windshield.position.set(0, 0.3, 1.5);

  const sideWindowL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.52), canopyMat);
  sideWindowL.position.set(-0.48, 0.24, 1.22);
  const sideWindowR = sideWindowL.clone();
  sideWindowR.position.x = 0.48;

  const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 2.45), accentMat);
  tailBoom.position.set(0, 0.09, -1.7);

  const skidGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.05, 8);
  const leftSkid = new THREE.Mesh(skidGeo, darkMat);
  leftSkid.rotation.x = Math.PI / 2;
  leftSkid.position.set(-0.58, -0.72, 0.38);
  const rightSkid = leftSkid.clone();
  rightSkid.position.x = 0.58;

  const strutGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8);
  const struts = [];
  for (const z of [0.84, -0.12]) {
    for (const x of [-0.38, 0.38]) {
      const st = new THREE.Mesh(strutGeo, darkMat);
      st.position.set(x, -0.45, z);
      st.rotation.z = x < 0 ? 0.22 : -0.22;
      struts.push(st);
    }
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 10), darkMat);
  mast.position.set(0, 0.86, 0.38);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 10), darkMat);
  hub.position.set(0, 1.05, 0.38);

  const rotor = new THREE.Group();
  rotor.position.set(0, 1.09, 0.38);
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.06, 0.23), darkMat);
  const bladeB = bladeA.clone();
  bladeB.rotation.y = Math.PI / 2;
  const bladeTipL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.18), accentMat);
  bladeTipL.position.x = 4.18;
  const bladeTipR = bladeTipL.clone();
  bladeTipR.position.x = -4.18;
  rotor.add(bladeA, bladeB, bladeTipL, bladeTipR);

  const tailRotorMount = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.35), darkMat);
  tailRotorMount.position.set(0, 0.22, -2.98);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0, 0.22, -3.16);
  const tBlade1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.045, 0.11), darkMat);
  const tBlade2 = tBlade1.clone();
  tBlade2.rotation.z = Math.PI / 2;
  tailRotor.add(tBlade1, tBlade2);

  g.add(
    cabinRear,
    cabinMid,
    nose,
    chin,
    roofFairing,
    engineDeck,
    windshield,
    sideWindowL,
    sideWindowR,
    tailBoom,
    leftSkid,
    rightSkid,
    mast,
    hub,
    rotor,
    tailRotorMount,
    tailRotor,
    ...struts,
  );

  return { group: g, rotor, tailRotor };
}

export function createCylinderMarker(color, radius, height) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), new THREE.MeshStandardMaterial({ color }));
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
    g.add(trunk, canopy, canopy2, canopy3);
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
  g.add(trunk, coneA, coneB, coneC);
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

  const roofW = width * 0.58;
  const roofGeo = new THREE.BoxGeometry(roofW, 0.2, depth + 0.34);
  const roofL = new THREE.Mesh(roofGeo, roofMat);
  const roofR = new THREE.Mesh(roofGeo, roofMat);
  roofL.position.set(-roofW * 0.26, bodyHeight + roofHeight * 0.5, 0);
  roofR.position.set(roofW * 0.26, bodyHeight + roofHeight * 0.5, 0);
  roofL.rotation.z = 0.34;
  roofR.rotation.z = -0.34;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.16, 0.12, depth + 0.34), roofDarkMat);
  ridge.position.set(0, bodyHeight + roofHeight * 0.86, 0);
  g.add(roofL, roofR, ridge);

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
