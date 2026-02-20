import { CONFIG } from '../config.js';
import { circleHit } from '../world/Collision.js';

export class PickupSystem {
  getHookOffsetY(type) {
    return type === 'crate' ? 1.08 : 1.0;
  }

  getTargetBaseY(type, obj) {
    if (obj.baseY !== undefined) return obj.baseY;
    if (obj.groundY !== undefined) return obj.groundY + (type === 'crate' ? 0 : 0.62);
    return obj.y || 0;
  }

  setObjectPosition(type, obj, x, y, z) {
    obj.x = x;
    obj.z = z;
    obj.y = y;
    if (obj.mesh) obj.mesh.position.set(x, y, z);
  }

  getHookPos(type, obj) {
    const baseY = obj.y !== undefined ? obj.y : this.getTargetBaseY(type, obj);
    return {
      x: obj.x,
      y: baseY + this.getHookOffsetY(type),
      z: obj.z,
    };
  }

  isAvailable(type, obj) {
    return type === 'crate' ? !obj.collected : !obj.saved;
  }

  findTarget(state, anchor) {
    const maxR = CONFIG.rope.dropZoneRadius || CONFIG.rope.acquireRadius;
    const maxR2 = maxR * maxR;
    let best = null;
    let bestScore = Infinity;

    const test = (type, obj) => {
      if (!this.isAvailable(type, obj)) return;
      const dx = obj.x - anchor.x;
      const dz = obj.z - anchor.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > maxR2) return;
      const hook = this.getHookPos(type, obj);
      const dy = hook.y - anchor.y;
      const dist3 = Math.sqrt(d2 + dy * dy);
      if (dist3 > CONFIG.rope.maxLength + 0.8) return;
      const score = d2 + Math.abs(dy) * 0.2;
      if (score < bestScore) {
        bestScore = score;
        best = { type, obj };
      }
    };

