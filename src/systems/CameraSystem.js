import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config.js';

const tmp = new THREE.Vector3();
export class CameraSystem {
  update(state, renderer, input) {
    state.cameraDist = Math.max(CONFIG.camera.minDist, Math.min(CONFIG.camera.maxDist, state.cameraDist + input.consumeWheel() * 3));
    const yaw = (state.viewNorth ? CONFIG.camera.yawDeg : CONFIG.camera.yawDeg + 180) * Math.PI / 180;
    const pitch = CONFIG.camera.pitchDeg * Math.PI / 180;
    const target = state.heli.group.position;
    tmp.set(
      Math.cos(yaw) * Math.cos(pitch) * state.cameraDist,
      Math.sin(pitch) * state.cameraDist,
      Math.sin(yaw) * Math.cos(pitch) * state.cameraDist,
    ).add(target);
    renderer.camera.position.lerp(tmp, 0.12);
    renderer.camera.lookAt(target);
  }
}
