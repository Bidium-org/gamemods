// One step of mulberry32: a roll in [0, 1) and the next state
export const roll = (rng: number): [number, number] => {
  const next = (rng + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), next | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
};
