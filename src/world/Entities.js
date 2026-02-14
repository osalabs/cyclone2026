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
