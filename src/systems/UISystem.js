import { CONFIG } from '../config.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function buildCrateSvg() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('crate-icon', 'pending');

  const face = document.createElementNS(ns, 'rect');
  face.setAttribute('x', '4');
  face.setAttribute('y', '4');
  face.setAttribute('width', '16');
  face.setAttribute('height', '16');
  face.setAttribute('rx', '2');
  face.classList.add('crate-face');

  const edge = document.createElementNS(ns, 'path');
  edge.setAttribute('d', 'M4 9h16M12 4v16');
  edge.classList.add('crate-edge');

  svg.append(face, edge);
  return svg;
}

function buildLifeHeliSvg() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('life-icon');

  const body = document.createElementNS(ns, 'path');
  body.setAttribute('d', 'M4 12.5c0-2.2 2.2-3.5 4.8-3.5h4.6c1.6 0 3.3.8 4 2.2l1.5 0.4v1.8l-1.5 0.4c-.7 1.4-2.4 2.2-4 2.2H8.8C6.2 16 4 14.7 4 12.5z');
  const skid = document.createElementNS(ns, 'path');
  skid.setAttribute('d', 'M7 17.4h9.8M8.2 18.8h7.4');
  skid.setAttribute('stroke', 'currentColor');
  skid.setAttribute('stroke-width', '1.4');
  skid.setAttribute('fill', 'none');
  skid.setAttribute('stroke-linecap', 'round');
  const rotor = document.createElementNS(ns, 'path');
  rotor.setAttribute('d', 'M6.5 8.1h11.8');
  rotor.setAttribute('stroke', 'currentColor');
  rotor.setAttribute('stroke-width', '1.2');
  rotor.setAttribute('fill', 'none');
  rotor.setAttribute('stroke-linecap', 'round');
  const tail = document.createElementNS(ns, 'path');
  tail.setAttribute('d', 'M18 12.5h2.7M20.7 11.3v2.4');
  tail.setAttribute('stroke', 'currentColor');
  tail.setAttribute('stroke-width', '1.1');
  tail.setAttribute('fill', 'none');
  tail.setAttribute('stroke-linecap', 'round');

  svg.append(body, skid, rotor, tail);
  return svg;
}

export class UISystem {
  constructor(hud, minimap) {
    this.hud = hud;
    this.minimap = minimap;
    this.crateIcons = [];
    this.lifeIcons = [];
    for (let i = 0; i < CONFIG.crateCount; i++) {
      const icon = buildCrateSvg();
      this.crateIcons.push(icon);
      this.hud.cratesIcons.appendChild(icon);
    }
  }

  ensureLives(count) {
    const target = Math.max(0, count | 0);
    if (this.lifeIcons.length === target) return;
    this.lifeIcons = [];
    if (this.hud.lives) this.hud.lives.replaceChildren();
    for (let i = 0; i < target; i++) {
      const icon = buildLifeHeliSvg();
      this.lifeIcons.push(icon);
      this.hud.lives?.appendChild(icon);
    }
  }

  update(state) {
    const altNorm = clamp01((state.heli.alt - CONFIG.minAlt) / (CONFIG.maxAlt - CONFIG.minAlt));
    const speedNorm = clamp01(Math.abs(state.heli.speedLevel || 0) / CONFIG.speedLevels);
    const fuelNorm = clamp01(state.fuel / CONFIG.fuelMax);
    const timeNorm = clamp01(state.timeLeft / CONFIG.timeLimitSec);
    const altStepNorm = Math.round(altNorm * 7) / 7;
    const speedStepNorm = Math.round(speedNorm * 5) / 5;
    const fuelStepNorm = Math.round(fuelNorm * 5) / 5;
    if (this.hud.altFill) this.hud.altFill.style.height = `${(altStepNorm * 100).toFixed(1)}%`;
    if (this.hud.speedFill) this.hud.speedFill.style.height = `${(speedStepNorm * 100).toFixed(1)}%`;
    if (this.hud.fuelFill) this.hud.fuelFill.style.height = `${(fuelStepNorm * 100).toFixed(1)}%`;
    if (this.hud.timeFill) this.hud.timeFill.style.height = `${(timeNorm * 100).toFixed(1)}%`;

    if (this.hud.refugees) this.hud.refugees.textContent = `${state.refugeesSaved}`;
    if (this.hud.viewCell) this.hud.viewCell.textContent = state.viewNorth ? 'View North' : 'View South';

    const visible = state.hudCratesVisible ?? CONFIG.crateCount;
    for (let i = 0; i < this.crateIcons.length; i++) {
      const icon = this.crateIcons[i];
      icon.classList.toggle('visible', i < visible);
      icon.classList.toggle('pending', i >= state.cratesCollected);
      icon.classList.toggle('collected', i < state.cratesCollected);
    }

    const wind = clamp01(state.windForce);
    if (this.hud.windFill) this.hud.windFill.style.width = `${(wind * 100).toFixed(1)}%`;
    const windDanger = wind >= 0.72;
    if (this.hud.windAlert) {
      this.hud.windAlert.textContent = windDanger ? 'CYCLONE' : 'CLEAR';
      this.hud.windAlert.classList.toggle('alert', windDanger);
    }

    let nearestPlaneDist = Infinity;
    for (const p of state.planes) {
      nearestPlaneDist = Math.min(nearestPlaneDist, Math.hypot(p.x - state.heli.pos.x, p.z - state.heli.pos.z));
    }
    const planeDanger = nearestPlaneDist < 30;
    if (this.hud.aircraftAlert) {
      this.hud.aircraftAlert.textContent = planeDanger ? 'AIRCRAFT' : '';
      this.hud.aircraftAlert.classList.toggle('aircraft-alert', planeDanger);
    }

    this.ensureLives(state.livesMax || 3);
    const lives = Math.max(0, state.lives ?? 0);
    for (let i = 0; i < this.lifeIcons.length; i++) {
      this.lifeIcons[i].classList.toggle('lost', i >= lives);
    }

    this.minimap.draw(state);
  }
}
