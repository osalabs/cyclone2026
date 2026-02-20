import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG, GAME_NAME } from './config.js';
import { Renderer } from './engine/Renderer.js';
import { Input } from './engine/Input.js';
import { Time } from './engine/Time.js';
import { AudioSystem } from './engine/Audio.js';
import { generateWorld } from './world/WorldGen.js';
import { buildTerrain, sampleGroundHeight } from './world/TerrainMesh.js';
import {
  createHelicopter,
  createHelipadMarker,
  createTree,
  createBuilding,
  createCrate,
  createRefugee,
} from './world/Entities.js';
import { HelicopterSystem } from './systems/HelicopterSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { CycloneSystem } from './systems/CycloneSystem.js';
import { PlaneSystem } from './systems/PlaneSystem.js';
import { PickupSystem } from './systems/PickupSystem.js';
import { FuelTimeSystem } from './systems/FuelTimeSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { UISystem } from './systems/UISystem.js';
import { GameLoop } from './systems/GameLoop.js';
import { Screens } from './ui/Screens.js';
import { getHUDRefs } from './ui/HUD.js';
import { Minimap } from './ui/Minimap.js';

const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const input = new Input(window);
const audio = new AudioSystem();
const screens = new Screens();
const minimap = new Minimap(document.getElementById('minimap-canvas'));
const ui = new UISystem(getHUDRefs(), minimap);
const systems = {
  heli: new HelicopterSystem(),
  physics: new PhysicsSystem(),
  cyclone: new CycloneSystem(),
  pickup: new PickupSystem(),
  fuel: new FuelTimeSystem(),
  cam: new CameraSystem(),
};
let planeSystem;
let state;

const TWO_PI = Math.PI * 2;
const RENDER_SEA_Y = 0.18 * 8;
const RENDER_LAND_STEP_Y = 0.26;
const SHADOW_Y_OFFSET = 0.12;
const HELIPAD_TOP_OFFSET = 0.26;

