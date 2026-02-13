import { formatTime } from './utils.js';

export class UISystem {
  constructor(hud, minimap) { this.hud = hud; this.minimap = minimap; }
  update(state) {
    this.hud.speed.textContent = `L${state.heli.speedLevel + 3} (${state.heli.speed.toFixed(1)})`;
    this.hud.alt.textContent = state.heli.alt.toFixed(1);
    this.hud.fuel.textContent = Math.max(0, state.fuel).toFixed(1);
    this.hud.time.textContent = formatTime(Math.max(0, state.timeLeft));

    const picked = state.cratesCollected;
    const total = 5;
    this.hud.crates.innerHTML = Array.from({ length: total }).map((_, i) => `<span class="${i < picked ? 'crate-picked' : 'crate-pending'}">■</span>`).join(' ');
    this.hud.refugees.textContent = `${state.refugeesSaved}`;

    const windPct = Math.round(state.windForce * 100);
    this.hud.wind.textContent = `${windPct}%`;
    this.hud.windBar.style.width = `${windPct}%`;
    const cycloneDanger = state.windForce > 0.7;
    this.hud.danger.textContent = cycloneDanger ? 'CYCLONE' : 'SAFE';
    this.hud.danger.classList.toggle('alert', cycloneDanger);

    this.hud.view.textContent = state.viewNorth ? 'North' : 'South';

    const plane = state.planes[0];
    if (plane) {
      const dist = Math.hypot(plane.x - state.heli.pos.x, plane.z - state.heli.pos.z);
      const close = Math.max(0, 1 - dist / 90);
      this.hud.plane.textContent = dist < 32 ? 'AIRCRAFT' : `${Math.round(dist)}m`;
      this.hud.plane.classList.toggle('alert', dist < 32);
      this.hud.planeBar.style.width = `${Math.round(close * 100)}%`;
    } else {
      this.hud.plane.textContent = 'None';
      this.hud.plane.classList.remove('alert');
      this.hud.planeBar.style.width = '0%';
    }

    this.minimap.draw(state);
  }
}
