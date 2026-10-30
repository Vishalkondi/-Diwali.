import { ctx } from './gfx';
import { TAU } from './math';

/** The studio's twelve glow colours; strokes store an index into this list. */
export const RANGOLI_COLOURS = [
  '#ff3d81', '#ff7a1a', '#ffb42e', '#ffe14d', '#2fbf6b', '#27d3c3',
  '#3fa8ff', '#7a5cff', '#c08bff', '#ff6bd6', '#fff3d6', '#ff4a3d',
];

export type Stroke = { c: number; w: number; p: number[] };

/**
 * Draws strokes (in ±1000 space) mirrored around a centre: each stroke is repeated
 * in every one of `folds` wedges, and reflected inside each wedge when `mirror` is on.
 * `upto` limits drawing to the first N points overall (for replays).
 */
export function drawRangoli(strokes: Stroke[], folds: number, mirror: boolean, size: number, upto = Infinity, glowy = true) {
  const k = size / 2000;
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(k, k);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  let budget = upto;
  for (const s of strokes) {
    if (budget <= 0) break;
    const n = Math.min(s.p.length / 2, budget);
    budget -= n;
    const col = RANGOLI_COLOURS[s.c] ?? '#fff';
    const path = new Path2D();
    path.moveTo(s.p[0]!, s.p[1]!);
    for (let i = 1; i < n; i++) path.lineTo(s.p[i * 2]!, s.p[i * 2 + 1]!);
    if (n === 1) path.lineTo(s.p[0]! + 0.1, s.p[1]!);
    for (let f = 0; f < folds; f++) {
      for (const flip of mirror ? [1, -1] : [1]) {
        ctx.save();
        ctx.rotate((f / folds) * TAU);
        ctx.scale(flip, 1);
        if (glowy) {
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.22;
          ctx.lineWidth = s.w * 3.2;
          ctx.stroke(path);
        }
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = col;
        ctx.lineWidth = s.w;
        ctx.stroke(path);
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, s.w * 0.25);
        ctx.stroke(path);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

export const pointCount = (strokes: Stroke[]) => strokes.reduce((n, s) => n + s.p.length / 2, 0);

/** "Surprise me": a generated rangoli of petals, rings and dots in one wedge. */
export function surpriseStrokes(folds: number): Stroke[] {
  const out: Stroke[] = [];
  const wedge = Math.PI / folds;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const palette = [...Array(12).keys()].sort(() => Math.random() - 0.5).slice(0, 4);
  const layers = 4 + Math.floor(Math.random() * 3);
  for (let L = 0; L < layers; L++) {
    const r0 = 120 + L * rand(120, 160);
    const len = rand(120, 220);
    const c = palette[L % palette.length]!;
    const w = Math.round(rand(10, 26));
    const kind = Math.random();
    const p: number[] = [];
    if (kind < 0.45) {
      // petal from r0 outward, bulging toward the wedge edge
      for (let i = 0; i <= 18; i++) {
        const u = i / 18;
        const r = r0 + u * len;
        const a = -Math.PI / 2 + Math.sin(u * Math.PI) * wedge * 0.8;
        p.push(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r));
      }
    } else if (kind < 0.75) {
      // arc across the wedge
      for (let i = 0; i <= 12; i++) {
        const a = -Math.PI / 2 + (i / 12) * wedge;
        p.push(Math.round(Math.cos(a) * r0), Math.round(Math.sin(a) * r0));
      }
    } else {
      // a dot
      const a = -Math.PI / 2 + wedge * 0.5;
      p.push(Math.round(Math.cos(a) * r0), Math.round(Math.sin(a) * r0), Math.round(Math.cos(a) * r0) + 1, Math.round(Math.sin(a) * r0));
    }
    out.push({ c, w, p: p.map((v) => Math.max(-1000, Math.min(1000, v))) });
  }
  // centre flower
  out.push({ c: palette[0]!, w: 22, p: [0, -40, 0, -110] });
  return out;
}
