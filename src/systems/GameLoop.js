export class GameLoop {
  constructor(time, update, render) { this.time = time; this.updateFn = update; this.renderFn = render; this.running = false; }
  start() {
    this.running = true;
    const frame = () => {
      if (!this.running) return;
      const tick = this.time.tick();
      for (let i = 0; i < tick.steps; i++) this.updateFn(tick.dt);
      this.renderFn(tick.alpha);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
