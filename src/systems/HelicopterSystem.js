import { CONFIG } from '../config.js';

export class HelicopterSystem {
  update(state, input, dt) {
    const turn = (input.down('KeyD', 'ArrowRight') ? 1 : 0) - (input.down('KeyA', 'ArrowLeft') ? 1 : 0);
    state.heli.heading += turn * 1.7 * dt;

    if (input.down('KeyW', 'ArrowUp') && !state._wLock) {
      state._wLock = true;
      state.heli.speedLevel = Math.min(2, state.heli.speedLevel + 1);
    }
    if (!input.down('KeyW', 'ArrowUp')) state._wLock = false;

    if (input.down('KeyS', 'ArrowDown') && !state._sLock) {
      state._sLock = true;
      state.heli.speedLevel = Math.max(-2, state.heli.speedLevel - 1);
    }
    if (!input.down('KeyS', 'ArrowDown')) state._sLock = false;

    const level = CONFIG.speedLevels[state.heli.speedLevel + 2];
    state.heli.speed = level * CONFIG.moveSpeed;
    state.heli.pos.x += Math.sin(state.heli.heading) * state.heli.speed * dt;
    state.heli.pos.z += Math.cos(state.heli.heading) * state.heli.speed * dt;

    if (input.down('KeyR')) state.heli.alt += 12 * dt;
    if (input.down('KeyF')) state.heli.alt -= 12 * dt;
    state.heli.alt = Math.max(CONFIG.minAlt, Math.min(CONFIG.maxAlt, state.heli.alt));
    state.heli.boost = false;
  }
}