function drawHeliShadowTexture(ctx, size, landed, rotorAngle = 0) {
  ctx.clearRect(0, 0, size, size);
  const u = size / 256;
  const cx = size * 0.5;
  const cy = size * 0.5;
  const s = 24 * u;

  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  // Match previous mesh-based body silhouette in rotor-local coordinates.
  // Old body shape z was centered around rotor z=0.34.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const p = (x, z) => [x * s, -(z - 0.34) * s];
  const [x0, y0] = p(-0.6, 1.2);
  const [cx1, cy1] = p(0, 1.55);
  const [x1, y1] = p(0.6, 1.2);
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx1, cy1, x1, y1);
  for (const pt of [
    p(0.72, 0.45),
    p(0.54, -0.18),
    p(0.2, -0.62),
    p(0.2, -2.28),
    p(-0.2, -2.28),
    p(-0.2, -0.62),
    p(-0.54, -0.18),
    p(-0.72, 0.45),
  ]) {
    ctx.lineTo(pt[0], pt[1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (landed) {
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    const bladeLength = 78 * u;
    const bladeWidth = 5 * u;
    const hubGap = 13 * u;
    for (let i = 0; i < 4; i++) {
      const a = rotorAngle + i * Math.PI * 0.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-a);
      ctx.fillRect(hubGap, -bladeWidth * 0.5, bladeLength, bladeWidth);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 8 * u, 0, TWO_PI);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    ctx.arc(cx, cy, 82 * u, 0, TWO_PI);
    ctx.fill();
  }
}

function createHeliShadow() {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 256;
  texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  drawHeliShadowTexture(ctx, texCanvas.width, true, 0);
  const texture = new THREE.CanvasTexture(texCanvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 9.2),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.order = 'YXZ';
  mesh.rotation.set(-Math.PI / 2, 0, 0, 'YXZ');
  mesh.renderOrder = -5;
  mesh.userData.ctx = ctx;
  mesh.userData.texSize = texCanvas.width;
  mesh.userData.texture = texture;
  mesh.userData.landedState = true;
  mesh.userData.rotorKey = 0;
  return mesh;
}

function updateHeliShadow(shadow, landed, rotorAngle) {
  const angle = ((rotorAngle % TWO_PI) + TWO_PI) % TWO_PI;
  if (!landed && shadow.userData.landedState === landed) return;
  if (landed) {
    drawHeliShadowTexture(shadow.userData.ctx, shadow.userData.texSize, true, angle);
    shadow.userData.texture.needsUpdate = true;
    shadow.userData.landedState = true;
    shadow.userData.rotorKey = angle;
    return;
  }
  if (shadow.userData.landedState === false) return;
  drawHeliShadowTexture(shadow.userData.ctx, shadow.userData.texSize, landed, rotorAngle);
  shadow.userData.texture.needsUpdate = true;
  shadow.userData.landedState = landed;
  shadow.userData.rotorKey = 0;
}

function createPickupRopeLine() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const mat = new THREE.LineBasicMaterial({
    color: '#121212',
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const line = new THREE.Line(geo, mat);
  line.visible = false;
  line.renderOrder = 14;
  return line;
}

function clearScene() {
  while (renderer.scene.children.length > 2) renderer.scene.remove(renderer.scene.children[2]);
}

function getPadSurfaceY(world, x, z) {
  if (!world?.helipads?.length) return sampleGroundHeight(world, x, z);
  let best = sampleGroundHeight(world, x, z);
  for (const pad of world.helipads) {
    const r = (pad.radius || 2.2) + 0.7;
    const dx = x - pad.x;
    const dz = z - pad.z;
    if (dx * dx + dz * dz > r * r) continue;
    const top = (pad.y ?? sampleGroundHeight(world, pad.x, pad.z)) + HELIPAD_TOP_OFFSET;
    if (top > best) best = top;
  }
  return best;
}

function getBaseSurfaceY(world) {
  const basePad = world?.helipads?.find((h) => h.id === 'base');
  if (!basePad) return sampleGroundHeight(world, world.basePos.x, world.basePos.z);
  return (basePad.y ?? sampleGroundHeight(world, basePad.x, basePad.z)) + HELIPAD_TOP_OFFSET;
}

function createHeliEntity() {
  const heliObj = createHelicopter();
  heliObj.group.rotation.order = 'YXZ';
  heliObj.group.renderOrder = 12;
  renderer.scene.add(heliObj.group);
  return heliObj;
}

function resetRope(stateRef) {
  if (!stateRef?.rope) return;
  stateRef.rope.phase = 'idle';
  stateRef.rope.target = null;
  stateRef.rope.active = false;
  stateRef.rope.length = 0;
  stateRef.rope.anchor.x = stateRef.heli.pos.x;
  stateRef.rope.anchor.y = stateRef.heli.alt - 0.42;
  stateRef.rope.anchor.z = stateRef.heli.pos.z;
  stateRef.rope.tip.x = stateRef.rope.anchor.x;
  stateRef.rope.tip.y = stateRef.rope.anchor.y;
  stateRef.rope.tip.z = stateRef.rope.anchor.z;
  if (stateRef.rope.line) stateRef.rope.line.visible = false;
}

function clearCrashDebris(stateRef) {
  if (!stateRef?.crashDebris?.length) {
    stateRef.crashDebris = [];
    return;
  }
  for (const mesh of stateRef.crashDebris) renderer.scene.remove(mesh);
  stateRef.crashDebris = [];
}

function spawnRotorDebris(stateRef) {
  stateRef.crashDebris = stateRef.crashDebris || [];
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.92 });
  const bladeGeo = new THREE.BoxGeometry(8.2, 0.06, 0.22);
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(
      stateRef.heli.pos.x + (Math.random() - 0.5) * 0.4,
      stateRef.heli.alt + 1.1,
      stateRef.heli.pos.z + (Math.random() - 0.5) * 0.4,
    );
    blade.rotation.y = stateRef.heli.heading + i * Math.PI * 0.5;
    blade.userData = {
      vx: (Math.random() - 0.5) * 10,
      vy: 6 + Math.random() * 4,
      vz: (Math.random() - 0.5) * 10,
      wx: (Math.random() - 0.5) * 8,
      wy: (Math.random() - 0.5) * 8,
      wz: (Math.random() - 0.5) * 8,
      settled: false,
    };
    renderer.scene.add(blade);
    stateRef.crashDebris.push(blade);
  }
}

