import { CONFIG } from '../config.js';

export class CycloneSystem {
  update(state, dt) {
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const c = state.cyclone;
    const p = state.world.cyclonePath;

    const pickTarget = (preferFar = false) => {
      const minJump = preferFar
        ? Math.max(58, Math.min(p.radX, p.radZ) * 0.55)
        : Math.max(34, Math.min(p.radX, p.radZ) * 0.3);
      let best = null;
      let bestD = -1;
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const rf = (preferFar ? 0.45 : 0.25) + Math.random() * 0.55;
        const tx = p.centerX + Math.cos(a) * p.radX * rf;
        const tz = p.centerZ + Math.sin(a) * p.radZ * rf;
        const d = Math.hypot(tx - c.x, tz - c.z);
        if (d > minJump) return { x: tx, z: tz, a };
        if (d > bestD) {
          bestD = d;
          best = { x: tx, z: tz, a };
        }
      }
      return best;
    };

    if (!c.initialized) {
      c.initialized = true;
      c.x = p.centerX + Math.cos(p.phase) * p.radX * 0.22;
      c.z = p.centerZ + Math.sin(p.phase * 0.7) * p.radZ * 0.22;
      c.vx = (Math.random() - 0.5) * 1.5;
      c.vz = (Math.random() - 0.5) * 1.5;
      c.pathAngle = Math.random() * Math.PI * 2;
      const t0 = pickTarget(true);
      c.targetX = t0?.x ?? p.centerX;
      c.targetZ = t0?.z ?? p.centerZ;
      c.targetTimer = 16 + Math.random() * 10;
    }

    c.t += dt;
    c.targetTimer -= dt;

    const toTargetX = c.targetX - c.x;
    const toTargetZ = c.targetZ - c.z;
    const toTargetD = Math.hypot(toTargetX, toTargetZ);
    if (c.targetTimer <= 0 || toTargetD < 18) {
      const next = pickTarget(true);
      if (next) {
        c.targetX = next.x;
        c.targetZ = next.z;
        c.pathAngle = next.a;
      }
      c.targetTimer = 14 + Math.random() * 12;
    }

    // Slower, large-area roaming via waypoint steering + slight swirl.
    const invD = 1 / Math.max(0.001, toTargetD);
    const dirX = toTargetX * invD;
    const dirZ = toTargetZ * invD;
    const accel = (CONFIG.cyclone.baseSpeed * 0.72 + state.round * 0.11) * 3.1;
    c.vx += dirX * accel * dt;
    c.vz += dirZ * accel * dt;
    const swirl = Math.sin(c.t * 0.92 + c.pathAngle) * 0.35;
    c.vx += -dirZ * swirl * dt;
    c.vz += dirX * swirl * dt;

    const dx = c.x - p.centerX;
    const dz = c.z - p.centerZ;
    const boundX = p.radX * 1.12;
    const boundZ = p.radZ * 1.12;
    if (Math.abs(dx) > boundX) c.vx += -Math.sign(dx) * (Math.abs(dx) - boundX) * 1.6 * dt;
    if (Math.abs(dz) > boundZ) c.vz += -Math.sign(dz) * (Math.abs(dz) - boundZ) * 1.6 * dt;

    const damping = Math.exp(-0.32 * dt);
    c.vx *= damping;
    c.vz *= damping;

    const maxSpeed = (CONFIG.cyclone.baseSpeed + state.round * 0.12) * 1.85;
    const speed = Math.hypot(c.vx, c.vz);
    if (speed > maxSpeed) {
      const inv = maxSpeed / speed;
      c.vx *= inv;
      c.vz *= inv;
    }

    c.x += c.vx * dt;
    c.z += c.vz * dt;

    const d = Math.hypot(state.heli.pos.x - c.x, state.heli.pos.z - c.z);
    state.windForce = d < CONFIG.cyclone.far ? 1 - d / CONFIG.cyclone.far : 0;
    state.cycloneAudio = { impact: 0, near: 0, core: 0 };
    if (!c.jitterT) c.jitterT = 0;
    c.jitterT += dt;
    if (!state.heli.landed && d < CONFIG.cyclone.mid) {
      const midForce = clamp01(1 - d / CONFIG.cyclone.mid);
      const nearForce = clamp01(1 - d / CONFIG.cyclone.near);
      const coreRadius = CONFIG.cyclone.near * 0.48;
      const coreForce = clamp01(1 - d / coreRadius);
      state.cycloneAudio = {
        impact: clamp01(midForce * 0.35 + nearForce * 0.7 + coreForce * 1.15),
        near: nearForce,
        core: coreForce,
      };
      const invDHeli = 1 / Math.max(0.001, d);
      const awayX = (state.heli.pos.x - c.x) * invDHeli;
      const awayZ = (state.heli.pos.z - c.z) * invDHeli;
      const swirlDir = Math.sin(c.t * 0.85 + c.pathAngle) >= 0 ? 1 : -1;
      const tangentX = -awayZ * swirlDir;
      const tangentZ = awayX * swirlDir;
      const orbitSpeed = 5 + midForce * 11 + coreForce * 18;
      const inwardSpeed = nearForce * 7 + coreForce * 24;
      const jitterKick = (2 + midForce * 8 + coreForce * 16) * dt;

      state.heli.pos.x += (tangentX * orbitSpeed - awayX * inwardSpeed) * dt + (Math.random() - 0.5) * jitterKick;
      state.heli.pos.z += (tangentZ * orbitSpeed - awayZ * inwardSpeed) * dt + (Math.random() - 0.5) * jitterKick;
      state.heli.heading += swirlDir * (midForce * 0.32 + nearForce * 0.65 + coreForce * 1.35) * dt;
      state.heli.heading += Math.sin(c.jitterT * (18 + coreForce * 20)) * (0.015 + nearForce * 0.05 + coreForce * 0.12);
      state.heli.alt = Math.max(
        CONFIG.minAlt,
        state.heli.alt - (3 + midForce * 8 + nearForce * 10 + coreForce * 26) * dt,
      );

      if (nearForce > 0.12 && Math.random() < dt * (3 + nearForce * 8 + coreForce * 18)) {
        const step = coreForce > 0.5 ? 2 : 1;
        const impulse = (Math.random() < 0.5 ? -1 : 1) * step;
        state.heli.speedLevel = Math.max(
          -CONFIG.speedLevels,
          Math.min(CONFIG.speedLevels, state.heli.speedLevel + impulse),
        );
      }
    }
  }
}
