import { CONFIG } from '../config.js';
import { formatTime } from './utils.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function setBlockGauge(el, total, active, classes = '') {
  const rounded = Math.max(0, Math.min(total, Math.round(active)));
  if (!el._built || el._total !== total || el._classes !== classes) {
    el.className = `block-gauge blocks-${total} ${classes}`.trim();
    el.replaceChildren();
    for (let i = 0; i < total; i++) {
      const b = document.createElement('div');
      b.className = 'gauge-block';
      el.appendChild(b);
    }
    el._blocks = Array.from(el.children);
    el._built = true;
    el._total = total;
    el._classes = classes;
  }
  for (let i = 0; i < total; i++) {
    el._blocks[i].classList.toggle('active', i < rounded);
  }
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

export class UISystem {
  constructor(hud, minimap) {
    this.hud = hud;
    this.minimap = minimap;
    this.crateIcons = [];
    for (let i = 0; i < CONFIG.crateCount; i++) {
      const icon = buildCrateSvg();
      this.crateIcons.push(icon);
      this.hud.cratesIcons.appendChild(icon);
    }
  }

  update(state) {
    const speedLevel = state.heli.speedLevel || 0;
    const absSpeed = Math.abs(speedLevel);
    this.hud.speed.textContent = `${speedLevel >= 0 ? '+' : ''}${speedLevel}`;
    this.hud.alt.textContent = state.heli.alt.toFixed(1);
    this.hud.fuel.textContent = Math.max(0, state.fuel).toFixed(0);
    this.hud.time.textContent = formatTime(Math.max(0, state.timeLeft));
    this.hud.refugees.textContent = `${state.refugeesSaved}`;
    this.hud.view.textContent = state.viewNorth ? 'North' : 'South';
    this.hud.tilt.textContent = `${state.cameraTiltDeg.toFixed(1)} deg`;

    const altNorm = clamp01((state.heli.alt - CONFIG.minAlt) / (CONFIG.maxAlt - CONFIG.minAlt));
    setBlockGauge(this.hud.altGauge, 7, altNorm * 7, 'alt');
    setBlockGauge(this.hud.speedGauge, 5, absSpeed, speedLevel < 0 ? 'reverse' : '');
    setBlockGauge(this.hud.fuelGauge, 5, clamp01(state.fuel / CONFIG.fuelMax) * 5, 'fuel');
    this.hud.timeFill.style.width = `${(clamp01(state.timeLeft / CONFIG.timeLimitSec) * 100).toFixed(1)}%`;

    const visible = state.hudCratesVisible ?? CONFIG.crateCount;
    for (let i = 0; i < this.crateIcons.length; i++) {
      const icon = this.crateIcons[i];
      icon.classList.toggle('visible', i < visible);
      icon.classList.toggle('pending', i >= state.cratesCollected);
      icon.classList.toggle('collected', i < state.cratesCollected);
    }

    const wind = clamp01(state.windForce);
    this.hud.windFill.style.width = `${(wind * 100).toFixed(1)}%`;
    const windDanger = wind >= 0.72;
    this.hud.windAlert.textContent = windDanger ? 'CYCLONE' : 'CLEAR';
    this.hud.windAlert.classList.toggle('alert', windDanger);

    let nearestPlaneDist = Infinity;
    for (const p of state.planes) {
      nearestPlaneDist = Math.min(nearestPlaneDist, Math.hypot(p.x - state.heli.pos.x, p.z - state.heli.pos.z));
    }
    const planeNorm = nearestPlaneDist < Infinity ? clamp01(1 - nearestPlaneDist / 90) : 0;
    this.hud.planeFill.style.width = `${(planeNorm * 100).toFixed(1)}%`;
    const planeDanger = nearestPlaneDist < 30;
    this.hud.planeAlert.textContent = planeDanger ? 'AIRCRAFT' : 'CLEAR';
    this.hud.planeAlert.classList.toggle('alert', planeDanger);

    this.minimap.draw(state);
  }
}