function beginCrash(stateRef, reason) {
  if (stateRef.crashAnim?.active || stateRef.gameOver || stateRef.winRound) return;
  stateRef.crashReason = '';
  stateRef.inTransition = true;
  stateRef.winRound = false;
  stateRef.lives = Math.max(0, (stateRef.lives ?? CONFIG.livesMax) - 1);
  stateRef.heli.landed = false;
  stateRef.heli.speedLevel = 0;
  stateRef.heli.speed = 0;
  stateRef.heli.boost = false;
  resetRope(stateRef);

  const detachRotors = /collision/i.test(reason) || /Hard landing/i.test(reason);
  if (detachRotors) {
    for (const b of stateRef.heli.rotorBlades || []) b.visible = false;
    spawnRotorDebris(stateRef);
  }

  const backCrash = /Out of fuel/i.test(reason) || Math.random() < 0.35;
  stateRef.crashAnim = {
    active: true,
    cause: reason,
    timer: 0,
    duration: 2.15,
    detachRotors,
    startPitch: stateRef.heli.visualPitch || 0,
    startRoll: stateRef.heli.visualRoll || 0,
    targetPitch: backCrash ? -Math.PI * 0.82 : (Math.random() < 0.5 ? 0.22 : -0.2),
    targetRoll: backCrash ? (Math.random() < 0.5 ? 0.22 : -0.22) : (Math.random() < 0.5 ? -1.22 : 1.22),
    yawSpin: (Math.random() < 0.5 ? -1 : 1) * (backCrash ? 0.55 : 1.45),
    fallSpeed: Math.max(2.5, Math.max(0, -stateRef.heli.verticalSpeed) + 2),
  };
  screens.showOverlay(`CRASH: ${reason}`);
}

function updateCrashAnimation(stateRef, dt) {
  const anim = stateRef.crashAnim;
  if (!anim?.active) return;

  anim.timer += dt;
  anim.fallSpeed += 20 * dt;
  const crashSurface = getPadSurfaceY(stateRef.world, stateRef.heli.pos.x, stateRef.heli.pos.z);
  const settleAlt = crashSurface + 0.22;
  stateRef.heli.alt = Math.max(settleAlt, stateRef.heli.alt - anim.fallSpeed * dt);
  stateRef.heli.verticalSpeed = -anim.fallSpeed;

  const t = Math.min(1, anim.timer / (anim.duration * 0.72));
  const ease = 1 - Math.pow(1 - t, 3);
  stateRef.heli.visualPitch = anim.startPitch + (anim.targetPitch - anim.startPitch) * ease;
  stateRef.heli.visualRoll = anim.startRoll + (anim.targetRoll - anim.startRoll) * ease;
  stateRef.heli.heading += anim.yawSpin * dt * (1 - 0.35 * ease);

  if (anim.detachRotors && stateRef.crashDebris?.length) {
    for (const d of stateRef.crashDebris) {
      const u = d.userData;
      if (u.settled) continue;
      u.vy -= 22 * dt;
      d.position.x += u.vx * dt;
      d.position.y += u.vy * dt;
      d.position.z += u.vz * dt;
      d.rotation.x += u.wx * dt;
      d.rotation.y += u.wy * dt;
      d.rotation.z += u.wz * dt;

      const floorY = sampleGroundHeight(stateRef.world, d.position.x, d.position.z) + 0.04;
      if (d.position.y <= floorY) {
        d.position.y = floorY;
        u.vy *= -0.22;
        u.vx *= 0.55;
        u.vz *= 0.55;
        u.wx *= 0.6;
        u.wy *= 0.6;
        u.wz *= 0.6;
        if (Math.abs(u.vy) < 0.4 && Math.hypot(u.vx, u.vz) < 0.5) u.settled = true;
      }
    }
  }

  if (anim.timer >= anim.duration && stateRef.heli.alt <= settleAlt + 0.01) {
    anim.active = false;
    stateRef.inTransition = false;
    if (stateRef.lives > 0) {
      clearCrashDebris(stateRef);
      respawnHeli(stateRef);
      screens.showOverlay('');
    } else {
      stateRef.gameOver = true;
    }
  }
}

