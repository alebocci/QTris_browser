export function seedFromString(s: any): number {
  let str: string;
  try {
    if (typeof s === 'string') str = s;
    else if (s == null) str = '';
    else if (typeof s === 'number' || typeof s === 'bigint' || typeof s === 'boolean') str = String(s);
    else str = JSON.stringify(s);
  } catch {
    str = String(s);
  }
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0);
}
export function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class RNG {
  private fn: () => number;
  constructor(seed: any) { this.fn = mulberry32(seedFromString(seed)); }
  roll(N: number): number { return Math.floor(this.fn() * N) + 1; }
}
