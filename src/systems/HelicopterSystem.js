import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config.js';

const v = new THREE.Vector3();

export class HelicopterSystem {
  constructor() {
    this.locks = { up: false, down: false };
  }

  update(state, input, dt) {
    const turnLeft = input.down('KeyA', 'ArrowLeft');
    const turnRight = input.down('KeyD', 'ArrowRight');
    if (turnLeft) state.heli.heading -= (CONFIG.turnDegPerSec * Math.PI / 180) * dt;
    if (turnRight) state.heli.heading += (CONFIG.turnDegPerSec * Math.PI / 180) * dt;

    const speedUp = input.down('KeyW', 'ArrowUp');
    const speedDown = input.down('KeyS', 'ArrowDown');

    if (speedUp && !this.locks.up) {
      this.locks.up = true;
      state.heli.speedLevel = Math.min(CONFIG.speedLevels, state.heli.speedLevel + 1);
    }
    if (!speedUp) this.locks.up = false;

    if (speedDown && !this.locks.down) {
      this.locks.down = true;
      state.heli.speedLevel = Math.max(-CONFIG.speedLevels, state.heli.speedLevel - 1);
    }
    if (!speedDown) this.locks.down = false;

    const stepSpeed = state.heli.speedLevel * CONFIG.speedStep;
    v.set(Math.sin(state.heli.heading), 0, -Math.cos(state.heli.heading)).multiplyScalar(stepSpeed * dt);
    state.heli.pos.x += v.x;
    state.heli.pos.z += v.z;

    if (input.down('KeyR')) state.heli.alt += 12 * dt;
    if (input.down('KeyF')) state.heli.alt -= 12 * dt;
    state.heli.alt = Math.max(CONFIG.minAlt, Math.min(CONFIG.maxAlt, state.heli.alt));

    state.heli.speed = Math.abs(stepSpeed);
    state.heli.boost = false;
  }
}
