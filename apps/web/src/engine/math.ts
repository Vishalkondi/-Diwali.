// Pure helpers. Nothing in the engine reads the clock or Math.random:
// every frame is a function of `t`, so scrubbing and replay are exact.

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Progress of `t` through the window [a, b], clamped to 0–1. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Ease-out cubic. */
export const eo = (p: number) => 1 - (1 - clamp(p)) ** 3;
/** Ease-in cubic. */
export const ei = (p: number) => clamp(p) ** 3;
/** Ease-in-out cubic. */
export const eio = (p: number) => {
  p = clamp(p);
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
};
/** Back-out: overshoots then settles. */
export const back = (p: number, s = 1.70158) => {
  p = clamp(p);
  return 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;
};
/** Damped spring from 0 to 1 with a little overshoot. */
export const spring = (p: number, damping = 6.5, freq = 11) => {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return 1 - Math.exp(-damping * p) * Math.cos(freq * p);
};

/** Seeded hash in [0, 1). Same seed, same value, forever. */
export function rnd(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
export const rr2 = (seed: number, a: number, b: number) => a + rnd(seed) * (b - a);

/** Smooth pseudo-noise from summed sines, in roughly [-1, 1]. */
export const wobble = (t: number, seed = 0) =>
  (Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 2.9 + seed * 1.3) * 0.3 + Math.sin(t * 5.3 + seed * 2.1) * 0.2);

/** Point along a polyline at 0–1 of its length. */
export function along(points: [number, number][], p: number): [number, number, number] {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]!;
    const [bx, by] = points[i]!;
    const l = Math.hypot(bx - ax, by - ay);
    lens.push(l);
    total += l;
  }
  let d = clamp(p) * total;
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i]!;
    if (d <= l || i === lens.length - 1) {
      const [ax, ay] = points[i]!;
      const [bx, by] = points[i + 1]!;
      const k = l === 0 ? 0 : Math.min(1, d / l);
      return [ax + (bx - ax) * k, ay + (by - ay) * k, Math.atan2(by - ay, bx - ax)];
    }
    d -= l;
  }
  const last = points[points.length - 1]!;
  return [last[0], last[1], 0];
}
