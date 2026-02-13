import { CONFIG } from '../config.js';

export class CycloneSystem {
  update(state, dt) {
    const c = state.cyclone;
    c.t += dt * (CONFIG.cyclone.baseSpeed + state.round * 0.6) * 0.1;
    const p = state.world.cyclonePath;
    c.x = p.centerX + Math.cos(c.t + p.phase) * (p.radX + state.round * 2);
    c.z = p.centerZ + Math.sin(c.t + p.phase * 0.7) * (p.radZ + state.round * 1.5);
    const d = Math.hypot(state.heli.pos.x - c.x, state.heli.pos.z - c.z);
    state.windForce = d < CONFIG.cyclone.far ? 1 - d / CONFIG.cyclone.far : 0;
    if (d < CONFIG.cyclone.mid) {
      state.heli.pos.x += (Math.random() - 0.5) * state.windForce * 1.8;
      state.heli.pos.z += (Math.random() - 0.5) * state.windForce * 1.8;
    }
    if (d < CONFIG.cyclone.near && !state.heli.landed) state.crashReason = 'Cyclone impact';
  }
}
