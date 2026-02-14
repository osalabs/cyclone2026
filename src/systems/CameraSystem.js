import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config.js';

const tmp = new THREE.Vector3();
export class CameraSystem {
  update(state, renderer, input) {
    const wheel = input.consumeWheel();
    if (wheel !== 0) {
      state.cameraTiltDeg = Math.max(
        CONFIG.camera.minTiltDeg,
        Math.min(CONFIG.camera.maxTiltDeg, state.cameraTiltDeg - wheel * CONFIG.camera.tiltStepDeg),
      );
    }
    const tilt = state.cameraTiltDeg * Math.PI / 180;
    const viewSign = state.viewNorth ? 1 : -1;
    const target = state.heli.group.position;
    tmp.set(
      0,
      Math.sin(tilt) * state.cameraDist,
      Math.cos(tilt) * state.cameraDist * viewSign,
    ).add(target);
    renderer.camera.position.lerp(tmp, 0.12);
    renderer.camera.lookAt(target);
  }
}
