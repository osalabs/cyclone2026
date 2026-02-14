import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function createHelicopter() {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#c6a43b', roughness: 0.72, metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#7a6323', roughness: 0.8, metalness: 0.18 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#191919', roughness: 0.9 });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: '#7bc8de',
    transparent: true,
    opacity: 0.62,
    roughness: 0.35,
    metalness: 0.08,
  });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.62, 3.9, 12), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 0.08;

  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.6, 1.8), bodyMat);
  belly.position.set(0, -0.15, 0.1);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), bodyMat);
  nose.scale.set(1.06, 0.9, 1.1);
  nose.position.set(0, 0.11, 2.08);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), canopyMat);
  canopy.scale.set(1.2, 0.78, 1.05);
  canopy.position.set(0, 0.35, 1.6);

  const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 3.2), accentMat);
  tailBoom.position.set(0, 0.04, -3.0);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.9), accentMat);
  tailFin.position.set(0, 0.54, -4.45);

  const tailStab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.34), accentMat);
  tailStab.position.set(0, 0.1, -4.02);

  const skidGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.05, 8);
  const leftSkid = new THREE.Mesh(skidGeo, darkMat);
  leftSkid.rotation.x = Math.PI / 2;
  leftSkid.position.set(-0.62, -0.74, 0.05);
  const rightSkid = leftSkid.clone();
  rightSkid.position.x = 0.62;

  const strutGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8);
  const struts = [];
  for (const z of [0.88, -0.55]) {
    for (const x of [-0.4, 0.4]) {
      const st = new THREE.Mesh(strutGeo, darkMat);
      st.position.set(x, -0.45, z);
      st.rotation.z = x < 0 ? 0.22 : -0.22;
      struts.push(st);
    }
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 10), darkMat);
  mast.position.set(0, 0.95, 0.2);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 10), darkMat);
  hub.position.set(0, 1.16, 0.2);

  const rotor = new THREE.Group();
  rotor.position.set(0, 1.2, 0.2);
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.06, 0.23), darkMat);
  const bladeB = bladeA.clone();
  bladeB.rotation.y = Math.PI / 2;
  const bladeTipL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.18), accentMat);
  bladeTipL.position.x = 4.18;
  const bladeTipR = bladeTipL.clone();
  bladeTipR.position.x = -4.18;
  rotor.add(bladeA, bladeB, bladeTipL, bladeTipR);

  const tailRotorMount = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.35), darkMat);
  tailRotorMount.position.set(0, 0.18, -4.58);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0, 0.18, -4.78);
  const tBlade1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.045, 0.11), darkMat);
  const tBlade2 = tBlade1.clone();
  tBlade2.rotation.z = Math.PI / 2;
  tailRotor.add(tBlade1, tBlade2);

  g.add(
    fuselage,
    belly,
    nose,
    canopy,
    tailBoom,
    tailFin,
    tailStab,
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
