import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { CONFIG, GAME_NAME } from './config.js';
import { Renderer } from './engine/Renderer.js';
import { Input } from './engine/Input.js';
import { Time } from './engine/Time.js';
import { AudioSystem } from './engine/Audio.js';
import { generateWorld } from './world/WorldGen.js';
import { buildTerrain } from './world/TerrainMesh.js';
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
const screens = new Screens();
const audio = new AudioSystem();
audio.prepare();
const minimap = new Minimap(document.getElementById('minimap-canvas'));
const ui = new UISystem(getHUDRefs(), minimap);
const systems = {
  heli: new HelicopterSystem(), physics: new PhysicsSystem(), cyclone: new CycloneSystem(),
  pickup: new PickupSystem(), fuel: new FuelTimeSystem(), cam: new CameraSystem(),
};
let planeSystem;
let state;

function clearScene() {
  while (renderer.scene.children.length > 2) renderer.scene.remove(renderer.scene.children[2]);
}

function setupRound(seedText, round = 1) {
  clearScene();
  const world = generateWorld(seedText, round);
  renderer.scene.add(buildTerrain(world));
  world.crates.forEach((c) => { c.mesh = createCylinderMarker('#c9902b', 1.1, 1.3); c.mesh.position.set(c.x, 1.2, c.z); renderer.scene.add(c.mesh); });
  world.refugees.forEach((r) => { r.mesh = createCylinderMarker('#4fd6d0', 0.8, 1.2); r.mesh.position.set(r.x, 1.1, r.z); renderer.scene.add(r.mesh); });
  world.helipads.forEach((h, i) => { h.mesh = createCylinderMarker(i === 0 ? '#ffffff' : '#b8d8e6', i === 0 ? 2.8 : 2, 0.3); h.mesh.position.set(h.x, 0.2, h.z); renderer.scene.add(h.mesh); });

  const treeGeo = new THREE.ConeGeometry(0.8, 2.5, 7);
  const treeMat = new THREE.MeshStandardMaterial({ color: '#2e8c3f' });
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, world.trees.length);
  const treeMx = new THREE.Matrix4();
  world.trees.forEach((t, i) => { treeMx.makeScale(t.s, t.s, t.s).setPosition(t.x, 1.2, t.z); trees.setMatrixAt(i, treeMx); });
  renderer.scene.add(trees);

  const houseGeo = new THREE.BoxGeometry(1.2, 1, 1.2);
  const houseMat = new THREE.MeshStandardMaterial({ color: '#d0b48a' });
  const houses = new THREE.InstancedMesh(houseGeo, houseMat, world.houses.length);
  const hMx = new THREE.Matrix4();
  world.houses.forEach((h, i) => { hMx.makeScale(h.s, h.s, h.s).setPosition(h.x, 0.8, h.z); houses.setMatrixAt(i, hMx); });
  renderer.scene.add(houses);

  const occGeo = new THREE.CylinderGeometry(0.8, 1.2, 1, 8);
  const occMat = new THREE.MeshStandardMaterial({ color: '#69635d' });
  const occ = new THREE.InstancedMesh(occGeo, occMat, world.occluders.length);
  const m = new THREE.Matrix4();
  world.occluders.forEach((o, i) => { m.makeScale(o.r, o.h, o.r).setPosition(o.x, o.h * 0.5, o.z); occ.setMatrixAt(i, m); });
  renderer.scene.add(occ);

  const heliObj = createHelicopter();
  renderer.scene.add(heliObj.group);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.8, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  shadow.rotation.x = -Math.PI / 2; renderer.scene.add(shadow);
  const cycloneMesh = new THREE.Mesh(new THREE.CylinderGeometry(5, 10, 18, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#9b58ff', transparent: true, opacity: 0.35 }));
  renderer.scene.add(cycloneMesh);

  state = {
    seedText, round, world,
    heli: { group: heliObj.group, rotor: heliObj.rotor, pos: { x: world.basePos.x, z: world.basePos.z }, alt: 2, speed: 0, speedLevel: 0, heading: 0, boost: false, onLand: true, landed: true, groundY: 0 },
    shadow, cycloneMesh, cyclone: { x: 0, z: 0, t: 0 }, planes: [], planeTimer: 7,
    fuel: 0, timeLeft: CONFIG.timeLimitSec, cratesCollected: 0, refugeesSaved: 0, score: 0,
    pickupTimer: 0, windForce: 0, viewNorth: true, cameraDist: CONFIG.camera.dist,
    crashReason: '', gameOver: false, winRound: false, paused: false,
    startSeq: { crateIndex: 0, crateTimer: 0.45, fuelTimer: 0.3, done: false },
    radar: { cyclone: { x: world.basePos.x, z: world.basePos.z }, planes: [], cycloneTick: 0, planeTick: 0 },
  };
  planeSystem = new PlaneSystem(seedText);
}

function runStartSequence(dt) {
  if (state.startSeq.done) return;
  state.startSeq.crateTimer -= dt;
  if (state.startSeq.crateIndex < CONFIG.crateCount && state.startSeq.crateTimer <= 0) {
    state.startSeq.crateIndex += 1;
    state.startSeq.crateTimer = 0.3;
    audio.play('drop');
  }
  state.startSeq.fuelTimer -= dt;
  if (state.fuel < CONFIG.fuelMax && state.startSeq.fuelTimer <= 0) {
    state.fuel = Math.min(CONFIG.fuelMax, state.fuel + 4);
    state.startSeq.fuelTimer = 0.3;
    audio.play('tick');
  }
  if (state.startSeq.crateIndex >= CONFIG.crateCount && state.fuel >= CONFIG.fuelMax) state.startSeq.done = true;
}

function updateRadar(dt) {
  state.radar.cycloneTick -= dt;
  state.radar.planeTick -= dt;
  if (state.radar.cycloneTick <= 0) {
    state.radar.cyclone.x = state.cyclone.x;
    state.radar.cyclone.z = state.cyclone.z;
    state.radar.cycloneTick = 3;
  }
  if (state.radar.planeTick <= 0) {
    state.radar.planes = state.planes.map((p) => ({ x: p.x, z: p.z }));
    state.radar.planeTick = 1;
  }
}

function update(dt) {
  if (!state || state.paused) return;
  if (input.down('KeyV') && !state._vLock) { state._vLock = true; state.viewNorth = !state.viewNorth; }
  if (!input.down('KeyV')) state._vLock = false;
  if (input.down('KeyM') && !state._mLock) { state._mLock = true; minimap.toggleBig(); }
  if (!input.down('KeyM')) state._mLock = false;
  if (input.down('Escape') && !state._eLock) { state._eLock = true; state.paused = !state.paused; screens.showOverlay(state.paused ? 'PAUSED' : ''); }
  if (!input.down('Escape')) state._eLock = false;
  if (input.down('KeyL') && state.heli.alt <= CONFIG.landingAlt && state.heli.onLand) state.heli.landed = true;

  if (!state.startSeq.done) {
    runStartSequence(dt);
  } else {
    systems.heli.update(state, input, dt);
    systems.physics.update(state, dt);
    systems.cyclone.update(state, dt);
    planeSystem.update(state, dt);
    systems.pickup.update(state, dt);
    systems.fuel.update(state, dt);
  }

  updateRadar(dt);
  state.heli.group.position.set(state.heli.pos.x, state.heli.groundY + state.heli.alt, state.heli.pos.z);
  state.heli.group.rotation.y = state.heli.heading;
  state.heli.rotor.rotation.y += 1.1;
  audio.updateRotor(state.heli.speedLevel);
  state.shadow.position.set(state.heli.pos.x, state.heli.groundY + 0.08, state.heli.pos.z);
  state.shadow.scale.setScalar(Math.max(0.45, 1.3 - state.heli.alt * 0.03));
  state.cycloneMesh.position.set(state.cyclone.x, 9, state.cyclone.z);
  state.cycloneMesh.rotation.y += 0.06;
  state.world.crates.forEach((c) => c.mesh.visible = !c.collected);
  state.world.refugees.forEach((r) => r.mesh.visible = !r.saved);

  if (state.crashReason) {
    screens.showOverlay(`CRASH: ${state.crashReason}`);
    setTimeout(() => { screens.showOverlay(''); setupRound(state.seedText, state.round); }, 1200);
    state.crashReason = '';
  }
  if (state.gameOver) {
    screens.showOverlay('GAME OVER');
    const hs = Math.max(Number(localStorage.getItem('zxrescue_hs') || 0), state.score);
    localStorage.setItem('zxrescue_hs', String(hs));
    return;
  }
  if (state.winRound) {
    screens.showOverlay(`ROUND ${state.round} COMPLETE`);
    const nextRound = state.round + 1;
    setTimeout(() => { screens.showOverlay(''); setupRound(state.seedText, nextRound); }, 1400);
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
  const seed = document.getElementById('seed-input').value.trim() || 'ZXRESCUE';
  setupRound(seed, 1); screens.showMenu(false); screens.showOverlay('');
});
document.getElementById('random-btn').addEventListener('click', () => {
  document.getElementById('seed-input').value = `SEED-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
});

screens.showMenu(true);
screens.showOverlay(`High Score: ${localStorage.getItem('zxrescue_hs') || 0}`);
loop.start();
console.log(`${GAME_NAME} ready`);
