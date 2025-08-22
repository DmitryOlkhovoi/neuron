// Deterministic PRNG for reproducible runs (Mulberry32)
// Usage:
//   setRandomSeed(12345)
//   const r = randomFloat(); // [0,1)
//   const v = randomRange(-1, 1);

let _state = 0x12345678 >>> 0; // default seed

export function setRandomSeed(seed: number) {
  // force to uint32
  _state = (seed >>> 0) || 0x12345678;
}

export function randomFloat(): number {
  // mulberry32
  let t = (_state += 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomRange(min: number, max: number): number {
  return min + (max - min) * randomFloat();
}