function respawnHeli(stateRef) {
  const baseX = stateRef.world.basePos.x;
  const baseZ = stateRef.world.basePos.z;
  const baseSurfaceY = getBaseSurfaceY(stateRef.world);
  clearCrashDebris(stateRef);
  if (stateRef.heli?.group) renderer.scene.remove(stateRef.heli.group);
  const heliObj = createHeliEntity();
  stateRef.heli = {
    group: heliObj.group,
    rotor: heliObj.rotor,
    tailRotor: heliObj.tailRotor || null,
    rotorBlades: heliObj.rotorBlades || [],
    pos: { x: baseX, z: baseZ },
    heading: -Math.PI / 2,
    visualPitch: 0,
    visualRoll: 0,
    alt: baseSurfaceY + CONFIG.heliGroundClearance,
    speed: 0,
    speedLevel: 0,
    verticalSpeed: 0,
    fallDistance: 0,
    descentPauseTime: 0,
    boost: false,
    onLand: true,
    landed: true,
    groundY: sampleGroundHeight(stateRef.world, baseX, baseZ),
    surfaceY: baseSurfaceY,
  };
  stateRef.shadowY = Math.floor(baseSurfaceY / RENDER_LAND_STEP_Y) * RENDER_LAND_STEP_Y + SHADOW_Y_OFFSET;
  stateRef.pickupTimer = 0;
  stateRef.refueling = true;
  stateRef.fuel = CONFIG.fuelMax;
  stateRef.crashAnim = null;
  resetRope(stateRef);
}

function setupRound(seedText, round = 1, carry = {}) {
  clearScene();
  const world = generateWorld(seedText, round);
  const baseGroundY = sampleGroundHeight(world, world.basePos.x, world.basePos.z);
  renderer.scene.add(buildTerrain(world));
  world.crates.forEach((c) => {
    const gy = sampleGroundHeight(world, c.x, c.z);
    c.groundY = gy;
    c.baseY = gy;
    c.y = gy;
    c.mesh = createCrate(1);
    c.mesh.position.set(c.x, gy, c.z);
    c.mesh.rotation.y = ((c.x + c.z) * 0.07) % (Math.PI * 2);
    renderer.scene.add(c.mesh);
  });
  world.refugees.forEach((r) => {
    const gy = sampleGroundHeight(world, r.x, r.z);
    r.groundY = gy;
    r.baseY = gy + 0.12;
    r.y = r.baseY;
    r.mesh = createRefugee(r.type || 'man');
    r.mesh.position.set(r.x, r.baseY, r.z);
    r.animT = 0;
    r.animPhase = ((r.x * 0.121 + r.z * 0.173) % 1) * TWO_PI;
    renderer.scene.add(r.mesh);
  });
  world.helipads.forEach((h) => {
    const radius = h.id === 'base' ? 3 : 2.2;
    const y = sampleGroundHeight(world, h.x, h.z);
    h.y = y;
    h.radius = radius;
    h.mesh = createHelipadMarker(radius, h.id === 'base');
    h.mesh.position.set(h.x, y, h.z);
    renderer.scene.add(h.mesh);
  });
  const baseSurfaceY = getBaseSurfaceY(world);
  if (world.trees) {
    world.trees.forEach((t) => {
      const tree = createTree(t.kind, t.scale);
      tree.position.set(t.x, t.groundY, t.z);
      renderer.scene.add(tree);
      t.mesh = tree;
      t.phase = ((t.x * 0.089 + t.z * 0.143) % 1) * TWO_PI;
    });
  }
  if (world.buildings) {
    world.buildings.forEach((b) => {
      const building = createBuilding(b);
      building.position.set(b.x, b.groundY, b.z);
      building.rotation.y = b.rotY || 0;
      renderer.scene.add(building);
      b.mesh = building;
    });
  }
  const occGeo = new THREE.CylinderGeometry(0.8, 1.2, 1, 8);
  const occMat = new THREE.MeshStandardMaterial({ color: '#2c2a2a', roughness: 1 });
  const occ = new THREE.InstancedMesh(occGeo, occMat, world.occluders.length);
  const m = new THREE.Matrix4();
  world.occluders.forEach((o, i) => {
    m.makeScale(o.r, o.h, o.r).setPosition(o.x, o.h * 0.5, o.z);
    occ.setMatrixAt(i, m);
  });
  renderer.scene.add(occ);

  const heliObj = createHeliEntity();
  const ropeLine = createPickupRopeLine();
  renderer.scene.add(ropeLine);
  const shadow = createHeliShadow();
  renderer.scene.add(shadow);
  const cycloneMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 10, 18, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: '#9b58ff', transparent: true, opacity: 0.35 }),
  );
  renderer.scene.add(cycloneMesh);

  state = {
    seedText,
    round,
    world,
    heli: {
      group: heliObj.group,
      rotor: heliObj.rotor,
      tailRotor: heliObj.tailRotor || null,
      rotorBlades: heliObj.rotorBlades || [],
      pos: { x: world.basePos.x, z: world.basePos.z },
      heading: -Math.PI / 2,
      visualPitch: 0,
      visualRoll: 0,
      alt: baseSurfaceY + CONFIG.heliGroundClearance,
      speed: 0,
      speedLevel: 0,
      verticalSpeed: 0,
      fallDistance: 0,
      descentPauseTime: 0,
      boost: false,
      onLand: true,
      landed: true,
      groundY: baseGroundY,
      surfaceY: baseSurfaceY,
    },
    shadow,
    shadowY: Math.floor(baseSurfaceY / RENDER_LAND_STEP_Y) * RENDER_LAND_STEP_Y + SHADOW_Y_OFFSET,
    cycloneMesh,
    cyclone: { x: 0, z: 0, t: 0 },
    planes: [],
    planeTimer: 7,
    fuel: 0,
    timeLeft: CONFIG.timeLimitSec,
    cratesCollected: 0,
    refugeesSaved: 0,
    score: carry.score ?? 0,
    hudCratesVisible: 0,
    startup: {
      cratesTimer: CONFIG.startupCrateInterval,
      fuelTickTimer: CONFIG.startupFuelTickInterval,
    },
    pickupTimer: 0,
    rope: {
      line: ropeLine,
      active: false,
      phase: 'idle',
      length: 0,
      target: null,
      anchor: { x: world.basePos.x, y: baseSurfaceY + 2, z: world.basePos.z },
      tip: { x: world.basePos.x, y: baseSurfaceY + 2, z: world.basePos.z },
    },
    refueling: false,
    windForce: 0,
    viewNorth: carry.viewNorth ?? true,
    cameraTiltDeg: carry.cameraTiltDeg ?? CONFIG.camera.tiltDeg,
    cameraDist: CONFIG.camera.dist,
    crashReason: '',
    gameOver: false,
    winRound: false,
    paused: false,
    inTransition: false,
    crashAnim: null,
    crashDebris: [],
    livesMax: carry.livesMax ?? CONFIG.livesMax,
    lives: Math.max(
      0,
      Math.min(carry.livesMax ?? CONFIG.livesMax, carry.lives ?? carry.livesMax ?? CONFIG.livesMax),
    ),
  };
  planeSystem = new PlaneSystem(seedText);
}

