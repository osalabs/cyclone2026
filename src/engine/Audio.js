import jsfxrModule from 'https://cdn.jsdelivr.net/npm/jsfxr@1.4.0/+esm';

const jsfxr = typeof jsfxrModule === 'function'
  ? jsfxrModule
  : (typeof jsfxrModule?.default === 'function' ? jsfxrModule.default : jsfxrModule?.jsfxr);

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
    if (typeof jsfxr !== 'function') {
      console.warn('jsfxr ESM import did not expose a generator function; audio disabled');
      return;
    }
    this.sounds.drop = new Audio(jsfxr([3, 0.03, 0.11, 0.23, 0.18, 0.42, 0, -0.14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]));
    this.sounds.tick = new Audio(jsfxr([0, 0.01, 0.05, 0.17, 0.07, 0.25, 0, 0, 0, 0, 0, 0, 0, 0.11, 0, 0, 0, 1, 0, 0]));
    this.rotorLoop = new Audio(jsfxr([3, 0.08, 0.31, 0.02, 0.39, 0.13, 0, -0.33, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]));
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
