import { formatTime } from './utils.js';

export class UISystem {
  constructor(hud, minimap) { this.hud = hud; this.minimap = minimap; }
  update(state) {
    this.hud.speed.textContent = state.heli.speed.toFixed(1);
    this.hud.alt.textContent = state.heli.alt.toFixed(1);
    this.hud.fuel.textContent = Math.max(0, state.fuel).toFixed(1);
    this.hud.time.textContent = formatTime(Math.max(0, state.timeLeft));
    this.hud.crates.textContent = `${state.cratesCollected}/5`;
    this.hud.refugees.textContent = `${state.refugeesSaved}`;
    this.hud.wind.textContent = `${Math.round(state.windForce * 100)}%`;
    this.hud.danger.textContent = state.windForce > 0.7 ? 'DANGER' : 'SAFE';
    this.hud.view.textContent = state.viewNorth ? 'North' : 'South';
    this.hud.plane.textContent = state.planes[0] ? `${Math.round(Math.hypot(state.planes[0].x-state.heli.pos.x, state.planes[0].z-state.heli.pos.z))}m` : 'None';
    this.minimap.draw(state);
  }
}
