import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG, GAME_NAME } from './config.js';
import { Renderer } from './engine/Renderer.js';
import { Input } from './engine/Input.js';
import { Time } from './engine/Time.js';
import { AudioSystem } from './engine/Audio.js';
import { generateWorld } from './world/WorldGen.js';
import { buildTerrain, sampleGroundHeight } from './world/TerrainMesh.js';
import { createHelicopter, createCylinderMarker } from './world/Entities.js';
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
    const color = h.id === 'base' ? '#f0f0f0' : '#b2ccd8';
    h.mesh = createCylinderMarker(color, radius, 0.28);
    h.mesh.position.set(h.x, 0.2, h.z);
    renderer.scene.add(h.mesh);
  });
  const occGeo = new THREE.CylinderGeometry(0.8, 1.2, 1, 8);
  const occMat = new THREE.MeshStandardMaterial({ color: '#69635d' });
  const occ = new THREE.InstancedMesh(occGeo, occMat, world.occluders.length);
  const m = new THREE.Matrix4();
  world.occluders.forEach((o, i) => {
    m.makeScale(o.r, o.h, o.r).setPosition(o.x, o.h * 0.5, o.z);
    occ.setMatrixAt(i, m);
  });
  renderer.scene.add(occ);

  const heliObj = createHelicopter();
  renderer.scene.add(heliObj.group);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }),
  );
  shadow.rotation.x = -Math.PI / 2;
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
      pos: { x: world.basePos.x, z: world.basePos.z },
      heading: 0,
      alt: baseGroundY + CONFIG.landingAlt - 0.2,
      speed: 0,
      speedLevel: 0,
      boost: false,
      onLand: true,
      landed: true,
      groundY: baseGroundY,
    },
    shadow,
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
  state.heli.group.rotation.y = state.heli.heading + Math.PI;
  state.heli.rotor.rotation.y += 0.25 + Math.abs(state.heli.speedLevel) * 0.08;
  state.shadow.position.set(state.heli.pos.x, state.heli.groundY + 0.08, state.heli.pos.z);
  const shadowClearance = Math.max(0.3, state.heli.alt - state.heli.groundY);
  state.shadow.scale.setScalar(Math.max(0.45, 1.3 - shadowClearance * 0.05));
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
