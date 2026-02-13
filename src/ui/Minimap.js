export class Minimap {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.big = false; }
  toggleBig() { this.big = !this.big; this.canvas.style.maxWidth = this.big ? '100%' : '360px'; }
  draw(state) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a2432'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const s = state.world.size;
    const map = (x, z) => [((x / s) + 0.5) * canvas.width, ((z / s) + 0.5) * canvas.height];
    const step = Math.floor(state.world.n / 48);
    for (let y = 0; y < state.world.n; y += step) for (let x = 0; x < state.world.n; x += step) {
      const i = y * state.world.n + x;
      if (!state.world.mask[i]) continue;
      ctx.fillStyle = '#6ca86b';
      ctx.fillRect((x / state.world.n) * canvas.width, (y / state.world.n) * canvas.height, 4, 4);
    }
    const dot = (x, z, c, r = 3) => { const [mx, mz] = map(x, z); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(mx, mz, r, 0, Math.PI * 2); ctx.fill(); };
    dot(state.world.basePos.x, state.world.basePos.z, '#ffffff', 4);
    for (const c of state.world.crates) if (!c.collected) dot(c.x, c.z, '#c9902b', 3);
    dot(state.cyclone.x, state.cyclone.z, '#ad56ff', 6);
    for (const p of state.planes) dot(p.x, p.z, '#ff6262', 3);
    dot(state.heli.pos.x, state.heli.pos.z, '#ffee58', 4);
  }
}
