import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config.js';

export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#82E1F2');
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fovDeg, 1, 0.1, 1000);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 0.95));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(30, 60, -20);
    this.scene.add(dir);
  }
  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
