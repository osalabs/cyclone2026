import { CONFIG } from '../config.js';
import { RNG } from '../engine/RNG.js';
import { circleHit } from '../world/Collision.js';
import { createPlane } from '../world/Aircraft.js';

export class PlaneSystem {
  constructor(seed, scene) {
    this.rng = new RNG(seed + ':planes');
    this.scene = scene;
  }

  spawnPlane(state, edge, z) {
    const mesh = createPlane();
    const plane = {
      x: -edge,
      y: CONFIG.maxAlt,
      z,
      vx: this.rng.range(23, 35),
      r: CONFIG.plane?.collisionRadius || 3,
      mesh,
      phase: this.rng.range(0, Math.PI * 2),
    };
    mesh.position.set(plane.x, plane.y, plane.z);
    this.scene?.add(mesh);
    state.planes.push(plane);
  }

  update(state, dt) {
    const edge = state.world.size * 0.58;
    const zRange = state.world.size * 0.45;
    let nearestDist = Infinity;
    let nearestPlane = null;
    state.planeTimer -= dt;
    if (state.planeTimer <= 0) {
      state.planeTimer = this.rng.range(12, 25) / (1 + state.round * 0.1);
      const z = this.rng.range(-zRange, zRange);
      this.spawnPlane(state, edge, z);
    }
    state.planes = state.planes.filter((p) => {
      p.x += p.vx * dt;
      if (p.mesh) {
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.set(Math.sin(performance.now() * 0.0025 + p.phase) * 0.04, 0, -0.03, 'YXZ');
        const propeller = p.mesh.userData.propeller;
        if (propeller) propeller.rotation.x += dt * 38;
      }

      const planeAlt = p.y ?? CONFIG.maxAlt;
      const altitudeDanger = Math.abs(state.heli.alt - planeAlt) <= (CONFIG.plane?.altitudeBuffer || 1);
      if (
        !state.heli.landed
        && altitudeDanger
        && circleHit(state.heli.pos.x, state.heli.pos.z, 1.9, p.x, p.z, p.r)
      ) {
        state.crashReason = 'Aircraft collision';
      }

      const keep = p.x < edge;
      if (!keep && p.mesh) this.scene?.remove(p.mesh);
      if (keep) {
        const dx = p.x - state.heli.pos.x;
        const dz = p.z - state.heli.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPlane = { dist, relX: dx, relZ: dz, speed: p.vx };
        }
      }
      return keep;
    });
    state.nearestPlane = nearestPlane || { dist: Infinity, relX: 0, relZ: 0, speed: 0 };
  }
}
