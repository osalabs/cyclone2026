import { CONFIG } from '../config.js';
import { isLand, sampleGroundHeight } from '../world/TerrainMesh.js';

export class PhysicsSystem {
  update(state) {
    const { heli, world } = state;
    heli.pos.x = Math.max(-CONFIG.worldSize * 0.5, Math.min(CONFIG.worldSize * 0.5, heli.pos.x));
    heli.pos.z = Math.max(-CONFIG.worldSize * 0.5, Math.min(CONFIG.worldSize * 0.5, heli.pos.z));
    heli.groundY = sampleGroundHeight(world, heli.pos.x, heli.pos.z);
    heli.onLand = isLand(world, heli.pos.x, heli.pos.z);
  }
}
