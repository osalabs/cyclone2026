export class Time {
  constructor(fixedDt) { this.fixedDt = fixedDt; this.acc = 0; this.last = performance.now(); }
  tick() {
    const now = performance.now();
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= this.fixedDt && steps < 5) { this.acc -= this.fixedDt; steps++; }
    return { steps, dt: this.fixedDt, alpha: this.acc / this.fixedDt };
  }
}
