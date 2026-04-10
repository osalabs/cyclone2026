const SILENT_GAIN = 0.0001;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.heli = null;
    this.pickup = null;
    this.plane = null;
    this.buffet = null;
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

  #fade(gainNode, value, timeConstant = 0.08) {
    if (!gainNode || !this.ctx) return;
    gainNode.gain.setTargetAtTime(Math.max(SILENT_GAIN, value), this.ctx.currentTime, timeConstant);
  }

  #tone(ctx, freq, time, duration, type, gain) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(SILENT_GAIN, time + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  #noiseBurst(ctx, time, duration, gain, lowpassFreq = 900) {
    const source = ctx.createBufferSource();
    source.buffer = this.#getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpassFreq, time);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(SILENT_GAIN, time + duration);
    source.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    source.start(time);
    source.stop(time + duration);
  }

  #getNoiseBuffer(ctx) {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      prev = prev * 0.86 + white * 0.14;
      data[i] = prev;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  #createNoiseSource(ctx) {
    const source = ctx.createBufferSource();
    source.buffer = this.#getNoiseBuffer(ctx);
    source.loop = true;
    return source;
  }

  #ensureHeliVoice(ctx) {
    if (this.heli) return this.heli;

    const master = ctx.createGain();
    const chopGain = ctx.createGain();
    const bodyGain = ctx.createGain();
    const harmonicGain = ctx.createGain();
    const noiseGain = ctx.createGain();
    const bodyFilter = ctx.createBiquadFilter();
    const noiseFilter = ctx.createBiquadFilter();

    master.gain.value = SILENT_GAIN;
    chopGain.gain.value = 0.45;
    bodyGain.gain.value = 0.62;
    harmonicGain.gain.value = 0.14;
    noiseGain.gain.value = 0.018;
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.value = 380;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 180;
    noiseFilter.Q.value = 0.7;

    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'sawtooth';
    bodyOsc.frequency.value = 22;

    const harmonicOsc = ctx.createOscillator();
    harmonicOsc.type = 'triangle';
    harmonicOsc.frequency.value = 56;

    const noiseSource = this.#createNoiseSource(ctx);

    bodyOsc.connect(bodyGain);
    harmonicOsc.connect(harmonicGain);
    bodyGain.connect(bodyFilter);
    harmonicGain.connect(bodyFilter);
    bodyFilter.connect(chopGain);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(chopGain);
    chopGain.connect(master);
    master.connect(ctx.destination);

    bodyOsc.start();
    harmonicOsc.start();
    noiseSource.start();

    this.heli = {
      master,
      chopGain,
      bodyGain,
      harmonicGain,
      noiseGain,
      bodyFilter,
      noiseFilter,
      bodyOsc,
      harmonicOsc,
    };
    return this.heli;
  }

  #ensurePickupVoice(ctx) {
    if (this.pickup) return this.pickup;

    const master = ctx.createGain();
    const toneGain = ctx.createGain();
    const gritGain = ctx.createGain();
    const gritFilter = ctx.createBiquadFilter();
    const toneOsc = ctx.createOscillator();
    const gritSource = this.#createNoiseSource(ctx);

    master.gain.value = SILENT_GAIN;
    toneGain.gain.value = 0.08;
    gritGain.gain.value = 0.02;
    gritFilter.type = 'bandpass';
    gritFilter.frequency.value = 280;
    gritFilter.Q.value = 2.4;
    toneOsc.type = 'sawtooth';
    toneOsc.frequency.value = 180;

    toneOsc.connect(toneGain);
    toneGain.connect(master);
    gritSource.connect(gritFilter);
    gritFilter.connect(gritGain);
    gritGain.connect(master);
    master.connect(ctx.destination);

    toneOsc.start();
    gritSource.start();

    this.pickup = {
      master,
      toneGain,
      gritGain,
      gritFilter,
      toneOsc,
    };
    return this.pickup;
  }

  #ensurePlaneVoice(ctx) {
    if (this.plane) return this.plane;

    const master = ctx.createGain();
    const bodyGain = ctx.createGain();
    const hissGain = ctx.createGain();
    const hissFilter = ctx.createBiquadFilter();
    const bodyOsc = ctx.createOscillator();
    const hissSource = this.#createNoiseSource(ctx);
    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;

    master.gain.value = SILENT_GAIN;
    bodyGain.gain.value = 0.14;
    hissGain.gain.value = 0.02;
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 320;
    hissFilter.Q.value = 0.9;
    bodyOsc.type = 'sawtooth';
    bodyOsc.frequency.value = 110;

    bodyOsc.connect(bodyGain);
    hissSource.connect(hissFilter);
    hissFilter.connect(hissGain);
    if (panner) {
      bodyGain.connect(panner);
      hissGain.connect(panner);
      panner.connect(master);
    } else {
      bodyGain.connect(master);
      hissGain.connect(master);
    }
    master.connect(ctx.destination);

    bodyOsc.start();
    hissSource.start();

    this.plane = {
      master,
      bodyGain,
      hissGain,
      hissFilter,
      bodyOsc,
      panner,
    };
    return this.plane;
  }

  #ensureBuffetVoice(ctx) {
    if (this.buffet) return this.buffet;

    const master = ctx.createGain();
    const noiseGain = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    const bandpass = ctx.createBiquadFilter();
    const source = this.#createNoiseSource(ctx);

    master.gain.value = SILENT_GAIN;
    noiseGain.gain.value = 0.08;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 260;
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 90;
    bandpass.Q.value = 0.65;

    source.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(master);
    master.connect(ctx.destination);

    source.start();

    this.buffet = {
      master,
      noiseGain,
      lowpass,
      bandpass,
    };
    return this.buffet;
  }

  enable() {
    this.#ensure();
  }

  setHelicopterRotor({ spin, active = true, turbulence = 0, load = 0 } = {}) {
    const ctx = this.#ensure();
    if (!ctx) return;
    const heli = this.#ensureHeliVoice(ctx);
    const t = ctx.currentTime;
    const norm = clamp01((spin - 0.05) / 2.8);
    const wobble =
      turbulence * (
        Math.sin(t * (2.6 + turbulence * 4.6)) * 5.2
        + Math.sin(t * (8.2 + turbulence * 13)) * 2.4
      );
    const chopPulse = Math.abs(Math.sin(t * (9.5 + norm * 14 + turbulence * 22)));
    const masterGain = active ? 0.016 + norm * 0.05 + load * 0.012 : SILENT_GAIN;

    heli.bodyOsc.frequency.setTargetAtTime(Math.max(18, 24 + norm * 18 + load * 4 + wobble), t, 0.06);
    heli.harmonicOsc.frequency.setTargetAtTime(Math.max(40, 64 + norm * 84 + load * 10 + wobble * 2.1), t, 0.06);
    heli.bodyFilter.frequency.setTargetAtTime(320 + norm * 470 + load * 90, t, 0.07);
    heli.noiseFilter.frequency.setTargetAtTime(170 + norm * 280 + turbulence * 240, t, 0.07);
    heli.bodyGain.gain.setTargetAtTime(0.48 + norm * 0.22 + load * 0.08, t, 0.07);
    heli.harmonicGain.gain.setTargetAtTime(0.08 + norm * 0.12 + turbulence * 0.06, t, 0.07);
    heli.noiseGain.gain.setTargetAtTime(0.012 + norm * 0.024 + turbulence * 0.045, t, 0.07);
    heli.chopGain.gain.setTargetAtTime(0.38 + chopPulse * (0.16 + norm * 0.18 + turbulence * 0.28), t, 0.05);
    heli.master.gain.setTargetAtTime(masterGain, t, active ? 0.05 : 0.12);
  }

  setPickupWinch(mode = null, progress = 0) {
    const ctx = this.#ensure();
    if (!ctx) return;
    const pickup = this.#ensurePickupVoice(ctx);
    const t = ctx.currentTime;
    if (!mode) {
      pickup.master.gain.setTargetAtTime(SILENT_GAIN, t, 0.06);
      return;
    }

    const lift = clamp01(1 - progress);
    const isRefugee = mode === 'refugee';
    const buzz = Math.abs(Math.sin(t * (11 + lift * 6)));
    pickup.toneOsc.frequency.setTargetAtTime((isRefugee ? 220 : 160) + lift * 90 + buzz * 16, t, 0.04);
    pickup.gritFilter.frequency.setTargetAtTime((isRefugee ? 380 : 250) + lift * 180, t, 0.05);
    pickup.toneGain.gain.setTargetAtTime((isRefugee ? 0.05 : 0.07) + buzz * 0.03, t, 0.05);
    pickup.gritGain.gain.setTargetAtTime((isRefugee ? 0.012 : 0.02) + lift * 0.02, t, 0.05);
    pickup.master.gain.setTargetAtTime(isRefugee ? 0.018 : 0.024, t, 0.05);
  }

  setAircraftFlyby(distance = Infinity, relX = 0, speed = 0) {
    const ctx = this.#ensure();
    if (!ctx) return;
    const plane = this.#ensurePlaneVoice(ctx);
    const t = ctx.currentTime;
    const activeRange = 72;
    if (!Number.isFinite(distance) || distance > activeRange) {
      plane.master.gain.setTargetAtTime(SILENT_GAIN, t, 0.14);
      return;
    }

    const close = clamp01(1 - distance / activeRange);
    const bodyFreq = 88 + close * 135 + speed * 0.4;
    const hissFreq = 260 + close * 420;
    plane.bodyOsc.frequency.setTargetAtTime(bodyFreq, t, 0.06);
    plane.hissFilter.frequency.setTargetAtTime(hissFreq, t, 0.08);
    plane.bodyGain.gain.setTargetAtTime(0.04 + close * 0.14, t, 0.08);
    plane.hissGain.gain.setTargetAtTime(0.01 + close * 0.05, t, 0.08);
    if (plane.panner) plane.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, relX / 55)), t, 0.08);
    plane.master.gain.setTargetAtTime(0.01 + close * close * 0.06, t, 0.08);
  }

  setCycloneBuffet(intensity = 0) {
    const ctx = this.#ensure();
    if (!ctx) return;
    const buffet = this.#ensureBuffetVoice(ctx);
    const t = ctx.currentTime;
    if (intensity <= 0.001) {
      buffet.master.gain.setTargetAtTime(SILENT_GAIN, t, 0.12);
      return;
    }

    const force = clamp01(intensity);
    buffet.lowpass.frequency.setTargetAtTime(120 + force * 260, t, 0.08);
    buffet.bandpass.frequency.setTargetAtTime(48 + force * 180, t, 0.08);
    buffet.noiseGain.gain.setTargetAtTime(0.08 + force * 0.08, t, 0.08);
    buffet.master.gain.setTargetAtTime(0.012 + force * force * 0.08, t, 0.08);
  }

  stopHelicopter() {
    if (!this.heli || !this.ctx) return;
    this.heli.master.gain.setTargetAtTime(SILENT_GAIN, this.ctx.currentTime, 0.08);
  }

  stopWorldAudio() {
    if (!this.ctx) return;
    if (this.heli) this.heli.master.gain.setTargetAtTime(SILENT_GAIN, this.ctx.currentTime, 0.08);
    if (this.pickup) this.pickup.master.gain.setTargetAtTime(SILENT_GAIN, this.ctx.currentTime, 0.06);
    if (this.plane) this.plane.master.gain.setTargetAtTime(SILENT_GAIN, this.ctx.currentTime, 0.12);
    if (this.buffet) this.buffet.master.gain.setTargetAtTime(SILENT_GAIN, this.ctx.currentTime, 0.12);
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
      return;
    }
    if (name === 'pickupCrateAttach') {
      this.#tone(ctx, 150, t, 0.12, 'square', 0.045);
      this.#tone(ctx, 210, t + 0.03, 0.14, 'triangle', 0.04);
      return;
    }
    if (name === 'pickupCrateComplete') {
      this.#tone(ctx, 320, t, 0.08, 'triangle', 0.05);
      this.#tone(ctx, 460, t + 0.07, 0.12, 'triangle', 0.045);
      return;
    }
    if (name === 'pickupRefugeeAttach') {
      this.#tone(ctx, 620, t, 0.08, 'sine', 0.035);
      this.#tone(ctx, 780, t + 0.05, 0.1, 'sine', 0.03);
      return;
    }
    if (name === 'pickupRefugeeComplete') {
      this.#tone(ctx, 720, t, 0.08, 'triangle', 0.04);
      this.#tone(ctx, 980, t + 0.06, 0.12, 'triangle', 0.038);
      return;
    }
    if (name === 'crashImpact') {
      this.#noiseBurst(ctx, t, 0.28, 0.09, 720);
      this.#tone(ctx, 120, t, 0.22, 'sawtooth', 0.06);
      this.#tone(ctx, 78, t + 0.03, 0.35, 'triangle', 0.06);
    }
  }
}
