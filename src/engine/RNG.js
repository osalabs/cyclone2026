/** Deterministic RNG built from string seed. */
export class RNG {
  constructor(seedText) {
    this.seedText = seedText;
    this.state = this.#hash(seedText);
  }
  #hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  next() {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  bool(chance = 0.5) {
    if (chance <= 0) return false;
    if (chance >= 1) return true;
    return this.next() < chance;
  }
  range(min, max) { return min + (max - min) * this.next(); }
  int(min, maxInclusive) { return Math.floor(this.range(min, maxInclusive + 1)); }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  fork(suffix) { return new RNG(`${this.seedText}:${suffix}`); }
}
