import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config.js';

const v = new THREE.Vector3();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class HelicopterSystem {
  constructor() {
    this.locks = { up: false, down: false };
  }

  update(state, input, dt) {
    const prevAlt = state.heli.alt;
    const maxPitch = (CONFIG.heliTilt?.maxPitchDeg || 12) * Math.PI / 180;
    const maxRoll = (CONFIG.heliTilt?.maxRollDeg || 14) * Math.PI / 180;
    const tiltBlend = 1 - Math.exp(-((CONFIG.heliTilt?.response || 8) * dt));
    const smoothTiltTo = (targetPitch, targetRoll) => {
      state.heli.visualPitch = (state.heli.visualPitch || 0) + (targetPitch - (state.heli.visualPitch || 0)) * tiltBlend;
      state.heli.visualRoll = (state.heli.visualRoll || 0) + (targetRoll - (state.heli.visualRoll || 0)) * tiltBlend;
    };

    if (state.heli.landed) {
      state.heli.speedLevel = 0;
      state.heli.speed = 0;
      state.heli.verticalSpeed = 0;
      state.heli.fallDistance = 0;
      state.heli.descentPauseTime = 0;
      smoothTiltTo(0, 0);
      if (input.down('KeyR')) state.heli.landed = false;
      else return;
    }

    const turnLeft = input.down('KeyA', 'ArrowLeft');
    const turnRight = input.down('KeyD', 'ArrowRight');
    const turnInput = (turnLeft ? 1 : 0) + (turnRight ? -1 : 0);
    if (turnInput !== 0) state.heli.heading += turnInput * (CONFIG.turnDegPerSec * Math.PI / 180) * dt;

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
    v.set(-Math.sin(state.heli.heading), 0, -Math.cos(state.heli.heading)).multiplyScalar(stepSpeed * dt);
    state.heli.pos.x += v.x;
    state.heli.pos.z += v.z;

    if (input.down('KeyR')) state.heli.alt += 12 * dt;
    if (input.down('KeyF')) state.heli.alt -= 12 * dt;
    state.heli.alt = Math.max(CONFIG.minAlt, Math.min(CONFIG.maxAlt, state.heli.alt));

    state.heli.speed = Math.abs(stepSpeed);
    state.heli.verticalSpeed = (state.heli.alt - prevAlt) / dt;
    const speedNorm = clamp(state.heli.speedLevel / CONFIG.speedLevels, -1, 1);
    smoothTiltTo(speedNorm * maxPitch, -turnInput * maxRoll);
    if (state.heli.verticalSpeed < -0.1) {
      state.heli.fallDistance = (state.heli.fallDistance || 0) + (-state.heli.verticalSpeed * dt);
      state.heli.descentPauseTime = 0;
    } else {
      state.heli.descentPauseTime = (state.heli.descentPauseTime || 0) + dt;
      if (state.heli.descentPauseTime >= 0.3) state.heli.fallDistance = 0;
      else state.heli.fallDistance = Math.max(0, (state.heli.fallDistance || 0) - dt * 6);
    }
    state.heli.boost = false;
  }
}
