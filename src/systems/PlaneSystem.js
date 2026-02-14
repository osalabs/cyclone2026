import { RNG } from '../engine/RNG.js';
import { circleHit } from '../world/Collision.js';

export class PlaneSystem {
  constructor(seed) { this.rng = new RNG(seed + ':planes'); }
  update(state, dt) {
    const edge = state.world.size * 0.58;
    const zRange = state.world.size * 0.45;
    state.planeTimer -= dt;
    if (state.planeTimer <= 0) {
      state.planeTimer = this.rng.range(12, 25) / (1 + state.round * 0.1);
      const z = this.rng.range(-zRange, zRange);
      state.planes.push({ x: -edge, z, vx: this.rng.range(23, 35), r: 2.5 });
    }
    state.planes = state.planes.filter((p) => {
      p.x += p.vx * dt;
      if (!state.heli.landed && circleHit(state.heli.pos.x, state.heli.pos.z, 2, p.x, p.z, p.r) && state.heli.alt < 12) state.crashReason = 'Plane collision';
      return p.x < edge;
    });
  }
}
