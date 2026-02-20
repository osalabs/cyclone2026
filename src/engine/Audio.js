export class AudioSystem {
  constructor() {
    this.ctx = null;
  }

  #ensure() {
    if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  #tone(ctx, freq, time, duration, type, gain) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  enable() {
    this.#ensure();
  }

  play(name) {
    const ctx = this.#ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    if (name === 'drop') {
      this.#tone(ctx, 380, t, 0.08, 'square', 0.04);
      this.#tone(ctx, 260, t + 0.07, 0.1, 'triangle', 0.05);
      return;
    }
    if (name === 'tick') {
      this.#tone(ctx, 900, t, 0.045, 'square', 0.035);
    }
  }
}
