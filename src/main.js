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
  createCylinderMarker,
  createHelipadMarker,
  createTree,
  createBuilding,
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

function clearScene() {
  while (renderer.scene.children.length > 2) renderer.scene.remove(renderer.scene.children[2]);
}

function setupRound(seedText, round = 1) {
  clearScene();
  const world = generateWorld(seedText, round);
  const baseGroundY = sampleGroundHeight(world, world.basePos.x, world.basePos.z);
  renderer.scene.add(buildTerrain(world));
  world.crates.forEach((c) => {
    c.mesh = createCylinderMarker('#c9902b', 1.1, 1.3);
    c.mesh.position.set(c.x, 1.2, c.z);
    renderer.scene.add(c.mesh);
  });
  world.refugees.forEach((r) => {
    r.mesh = createCylinderMarker('#4fd6d0', 0.8, 1.2);
    r.mesh.position.set(r.x, 1.1, r.z);
    renderer.scene.add(r.mesh);
  });
  world.helipads.forEach((h) => {
    const radius = h.id === 'base' ? 3 : 2.2;
    const y = sampleGroundHeight(world, h.x, h.z);
    h.mesh = createHelipadMarker(radius, h.id === 'base');
    h.mesh.position.set(h.x, y, h.z);
    renderer.scene.add(h.mesh);
  });
  if (world.trees) {
    world.trees.forEach((t) => {
      const tree = createTree(t.kind, t.scale);
      tree.position.set(t.x, t.groundY, t.z);
      renderer.scene.add(tree);
      t.mesh = tree;
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

  const heliObj = createHelicopter();
  heliObj.group.rotation.order = 'YXZ';
  heliObj.group.renderOrder = 12;
  renderer.scene.add(heliObj.group);
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
      pos: { x: world.basePos.x, z: world.basePos.z },
      heading: -Math.PI / 2,
      visualPitch: 0,
      visualRoll: 0,
      alt: baseGroundY + CONFIG.landingAlt - 0.2,
      speed: 0,
      speedLevel: 0,
      verticalSpeed: 0,
      fallDistance: 0,
      descentPauseTime: 0,
      boost: false,
      onLand: true,
      landed: true,
      groundY: baseGroundY,
    },
    shadow,
    shadowY: Math.floor(baseGroundY / RENDER_LAND_STEP_Y) * RENDER_LAND_STEP_Y + SHADOW_Y_OFFSET,
    cycloneMesh,
    cyclone: { x: 0, z: 0, t: 0 },
    planes: [],
    planeTimer: 7,
    fuel: 0,
    timeLeft: CONFIG.timeLimitSec,
    cratesCollected: 0,
    refugeesSaved: 0,
    score: 0,
    hudCratesVisible: 0,
    startup: {
      cratesTimer: CONFIG.startupCrateInterval,
      fuelTickTimer: CONFIG.startupFuelTickInterval,
    },
    pickupTimer: 0,
    refueling: false,
    windForce: 0,
    viewNorth: true,
    cameraTiltDeg: CONFIG.camera.tiltDeg,
    cameraDist: CONFIG.camera.dist,
    crashReason: '',
    gameOver: false,
    winRound: false,
    paused: false,
    inTransition: false,
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

  const clearance = state.heli.alt - state.heli.groundY;
  if (input.down('KeyL') && clearance <= CONFIG.landingAlt && state.heli.onLand) state.heli.landed = true;

  systems.heli.update(state, input, dt);
  systems.physics.update(state, dt);
  systems.pickup.update(state, dt);
  systems.cyclone.update(state, dt);
  planeSystem.update(state, dt);
  systems.fuel.update(state, dt);
  updateStartupEffects(dt);

  state.heli.group.position.set(state.heli.pos.x, state.heli.alt, state.heli.pos.z);
  state.heli.group.rotation.set(
    state.heli.visualPitch || 0,
    state.heli.heading + Math.PI,
    state.heli.visualRoll || 0,
    'YXZ',
  );
  const flightSpeedLevel = Math.max(1, Math.abs(state.heli.speedLevel));
  const rotorSpin = state.heli.landed ? 0.04 : (1.6 + flightSpeedLevel * 0.22);
  state.heli.rotor.rotation.y += rotorSpin;
  if (state.heli.tailRotor) state.heli.tailRotor.rotation.x += rotorSpin * 3.8;
  updateHeliShadow(state.shadow, state.heli.landed, state.heli.rotor.rotation.y);
  const renderedGroundY = state.heli.onLand
    ? Math.max(RENDER_SEA_Y, Math.floor(state.heli.groundY / RENDER_LAND_STEP_Y) * RENDER_LAND_STEP_Y)
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
  const shadowScale = 1.08;
  const pitchRatio = Math.min(1, Math.abs(state.heli.visualPitch || 0) / ((CONFIG.heliTilt.maxPitchDeg || 12) * Math.PI / 180));
  const rollRatio = Math.min(1, Math.abs(state.heli.visualRoll || 0) / ((CONFIG.heliTilt.maxRollDeg || 14) * Math.PI / 180));
  const shadowScaleX = Math.max(0.55, shadowScale * (1 - rollRatio * 0.18 + pitchRatio * 0.14));
  const shadowScaleZ = Math.max(0.55, shadowScale * (1 - pitchRatio * 0.34 + rollRatio * 0.04));
  state.shadow.scale.set(shadowScaleX, 1, shadowScaleZ);
  state.cycloneMesh.position.set(state.cyclone.x, 9, state.cyclone.z);
  state.cycloneMesh.rotation.y += 0.06;
  state.world.crates.forEach((c) => { c.mesh.visible = !c.collected; });
  state.world.refugees.forEach((r) => { r.mesh.visible = !r.saved; });

  if (state.crashReason && !state.inTransition) {
    state.inTransition = true;
    screens.showOverlay(`CRASH: ${state.crashReason}`);
    setTimeout(() => {
      screens.showOverlay('');
      setupRound(state.seedText, state.round);
    }, 1200);
    state.crashReason = '';
  }

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
      setupRound(state.seedText, nextRound);
    }, 1400);
  }

  systems.cam.update(state, renderer, input);
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
