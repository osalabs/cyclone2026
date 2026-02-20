export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.big = false;
    this.cycloneShown = { x: 0, z: 0 };
    this.planeShown = { x: 0, z: 0, visible: false };
    this.nextCycloneSampleAtMs = 0;
    this.seenRound = -1;
    if (document.fonts?.load) document.fonts.load('11px "VT323"');
  }

  syncCanvasSize() {
    const panel = this.canvas.parentElement;
    let side = Math.min(this.canvas.clientWidth || this.canvas.width, this.canvas.clientHeight || this.canvas.height);
    if (panel) {
      const panelStyle = getComputedStyle(panel);
      const padX = (parseFloat(panelStyle.paddingLeft) || 0) + (parseFloat(panelStyle.paddingRight) || 0);
      const padY = (parseFloat(panelStyle.paddingTop) || 0) + (parseFloat(panelStyle.paddingBottom) || 0);
      const title = panel.querySelector('.hud-title');
      let titleH = 0;
      if (title) {
        const ts = getComputedStyle(title);
        titleH = title.getBoundingClientRect().height + (parseFloat(ts.marginTop) || 0) + (parseFloat(ts.marginBottom) || 0);
      }
      const availW = Math.max(0, panel.clientWidth - padX - 2);
      const availH = Math.max(0, panel.clientHeight - padY - titleH - 2);
      side = Math.min(availW, availH);
    }
    side = Math.max(64, Math.floor(side || 64));
    this.canvas.style.width = `${side}px`;
    this.canvas.style.height = `${side}px`;
    if (this.canvas.width !== side || this.canvas.height !== side) {
      this.canvas.width = side;
      this.canvas.height = side;
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  toggleBig() {
    this.big = !this.big;
    this.syncCanvasSize();
  }

  drawCycloneIcon(mx, mz) {
    const { ctx } = this;
    const r = 8;
    ctx.save();
    ctx.translate(mx, mz);
    ctx.fillStyle = '#cf2a2a';

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(1.5, -1.2);
      ctx.quadraticCurveTo(7.2, -3.4, 10, 0);
      ctx.quadraticCurveTo(6.9, 2.7, 1.2, 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  draw(state) {
    this.syncCanvasSize();
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a2432';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const s = state.world.size;
    const map = (x, z) => [((x / s) + 0.5) * canvas.width, ((z / s) + 0.5) * canvas.height];
    const step = Math.max(1, Math.floor(state.world.n / 96));
    const cellW = Math.max(1, Math.ceil((step * canvas.width) / state.world.n));
    const cellH = Math.max(1, Math.ceil((step * canvas.height) / state.world.n));

    for (let y = 0; y < state.world.n; y += step) {
      for (let x = 0; x < state.world.n; x += step) {
        const i = y * state.world.n + x;
        if (!state.world.mask[i]) continue;
        ctx.fillStyle = '#6ca86b';
        ctx.fillRect(
          Math.floor((x / state.world.n) * canvas.width),
          Math.floor((y / state.world.n) * canvas.height),
          cellW,
          cellH,
        );
      }
    }

    if (state.world.islandInfos) {
      ctx.font = '11px "VT323", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.48)';
      ctx.lineWidth = 2;
      for (const island of state.world.islandInfos) {
        const [mx, mz] = map(island.center.x, island.center.z);
        const label = island.name.length > 16 ? `${island.name.slice(0, 16)}.` : island.name;
        const ly = mz + 7;
        ctx.strokeText(label, mx, ly);
        ctx.fillText(label, mx, ly);
      }
    }

    const nowMs = performance.now();
    if (this.seenRound !== state.round || nowMs >= this.nextCycloneSampleAtMs) {
      this.seenRound = state.round;
      this.cycloneShown.x = state.cyclone.x;
      this.cycloneShown.z = state.cyclone.z;
      if (state.planes?.length) {
        let nearest = state.planes[0];
        let best = Infinity;
        for (const p of state.planes) {
          const d = Math.hypot(p.x - state.heli.pos.x, p.z - state.heli.pos.z);
          if (d < best) {
            best = d;
            nearest = p;
          }
        }
        this.planeShown.x = nearest.x;
        this.planeShown.z = nearest.z;
        this.planeShown.visible = true;
      } else {
        this.planeShown.visible = false;
      }
      this.nextCycloneSampleAtMs = nowMs + 3000;
    }

    const [cx, cz] = map(this.cycloneShown.x, this.cycloneShown.z);
    this.drawCycloneIcon(cx, cz);
    if (this.planeShown.visible) {
      const [px, pz] = map(this.planeShown.x, this.planeShown.z);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, pz, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160, 0, 0, 0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const [hx, hz] = map(state.heli.pos.x, state.heli.pos.z);
    ctx.font = 'bold 12px "VT323", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeText('H', hx, hz);
    ctx.fillStyle = '#fff176';
    ctx.fillText('H', hx, hz);
  }
}
