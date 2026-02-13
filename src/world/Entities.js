import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function createHelicopter() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 4), new THREE.MeshStandardMaterial({ color: '#e8c64a' }));
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 2.5), new THREE.MeshStandardMaterial({ color: '#d9b03d' }));
  tail.position.set(0, 0, -3);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: '#1f1f1f' }));
  rotor.position.y = 0.8;
  g.add(body, tail, rotor);
  return { group: g, rotor };
}

export function createCylinderMarker(color, radius, height) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), new THREE.MeshStandardMaterial({ color }));
}