    for (const c of state.world.crates) test('crate', c);
    for (const r of state.world.refugees) test('refugee', r);
    return best;
  }

  beginRetract(rope) {
    rope.phase = 'retracting';
    rope.target = null;
    rope.active = true;
  }

  update(state, dt) {
    if (state.pickupTimer > 0) state.pickupTimer -= dt;
    state.refueling = false;

    if (state.heli.landed && state.heli.onLand) {
      for (const pad of state.world.helipads) {
        if (circleHit(state.heli.pos.x, state.heli.pos.z, 2.4, pad.x, pad.z, 3.2)) {
          state.refueling = state.fuel < CONFIG.fuelMax;
          state.fuel = Math.min(CONFIG.fuelMax, state.fuel + dt * CONFIG.refuelPerSec);
          if (pad.id === 'base' && state.cratesCollected >= CONFIG.crateCount) state.winRound = true;
          break;
        }
      }
    }

    const rope = state.rope;
    if (!rope) return;

    const forwardX = -Math.sin(state.heli.heading);
    const forwardZ = -Math.cos(state.heli.heading);
    rope.anchor.x = state.heli.pos.x + forwardX * 0.34;
    rope.anchor.z = state.heli.pos.z + forwardZ * 0.34;
    rope.anchor.y = state.heli.alt - 0.42;

    if (state.heli.landed && rope.phase !== 'idle') {
      this.beginRetract(rope);
    }

    if (rope.phase === 'idle') {
      rope.active = false;
      rope.length = 0;
      rope.tip.x = rope.anchor.x;
      rope.tip.y = rope.anchor.y;
      rope.tip.z = rope.anchor.z;
      if (!state.heli.landed && state.pickupTimer <= 0) {
        const candidate = this.findTarget(state, rope.anchor);
        if (candidate) {
          rope.target = candidate;
          rope.phase = 'dropping';
          rope.active = true;
          rope.length = 0;
        }
      }
      return;
    }

    if (rope.phase === 'dropping') {
      const t = rope.target;
      if (!t || !this.isAvailable(t.type, t.obj)) {
        this.beginRetract(rope);
      } else {
        const dx = t.obj.x - rope.anchor.x;
        const dz = t.obj.z - rope.anchor.z;
        const maxDropR = CONFIG.rope.dropZoneRadius || CONFIG.rope.acquireRadius;
        if (dx * dx + dz * dz > (maxDropR * 1.45) ** 2) {
          this.beginRetract(rope);
        } else {
          rope.length = Math.min(CONFIG.rope.maxLength, rope.length + CONFIG.rope.dropSpeed * dt);
          rope.tip.x = rope.anchor.x;
          rope.tip.y = rope.anchor.y - rope.length;
          rope.tip.z = rope.anchor.z;

          const hook = this.getHookPos(t.type, t.obj);
          const horizontal = Math.hypot(hook.x - rope.tip.x, hook.z - rope.tip.z);
          const vertical = Math.abs(hook.y - rope.tip.y);
          const touchedY = rope.tip.y <= hook.y + CONFIG.rope.attachRadius * 0.7;
          if (horizontal <= CONFIG.rope.attachRadius * 1.25 && vertical <= CONFIG.rope.attachRadius * 1.4 && touchedY) {
            rope.phase = 'attached';
          } else if (rope.length >= CONFIG.rope.maxLength - 0.02) {
            // Keep rope deployed at max length while target stays in pickup zone.
            // Retracting only happens when heli leaves the zone or state changes.
            rope.length = CONFIG.rope.maxLength;
            rope.tip.y = rope.anchor.y - rope.length;
          }
        }
      }
    }

    if (rope.phase === 'attached') {
      const t = rope.target;
      if (!t || !this.isAvailable(t.type, t.obj)) {
        this.beginRetract(rope);
      } else {
        const currentY = t.obj.y !== undefined ? t.obj.y : this.getTargetBaseY(t.type, t.obj);
        const desiredY = rope.anchor.y - 0.3;
        const dy = desiredY - currentY;
        const yStep = Math.sign(dy) * Math.min(Math.abs(dy), CONFIG.rope.haulSpeed * dt);
        const ny = currentY + yStep;
        // Keep attached object directly under rope so rope remains vertical.
        this.setObjectPosition(t.type, t.obj, rope.anchor.x, ny, rope.anchor.z);

        const hook = this.getHookPos(t.type, t.obj);
        rope.tip.x = rope.anchor.x;
        rope.tip.y = hook.y;
        rope.tip.z = rope.anchor.z;
        rope.length = Math.abs(hook.y - rope.anchor.y);

        if (rope.length > CONFIG.rope.maxLength + 0.9) {
          const baseY = this.getTargetBaseY(t.type, t.obj);
          this.setObjectPosition(t.type, t.obj, t.obj.x, baseY, t.obj.z);
          this.beginRetract(rope);
        } else if (Math.abs(desiredY - ny) < 0.42) {
          if (t.type === 'crate') {
            t.obj.collected = true;
            state.cratesCollected++;
            state.score += 500;
            state.pickupTimer = 1.1;
          } else {
            t.obj.saved = true;
            state.refugeesSaved++;
            state.score += 80;
            state.pickupTimer = 0.8;
          }
          this.beginRetract(rope);
        }
      }
    }

    if (rope.phase === 'retracting') {
      rope.active = true;
      rope.tip.x = rope.anchor.x;
      rope.tip.z = rope.anchor.z;
      const dy = rope.anchor.y - rope.tip.y;
      if (Math.abs(dy) <= 0.08) {
        rope.phase = 'idle';
        rope.active = false;
        rope.length = 0;
        rope.tip.x = rope.anchor.x;
        rope.tip.y = rope.anchor.y;
        rope.tip.z = rope.anchor.z;
      } else {
        const step = Math.min(Math.abs(dy), CONFIG.rope.retractSpeed * dt);
        rope.tip.y += Math.sign(dy) * step;
        rope.length = Math.max(0, rope.length - CONFIG.rope.retractSpeed * dt);
      }
    }
  }
}
