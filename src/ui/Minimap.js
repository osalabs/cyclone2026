export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.big = false;
  }

  toggleBig() {
    this.big = !this.big;
    this.canvas.style.maxWidth = this.big ? '100%' : '360px';
  }

  drawCycloneIcon(mx, mz) {
    const { ctx } = this;
    const px = 2;
    const sprite = [
      '0011100',
      '0111110',
      '1102211',
      '1002211',
      '1122001',
      '0111110',
      '0011100',
    ];
    const x0 = Math.round(mx - (sprite[0].length * px) * 0.5);
    const y0 = Math.round(mz - (sprite.length * px) * 0.5);

    for (let y = 0; y < sprite.length; y++) {
      for (let x = 0; x < sprite[y].length; x++) {
        const ch = sprite[y][x];
        if (ch === '0') continue;
        ctx.fillStyle = ch === '2' ? '#f1f7ff' : '#ba65ff';
        ctx.fillRect(x0 + x * px, y0 + y * px, px, px);
      }
    }
  }

  draw(state) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a2432';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const s = state.world.size;
    const map = (x, z) => [((x / s) + 0.5) * canvas.width, ((z / s) + 0.5) * canvas.height];
    const step = Math.max(1, Math.floor(state.world.n / 64));
    const pixel = Math.max(2, Math.floor(canvas.width / 120));

    for (let y = 0; y < state.world.n; y += step) {
      for (let x = 0; x < state.world.n; x += step) {
        const i = y * state.world.n + x;
        if (!state.world.mask[i]) continue;
        ctx.fillStyle = '#6ca86b';
        ctx.fillRect((x / state.world.n) * canvas.width, (y / state.world.n) * canvas.height, pixel, pixel);
      }
    }

    if (state.world.islandInfos) {
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = 'rgba(212, 233, 246, 0.68)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(6, 12, 18, 0.7)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 1;
      for (const island of state.world.islandInfos) {
        const [mx, mz] = map(island.center.x, island.center.z);
        const label = island.name.length > 14 ? `${island.name.slice(0, 14)}.` : island.name;
        ctx.fillText(label, mx, mz + 6);
      }
      ctx.shadowColor = 'transparent';
      ctx.shadowOffsetY = 0;
    }

    const dot = (x, z, c, r = 3) => {
      const [mx, mz] = map(x, z);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(mx, mz, r, 0, Math.PI * 2);
      ctx.fill();
    };

    dot(state.world.basePos.x, state.world.basePos.z, '#ffffff', 4);
    for (const c of state.world.crates) if (!c.collected) dot(c.x, c.z, '#c9902b', 3);
    const [cx, cz] = map(state.cyclone.x, state.cyclone.z);
    this.drawCycloneIcon(cx, cz);
    for (const p of state.planes) dot(p.x, p.z, '#ff6262', 3);
    dot(state.heli.pos.x, state.heli.pos.z, '#ffee58', 4);
  }
}
