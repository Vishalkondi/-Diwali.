import { rnd } from './math';

/** Logical stage size. Every scene draws in these units. */
export const W = 1280;
export const H = 720;

export const FONT_DISPLAY = '"Baloo 2", "Noto Sans Devanagari", system-ui, sans-serif';
export const FONT_BODY = '"DM Sans", system-ui, sans-serif';

/**
 * The context every piece draws into. Many canvases share one engine:
 * `withCtx` swaps it in, runs the draw, and restores the previous one.
 */
export let ctx: CanvasRenderingContext2D = null as unknown as CanvasRenderingContext2D;

/** The context of the canvas currently being drawn (inside `withCtx`). */
export const currentCtx = () => ctx;

export function withCtx(c: CanvasRenderingContext2D, draw: () => void) {
  const prev = ctx;
  ctx = c;
  c.save();
  try {
    draw();
  } finally {
    c.restore();
    ctx = prev;
  }
}

const rgbCache = new Map<string, [number, number, number]>();
function rgb(hex: string): [number, number, number] {
  let v = rgbCache.get(hex);
  if (!v) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}

export const rgba = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`;
};

export function mix(a: string, b: string, p: number) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * p);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}

type Stops = [number, string][];

export function radial(x: number, y: number, r0: number, r1: number, stops: Stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function linear(x0: number, y0: number, x1: number, y1: number, stops: Stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Additive soft glow. */
export function glow(x: number, y: number, r: number, color: string, alpha = 1) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(x, y, 0, r, [
    [0, rgba(color, alpha)],
    [0.35, rgba(color, alpha * 0.4)],
    [1, rgba(color, 0)],
  ]);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Rounded-rect path (begins a new path). */
export function rr(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

export function circle(x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}

export function ellipse(x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
}

export function bg(style: string | CanvasGradient) {
  ctx.fillStyle = style;
  ctx.fillRect(-40, -40, W + 80, H + 80);
}

type TextOpts = {
  size: number;
  color?: string | CanvasGradient;
  weight?: number;
  font?: 'display' | 'body';
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  alpha?: number;
};

export function text(s: string, x: number, y: number, o: TextOpts) {
  ctx.save();
  ctx.font = `${o.weight ?? 700} ${o.size}px ${o.font === 'body' ? FONT_BODY : FONT_DISPLAY}`;
  ctx.fillStyle = o.color ?? '#fff';
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = o.baseline ?? 'middle';
  if (o.alpha !== undefined) ctx.globalAlpha *= Math.max(0, Math.min(1, o.alpha));
  ctx.fillText(s, x, y);
  ctx.restore();
}

/** Camera: zoom/rotate around (cx, cy) and pan. */
export function cam(scale: number, dx = 0, dy = 0, rot = 0, cx = W / 2, cy = H / 2) {
  ctx.translate(cx + dx, cy + dy);
  if (rot) ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
}

export function vignette(strength = 0.55) {
  ctx.save();
  ctx.fillStyle = radial(W / 2, H / 2, H * 0.35, W * 0.72, [
    [0, 'rgba(0,0,0,0)'],
    [1, `rgba(4,0,12,${strength})`],
  ]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

let noise: HTMLCanvasElement | null = null;
const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();

/** Film grain from a seeded noise tile, offset per frame (24 fps). */
export function grain(t: number, alpha = 0.06) {
  if (typeof document === 'undefined') return;
  if (!noise) {
    noise = document.createElement('canvas');
    noise.width = noise.height = 160;
    const n = noise.getContext('2d')!;
    const img = n.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd(i * 0.37) * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    n.putImageData(img, 0, 0);
  }
  let pat = patterns.get(ctx);
  if (!pat) {
    pat = ctx.createPattern(noise, 'repeat')!;
    patterns.set(ctx, pat);
  }
  const f = Math.floor(t * 24);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.translate(-Math.floor(rnd(f) * 160), -Math.floor(rnd(f + 0.5) * 160));
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W + 160, H + 160);
  ctx.restore();
}

/** Off-screen layer for cross-dissolves, sized to the target canvas. */
const layers = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>();
export function layerFor(target: CanvasRenderingContext2D, slot = 'a') {
  const { width, height } = target.canvas;
  const key = `${slot}:${width}x${height}`;
  let l = layers.get(key);
  if (!l) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    l = { canvas, ctx: canvas.getContext('2d')! };
    layers.set(key, l);
  }
  return l;
}
