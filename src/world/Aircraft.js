import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function createPlane() {
  const g = new THREE.Group();
  const flat = { flatShading: true };
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.82, metalness: 0.08, ...flat });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#d24d3c', roughness: 0.84, metalness: 0.08, ...flat });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1a2027', roughness: 0.92, metalness: 0.12, ...flat });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#5b7082',
    transparent: true,
    opacity: 0.92,
    roughness: 0.3,
    metalness: 0.08,
    ...flat,
  });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 5.4, 8), bodyMat);
  fuselage.rotation.z = Math.PI / 2;
  g.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 8), accentMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 3.1;
  g.add(nose);

  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.15, 8), accentMat);
  tailCone.rotation.z = Math.PI / 2;
  tailCone.position.x = -3.05;
  g.add(tailCone);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1, 0.48, 0.7), glassMat);
  canopy.position.set(0.55, 0.34, 0);
  g.add(canopy);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 5.9), accentMat);
  wing.position.set(0.22, 0.04, 0);
  g.add(wing);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 2.1), bodyMat);
  tailWing.position.set(-2.35, 0.22, 0);
  g.add(tailWing);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.1), accentMat);
  fin.position.set(-2.55, 0.62, 0);
  g.add(fin);

  const propeller = new THREE.Group();
  propeller.position.set(3.48, 0, 0);
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.08), darkMat);
  const bladeB = bladeA.clone();
  bladeB.rotation.x = Math.PI / 2;
  propeller.add(bladeA, bladeB);
  g.add(propeller);

  g.userData.propeller = propeller;
  return g;
}
