import { CONFIG } from '../config.js';
import { isLand, sampleGroundHeight } from '../world/TerrainMesh.js';

export class PhysicsSystem {
  update(state) {
    const { heli, world } = state;
    heli.pos.x = Math.max(-CONFIG.worldSize * 0.5, Math.min(CONFIG.worldSize * 0.5, heli.pos.x));
    heli.pos.z = Math.max(-CONFIG.worldSize * 0.5, Math.min(CONFIG.worldSize * 0.5, heli.pos.z));
    heli.groundY = sampleGroundHeight(world, heli.pos.x, heli.pos.z);
    heli.onLand = isLand(world, heli.pos.x, heli.pos.z);

    let surfaceY = heli.groundY;
    let padY = null;
    if (world.helipads?.length) {
      for (const pad of world.helipads) {
        const r = (pad.radius || 2.2) + 0.7;
        const dx = heli.pos.x - pad.x;
        const dz = heli.pos.z - pad.z;
        if (dx * dx + dz * dz > r * r) continue;
        const top = (pad.y ?? sampleGroundHeight(world, pad.x, pad.z)) + 0.26;
        if (top > surfaceY) {
          surfaceY = top;
          padY = top;
        }
      }
    }
    heli.surfaceY = surfaceY;
    heli.padY = padY;
    const clearance = heli.alt - surfaceY;

    if (heli.landed) {
      if (!heli.onLand) {
        heli.landed = false;
      } else {
        heli.alt = surfaceY + CONFIG.heliGroundClearance;
        heli.verticalSpeed = 0;
        heli.fallDistance = 0;
        heli.descentPauseTime = 0;
      }
    }

    if (!heli.landed && heli.onLand && clearance <= CONFIG.heliGroundClearance) {
      const impactV = Math.max(0, -heli.verticalSpeed);
      const hardLanding = impactV > CONFIG.safeLandingVSpeed && (heli.fallDistance || 0) >= CONFIG.hardLandingMinDrop;
      const horizontalImpact = heli.speed > CONFIG.safeLandingHSpeed && heli.verticalSpeed > -1.6;
      const risingImpact = heli.verticalSpeed > 1.2;
      if (hardLanding || horizontalImpact || risingImpact) {
        if (!state.crashReason) state.crashReason = hardLanding ? 'Hard landing' : 'Terrain collision';
      } else {
        heli.landed = true;
        heli.alt = surfaceY + CONFIG.heliGroundClearance;
        heli.speedLevel = 0;
        heli.speed = 0;
        heli.verticalSpeed = 0;
        heli.fallDistance = 0;
        heli.descentPauseTime = 0;
      }
    }

    if (!state.crashReason && world.obstacles?.length) {
      const heliR = 1.1;
      const heliBottom = heli.alt - CONFIG.heliGroundClearance;
      for (const o of world.obstacles) {
        const dx = heli.pos.x - o.x;
        const dz = heli.pos.z - o.z;
        const rr = heliR + o.r;
        if (dx * dx + dz * dz > rr * rr) continue;
        if (heliBottom <= o.topY - 0.04) {
          state.crashReason = o.kind === 'building' ? 'Building collision' : 'Tree collision';
          break;
        }
      }
    }

    if (heli.alt <= 0.02 && !heli.landed && !state.crashReason) state.crashReason = 'Sea impact';
  }
}
