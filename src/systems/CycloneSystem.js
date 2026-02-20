import { CONFIG } from '../config.js';

export class CycloneSystem {
  update(state, dt) {
    const c = state.cyclone;
    c.t += dt * (CONFIG.cyclone.baseSpeed + state.round * 0.35) * 0.075;
    const p = state.world.cyclonePath;
    c.x = p.centerX + Math.cos(c.t + p.phase) * (p.radX + state.round * 2);
    c.z = p.centerZ + Math.sin(c.t + p.phase * 0.7) * (p.radZ + state.round * 1.5);
    const d = Math.hypot(state.heli.pos.x - c.x, state.heli.pos.z - c.z);
    state.windForce = d < CONFIG.cyclone.far ? 1 - d / CONFIG.cyclone.far : 0;
    if (!c.jitterT) c.jitterT = 0;
    c.jitterT += dt;
    if (d < CONFIG.cyclone.mid && !state.heli.landed) {
      state.heli.pos.x += (Math.random() - 0.5) * state.windForce * 1.8;
      state.heli.pos.z += (Math.random() - 0.5) * state.windForce * 1.8;
    }
    if (d < CONFIG.cyclone.near && !state.heli.landed) {
      const nearForce = Math.max(0, 1 - d / CONFIG.cyclone.near);
      const yawJitter = Math.sin(c.jitterT * 24) * nearForce;
      state.heli.heading += yawJitter * 0.095;
      state.heli.pos.x += (Math.random() - 0.5) * (0.6 + nearForce * 2.1);
      state.heli.pos.z += (Math.random() - 0.5) * (0.6 + nearForce * 2.1);
      state.heli.alt = Math.max(CONFIG.minAlt, state.heli.alt - (6 + nearForce * 12) * dt);
      if (nearForce > 0.55 && Math.random() < dt * 5.5) {
        const impulse = Math.random() < 0.5 ? -1 : 1;
        state.heli.speedLevel = Math.max(-CONFIG.speedLevels, Math.min(CONFIG.speedLevels, state.heli.speedLevel + impulse));
      }
    }
  }
}