function updateStartupEffects(dt) {
  if (state.hudCratesVisible < CONFIG.crateCount) {
    state.startup.cratesTimer -= dt;
    if (state.startup.cratesTimer <= 0) {
      state.hudCratesVisible = Math.min(CONFIG.crateCount, state.hudCratesVisible + 1);
      audio.play('drop');
      state.startup.cratesTimer = CONFIG.startupCrateInterval;
    }
  }

  if (state.refueling && state.fuel < CONFIG.fuelMax) {
    state.startup.fuelTickTimer -= dt;
    if (state.startup.fuelTickTimer <= 0) {
      audio.play('tick');
      state.startup.fuelTickTimer = CONFIG.startupFuelTickInterval;
    }
  } else {
    state.startup.fuelTickTimer = CONFIG.startupFuelTickInterval;
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function updateTreeBend(stateRef, dt) {
  const trees = stateRef.world.trees;
  if (!trees?.length) return;
  const blend = 1 - Math.exp(-7 * dt);
  const windRadius = CONFIG.cyclone.far * 2.2;
  const timePhase = stateRef.cyclone.t * 3.4;
  for (const tree of trees) {
    const bend = tree.mesh?.userData?.bendNode;
    if (!bend) continue;
    const dx = tree.x - stateRef.cyclone.x;
    const dz = tree.z - stateRef.cyclone.z;
    const d = Math.hypot(dx, dz);
    const localWind = clamp01(1 - d / windRadius);
    const maxBend = (tree.kind === 'pine' ? 0.68 : 0.5) * localWind;
    if (maxBend <= 0.001) {
      bend.rotation.x += (0 - bend.rotation.x) * blend;
      bend.rotation.z += (0 - bend.rotation.z) * blend;
      continue;
    }
    const inv = 1 / Math.max(0.001, d);
    const nx = dx * inv;
    const nz = dz * inv;
    const sway = Math.sin(timePhase + (tree.phase || 0)) * (0.09 * localWind);
    const targetX = nz * maxBend + sway * 0.4;
    const targetZ = -nx * maxBend + sway * 0.25;
    bend.rotation.x += (targetX - bend.rotation.x) * blend;
    bend.rotation.z += (targetZ - bend.rotation.z) * blend;
  }
}

function updateRefugees(stateRef, dt) {
  const refs = stateRef.world.refugees;
  if (!refs?.length) return;
  const camPos = renderer.camera.position;
  for (const r of refs) {
    if (r.saved || !r.mesh) {
      if (r.mesh) r.mesh.visible = false;
      continue;
    }
    r.mesh.visible = true;
    r.animT = (r.animT || 0) + dt;
    const wave = Math.sin(r.animT * 5.1 + (r.animPhase || 0));
    const waveFine = Math.sin(r.animT * 8.4 + (r.animPhase || 0) * 0.7);
    const armL = r.mesh.userData.armLPivot;
    const armR = r.mesh.userData.armRPivot;
    if (armL && armR) {
      armL.rotation.z = -1.45 - wave * 0.58;
      armR.rotation.z = 1.45 + wave * 0.58;
      armL.rotation.x = 0.12 + waveFine * 0.14;
      armR.rotation.x = 0.12 + waveFine * 0.14;
    }
    const dx = camPos.x - r.x;
    const dz = camPos.z - r.z;
    if (dx * dx + dz * dz > 0.0001) {
      const target = Math.atan2(dx, dz);
      let diff = target - r.mesh.rotation.y;
      while (diff > Math.PI) diff -= TWO_PI;
      while (diff < -Math.PI) diff += TWO_PI;
      r.mesh.rotation.y += diff * 0.22;
    }
  }
}

function update(dt) {
  if (!state || state.paused) return;
  if (input.down('KeyV') && !state._vLock) {
    state._vLock = true;
    state.viewNorth = !state.viewNorth;
  }
  if (!input.down('KeyV')) state._vLock = false;

  if (input.down('KeyM') && !state._mLock) {
    state._mLock = true;
    minimap.toggleBig();
  }
  if (!input.down('KeyM')) state._mLock = false;

  if (input.down('Escape') && !state._eLock) {
    state._eLock = true;
    state.paused = !state.paused;
    screens.showOverlay(state.paused ? 'PAUSED' : '');
  }
  if (!input.down('Escape')) state._eLock = false;

  if (state.crashAnim?.active) {
    systems.cyclone.update(state, dt);
    updateTreeBend(state, dt);
    planeSystem.update(state, dt);
    updateCrashAnimation(state, dt);
  } else {
    const clearance = state.heli.alt - (state.heli.surfaceY ?? state.heli.groundY);
    if (input.down('KeyL') && clearance <= CONFIG.landingAlt && state.heli.onLand) state.heli.landed = true;

    systems.heli.update(state, input, dt);
    systems.physics.update(state, dt);
    systems.pickup.update(state, dt);
    systems.cyclone.update(state, dt);
    updateTreeBend(state, dt);
    planeSystem.update(state, dt);
    systems.fuel.update(state, dt);
    updateStartupEffects(dt);
    if (state.crashReason && !state.inTransition) beginCrash(state, state.crashReason);
  }

  state.heli.group.position.set(state.heli.pos.x, state.heli.alt, state.heli.pos.z);
  state.heli.group.rotation.set(
    state.heli.visualPitch || 0,
    state.heli.heading + Math.PI,
    state.heli.visualRoll || 0,
    'YXZ',
  );
  const flightSpeedLevel = Math.max(1, Math.abs(state.heli.speedLevel));
  let rotorSpin = state.heli.landed ? 0.04 : (1.6 + flightSpeedLevel * 0.22);
  if (state.crashAnim?.active) rotorSpin = state.crashAnim.detachRotors ? 0.03 : 0.22;
  state.heli.rotor.rotation.y += rotorSpin;
  if (state.heli.tailRotor) state.heli.tailRotor.rotation.x += rotorSpin * 3.8;
  updateHeliShadow(state.shadow, state.heli.landed, state.heli.rotor.rotation.y);
  const renderedGroundY = state.heli.onLand
    ? Math.max(RENDER_SEA_Y, Math.floor((state.heli.surfaceY ?? state.heli.groundY) / RENDER_LAND_STEP_Y) * RENDER_LAND_STEP_Y)
    : RENDER_SEA_Y;
  const shadowTargetY = renderedGroundY + SHADOW_Y_OFFSET;
  if (state.heli.landed) {
    state.shadowY = shadowTargetY;
  } else {
    const followRate = shadowTargetY > state.shadowY ? 30 : 10;
    const shadowBlend = 1 - Math.exp(-followRate * dt);
    state.shadowY += (shadowTargetY - state.shadowY) * shadowBlend;
  }
  state.shadow.position.set(state.heli.pos.x, state.shadowY, state.heli.pos.z);
  state.shadow.rotation.set(-Math.PI / 2, state.heli.heading, 0, 'YXZ');
  if (state.rope?.line) {
    const line = state.rope.line;
    line.visible = !!state.rope.active;
    if (line.visible) {
      const arr = line.geometry.attributes.position.array;
      arr[0] = state.rope.anchor.x;
      arr[1] = state.rope.anchor.y;
      arr[2] = state.rope.anchor.z;
      arr[3] = state.rope.tip.x;
      arr[4] = state.rope.tip.y;
      arr[5] = state.rope.tip.z;
      line.geometry.attributes.position.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    }
  }
  const shadowScale = 1.08;
  const pitchRatio = Math.min(1, Math.abs(state.heli.visualPitch || 0) / ((CONFIG.heliTilt.maxPitchDeg || 12) * Math.PI / 180));
  const rollRatio = Math.min(1, Math.abs(state.heli.visualRoll || 0) / ((CONFIG.heliTilt.maxRollDeg || 14) * Math.PI / 180));
  const shadowScaleX = Math.max(0.55, shadowScale * (1 - rollRatio * 0.18 + pitchRatio * 0.14));
  const shadowScaleZ = Math.max(0.55, shadowScale * (1 - pitchRatio * 0.34 + rollRatio * 0.04));
  state.shadow.scale.set(shadowScaleX, 1, shadowScaleZ);
  state.cycloneMesh.position.set(state.cyclone.x, 9, state.cyclone.z);
  state.cycloneMesh.rotation.y += 0.06;
  state.world.crates.forEach((c) => { c.mesh.visible = !c.collected; });

  if (state.gameOver && !state.inTransition) {
    state.inTransition = true;
    screens.showOverlay('GAME OVER');
    const hs = Math.max(Number(localStorage.getItem('zxrescue_hs') || 0), state.score);
    localStorage.setItem('zxrescue_hs', String(hs));
    return;
  }

  if (state.winRound && !state.inTransition) {
    state.inTransition = true;
    screens.showOverlay(`ROUND ${state.round} COMPLETE`);
    const nextRound = state.round + 1;
    setTimeout(() => {
      screens.showOverlay('');
      setupRound(state.seedText, nextRound, {
        score: state.score,
        livesMax: state.livesMax,
        lives: state.lives,
        viewNorth: state.viewNorth,
        cameraTiltDeg: state.cameraTiltDeg,
      });
    }, 1400);
  }

  systems.cam.update(state, renderer, input);
  updateRefugees(state, dt);
  ui.update(state);
}

const loop = new GameLoop(new Time(CONFIG.fixedDt), update, () => renderer.render());

new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;
  renderer.resize(width, height);
}).observe(document.getElementById('top-area'));

document.getElementById('start-btn').addEventListener('click', () => {
  audio.enable();
  const seed = document.getElementById('seed-input').value.trim() || 'ZXRESCUE';
  setupRound(seed, 1);
  screens.showMenu(false);
  screens.showOverlay('');
});

document.getElementById('random-btn').addEventListener('click', () => {
  document.getElementById('seed-input').value = `SEED-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
});

screens.showMenu(true);
screens.showOverlay(`High Score: ${localStorage.getItem('zxrescue_hs') || 0}`);
loop.start();
console.log(`${GAME_NAME} ready`);
