export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.wheel = 0;
    target.addEventListener('keydown', (e) => this.keys.add(e.code));
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    target.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
  }
  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  axis2D() {
    const x = (this.down('KeyD', 'ArrowRight') ? 1 : 0) - (this.down('KeyA', 'ArrowLeft') ? 1 : 0);
    const y = (this.down('KeyW', 'ArrowUp') ? 1 : 0) - (this.down('KeyS', 'ArrowDown') ? 1 : 0);
    return { x, y };
  }
  consumeWheel() { const w = this.wheel; this.wheel = 0; return w; }
}
