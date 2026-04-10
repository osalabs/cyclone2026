export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.heli = null;
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

  #ensureHeliVoice(ctx) {
    if (this.heli) return this.heli;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const lowGain = ctx.createGain();
    lowGain.gain.value = 0.72;
    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.value = 220;

    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.18;

    const highGain = ctx.createGain();
    highGain.gain.value = 0.1;
    const highFilter = ctx.createBiquadFilter();
    highFilter.type = 'bandpass';
    highFilter.frequency.value = 120;
    highFilter.Q.value = 0.8;

    const lowOsc = ctx.createOscillator();
    lowOsc.type = 'sawtooth';
    lowOsc.frequency.value = 28;
    lowOsc.connect(lowGain);
    lowGain.connect(lowFilter);
    lowFilter.connect(master);

    const pulseOsc = ctx.createOscillator();
    pulseOsc.type = 'square';
    pulseOsc.frequency.value = 15;
    pulseOsc.connect(pulseGain);
    pulseGain.connect(lowFilter);

    const highOsc = ctx.createOscillator();
    highOsc.type = 'triangle';
    highOsc.frequency.value = 78;
    highOsc.connect(highGain);
    highGain.connect(highFilter);
    highFilter.connect(master);

    lowOsc.start();
    pulseOsc.start();
    highOsc.start();

    this.heli = {
      master,
      lowGain,
      lowFilter,
      lowOsc,
      pulseGain,
      pulseOsc,
      highGain,
      highFilter,
      highOsc,
    };
    return this.heli;
  }

  enable() {
    this.#ensure();
  }

  setHelicopterRotor(spin, active = true) {
    const ctx = this.#ensure();
    if (!ctx) return;
    const heli = this.#ensureHeliVoice(ctx);
    const t = ctx.currentTime;
    const norm = Math.max(0, Math.min(1, (spin - 0.05) / 2.5));
    const targetMaster = active ? 0.008 + norm * 0.04 : 0.0001;

    heli.lowOsc.frequency.setTargetAtTime(22 + norm * 20, t, 0.08);
    heli.pulseOsc.frequency.setTargetAtTime(11 + norm * 18, t, 0.08);
    heli.highOsc.frequency.setTargetAtTime(70 + norm * 118, t, 0.08);
    heli.lowFilter.frequency.setTargetAtTime(170 + norm * 560, t, 0.08);
    heli.highFilter.frequency.setTargetAtTime(110 + norm * 170, t, 0.08);
    heli.lowGain.gain.setTargetAtTime(0.56 + norm * 0.22, t, 0.08);
    heli.pulseGain.gain.setTargetAtTime(0.1 + norm * 0.14, t, 0.08);
    heli.highGain.gain.setTargetAtTime(0.04 + norm * 0.14, t, 0.08);
    heli.master.gain.setTargetAtTime(targetMaster, t, active ? 0.06 : 0.12);
  }

  stopHelicopter() {
    if (!this.ctx || !this.heli) return;
    this.heli.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
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
