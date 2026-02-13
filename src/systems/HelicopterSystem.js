import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config.js';

const v = new THREE.Vector3();
export class HelicopterSystem {
  update(state, input, dt) {
    const axis = input.axis2D();
    const boost = input.down('ShiftLeft', 'ShiftRight');
    const speed = CONFIG.moveSpeed * (boost ? CONFIG.boostMult : 1);
    v.set(axis.x, 0, axis.y).normalize().multiplyScalar(speed * dt);
    state.heli.pos.x += v.x;
    state.heli.pos.z += v.z;
    if (input.down('KeyR')) state.heli.alt += 12 * dt;
    if (input.down('KeyF')) state.heli.alt -= 12 * dt;
    state.heli.alt = Math.max(CONFIG.minAlt, Math.min(CONFIG.maxAlt, state.heli.alt));
    state.heli.speed = speed * Math.hypot(axis.x, axis.y);
    state.heli.boost = boost;
  }
}
