import { CONFIG } from '../config.js';
import { isLand, sampleGroundHeight } from '../world/TerrainMesh.js';

export class PhysicsSystem {
  update(state) {
    const { heli, world } = state;
    heli.pos.x = Math.max(-CONFIG.worldSize * 0.5, Math.min(CONFIG.worldSize * 0.5, heli.pos.x));
    heli.pos.z = Math.max(-CONFIG.worldSize * 0.5, Math.min(CONFIG.worldSize * 0.5, heli.pos.z));
    heli.groundY = sampleGroundHeight(world, heli.pos.x, heli.pos.z);
    heli.onLand = isLand(world, heli.pos.x, heli.pos.z);
    const clearance = heli.alt - heli.groundY;

    if (heli.landed) {
      if (!heli.onLand) {
        heli.landed = false;
      } else {
        heli.alt = heli.groundY + CONFIG.heliGroundClearance;
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
        heli.alt = heli.groundY + CONFIG.heliGroundClearance;
        heli.speedLevel = 0;
        heli.speed = 0;
        heli.verticalSpeed = 0;
        heli.fallDistance = 0;
        heli.descentPauseTime = 0;
      }
    }

    if (heli.alt <= 0.02 && !heli.landed && !state.crashReason) state.crashReason = 'Sea impact';
  }
}
