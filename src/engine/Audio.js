import { sfxr as jsfxr } from 'https://cdn.jsdelivr.net/npm/jsfxr@1.4.0/+esm';

const LEGACY_SFXR_KEYS = [
  'wave_type',
  'p_env_attack',
  'p_env_sustain',
  'p_env_punch',
  'p_env_decay',
  'p_base_freq',
  'p_freq_limit',
  'p_freq_ramp',
  'p_freq_dramp',
  'p_vib_strength',
  'p_vib_speed',
  'p_arp_mod',
  'p_arp_speed',
  'p_duty',
  'p_duty_ramp',
  'p_repeat_speed',
  'p_pha_offset',
  'p_pha_ramp',
  'p_lpf_freq',
  'p_lpf_ramp',
  'p_lpf_resonance',
  'p_hpf_freq',
  'p_hpf_ramp',
];

function normalizeSfxParams(params) {
  if (!Array.isArray(params)) return params;
  const out = {};
  for (let i = 0; i < LEGACY_SFXR_KEYS.length; i++) out[LEGACY_SFXR_KEYS[i]] = params[i] ?? 0;
  out.sound_vol = params[23] ?? 0.5;
  out.sample_rate = 44100;
  out.sample_size = 8;
  return out;
}

function makeSfxAudio(params) {
  try {
    if (typeof jsfxr === 'function') return new Audio(jsfxr(params));
    if (jsfxr && typeof jsfxr.toWave === 'function') {
      const wave = jsfxr.toWave(normalizeSfxParams(params));
      if (typeof wave?.dataURI === 'string' && wave.dataURI.startsWith('data:audio/')) {
        return new Audio(wave.dataURI);
      }
    }
  } catch (err) {
    console.warn('jsfxr sound build failed', err);
  }
  return null;
}

export class AudioSystem {
  constructor() {
    this.enabled = false;
    this.sounds = {};
    this.rotorLoop = null;
    const unlock = () => {
      this.enabled = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  prepare() {
    this.sounds.drop = makeSfxAudio([3, 0.03, 0.11, 0.23, 0.18, 0.42, 0, -0.14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
    this.sounds.tick = makeSfxAudio([0, 0.01, 0.05, 0.17, 0.07, 0.25, 0, 0, 0, 0, 0, 0, 0, 0.11, 0, 0, 0, 1, 0, 0]);
    this.rotorLoop = makeSfxAudio([3, 0.08, 0.31, 0.02, 0.39, 0.13, 0, -0.33, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]);

    if (!this.sounds.drop || !this.sounds.tick || !this.rotorLoop) {
      console.warn('jsfxr ESM import did not expose a usable sound API; audio disabled');
      this.sounds = {};
      this.rotorLoop = null;
      return;
    }
    this.rotorLoop.loop = true;
    this.rotorLoop.volume = 0.25;
  }

  play(name) {
    if (!this.enabled || !this.sounds[name]) return;
    this.sounds[name].currentTime = 0;
    this.sounds[name].play();
  }

  updateRotor(speedLevel) {
    if (!this.enabled || !this.rotorLoop) return;
    const targetRate = 0.72 + (speedLevel + 2) * 0.15;
    this.rotorLoop.playbackRate = targetRate;
    if (Math.abs(speedLevel) > 0 && this.rotorLoop.paused) this.rotorLoop.play();
    if (Math.abs(speedLevel) === 0 && !this.rotorLoop.paused) this.rotorLoop.pause();
  }
}
