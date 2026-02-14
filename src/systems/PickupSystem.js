import { CONFIG } from '../config.js';
import { circleHit } from '../world/Collision.js';

export class PickupSystem {
  update(state, dt) {
    if (state.pickupTimer > 0) state.pickupTimer -= dt;
    state.refueling = false;

    const clearance = state.heli.alt - state.heli.groundY;
    const low = clearance <= CONFIG.pickupAlt;
    if (!low || !state.heli.onLand) return;

    if (state.pickupTimer <= 0) {
      for (const c of state.world.crates) {
        if (!c.collected && circleHit(state.heli.pos.x, state.heli.pos.z, 2.8, c.x, c.z, 2.4)) {
          c.collected = true; state.cratesCollected++; state.score += 500; state.pickupTimer = 1.1; return;
        }
      }
      for (const r of state.world.refugees) {
        if (!r.saved && circleHit(state.heli.pos.x, state.heli.pos.z, 2.8, r.x, r.z, 2.2)) {
          r.saved = true; state.refugeesSaved++; state.score += 80; state.pickupTimer = 0.8; return;
        }
      }
    }

    for (const pad of state.world.helipads) {
      if (circleHit(state.heli.pos.x, state.heli.pos.z, 2.6, pad.x, pad.z, 3.2) && clearance <= CONFIG.landingAlt) {
        state.refueling = state.fuel < CONFIG.fuelMax;
        state.fuel = Math.min(CONFIG.fuelMax, state.fuel + dt * CONFIG.refuelPerSec);
        if (pad.id === 'base' && state.cratesCollected >= CONFIG.crateCount) state.winRound = true;
        return;
      }
    }
  }
}
