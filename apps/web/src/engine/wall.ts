import { bg, circle, ctx, ellipse, glow, grain, linear, radial, vignette } from './gfx';
import { clamp, eo, rnd, seg } from './math';
import { diya, stars } from './pieces';

export const WATER_TOP = 452;

/** Where a diya with this id floats on the river (logical 1280×720 coordinates). */
export function wallPos(id: number, decorative = false): { x: number; y: number; s: number } {
  const seed = decorative ? id * 7.31 + 1000 : id * 3.17;
  const x = 40 + rnd(seed) * 1200;
  const depth = rnd(seed + 0.5);
  const y = WATER_TOP + 26 + depth * (720 - WATER_TOP - 50);
  return { x, y, s: 0.32 + depth * 0.42 };
}

export type WallDiya = { id: number; decorative?: boolean; age?: number };

function temple(x: number, base: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, base);
  ctx.lineTo(x - w / 2, base - h * 0.45);
  ctx.quadraticCurveTo(x - w * 0.42, base - h * 0.85, x, base - h);
  ctx.quadraticCurveTo(x + w * 0.42, base - h * 0.85, x + w / 2, base - h * 0.45);
  ctx.lineTo(x + w / 2, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 1.5, base - h - 16, 3, 16);
  ctx.beginPath();
  ctx.moveTo(x + 1.5, base - h - 16);
  ctx.lineTo(x + 14, base - h - 11);
  ctx.lineTo(x + 1.5, base - h - 6);
  ctx.fill();
}

/** Night ghat: moon, temple skyline, steps, a rippling river and floating diyas. */
export function renderWall(t: number, real: WallDiya[], hover: number | null) {
  bg(linear(0, 0, 0, WATER_TOP, [[0, '#060215'], [0.7, '#1b0a4a'], [1, '#3a1450']]));
  stars(t, 90, 4, 330);
  // moon
  glow(1040, 110, 160, '#fff1c8', 0.25);
  circle(1040, 110, 38);
  ctx.fillStyle = radial(1030, 100, 4, 40, [[0, '#fffbe8'], [1, '#f1deb0']]);
  ctx.fill();
  // temple skyline
  ctx.fillStyle = '#0d0618';
  const base = WATER_TOP - 40;
  ctx.fillRect(0, base - 40, 1280, 80);
  for (let i = 0; i < 9; i++) temple(80 + i * 150 + rnd(i) * 40, base - 30, 70 + rnd(i + 2) * 50, 90 + rnd(i + 5) * 110);
  // lit windows / lamps on the ghat
  for (let i = 0; i < 40; i++) {
    const x = rnd(i * 4.4) * 1280;
    const y = base - 30 + rnd(i * 2.2) * 60;
    const f = 0.6 + 0.4 * Math.sin(t * 3 + i);
    glow(x, y, 10, '#ffb042', 0.5 * f);
  }
  // steps
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = k % 2 ? '#1a0f24' : '#22142e';
    ctx.fillRect(0, base + 10 + k * 8, 1280, 8);
  }
  // river
  ctx.fillStyle = linear(0, WATER_TOP, 0, 720, [[0, '#120a33'], [1, '#05020f']]);
  ctx.fillRect(0, WATER_TOP, 1280, 720 - WATER_TOP);
  glow(1040, WATER_TOP + 60, 220, '#fff1c8', 0.08);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const y = WATER_TOP + 8 + rnd(i * 1.7) * (720 - WATER_TOP);
    const len = 30 + rnd(i * 3.1) * 120;
    const x = ((rnd(i) * 1400 + t * (8 + rnd(i * 5) * 14)) % 1400) - 60;
    ctx.strokeStyle = `rgba(160,140,255,${0.06 + 0.06 * Math.sin(t * 2 + i)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.restore();

  const all: (WallDiya & { x: number; y: number; s: number })[] = [];
  for (let i = 0; i < 70; i++) all.push({ id: i, decorative: true, ...wallPos(i, true) });
  for (const d of real) all.push({ ...d, ...wallPos(d.id) });
  all.sort((a, b) => a.y - b.y);

  for (const d of all) {
    const bob = Math.sin(t * 1.3 + d.id) * 2.2 * d.s;
    let y = d.y + bob;
    let alpha = 1;
    // A newly lit diya drops onto the water, then ripples spread out.
    if (d.age !== undefined && d.age < 3) {
      const fall = eo(seg(d.age, 0, 0.8));
      y = d.y - (1 - fall) * 380;
      alpha = clamp(d.age / 0.2);
      if (d.age > 0.75) {
        for (let k = 0; k < 3; k++) {
          const rp = seg(d.age, 0.75 + k * 0.25, 2.6 + k * 0.25);
          if (rp <= 0 || rp >= 1) continue;
          ctx.strokeStyle = `rgba(255,214,140,${0.6 * (1 - rp)})`;
          ctx.lineWidth = 2;
          ellipse(d.x, d.y + 6 * d.s, 20 + rp * 140 * d.s, (20 + rp * 140 * d.s) * 0.28);
          ctx.stroke();
        }
      }
    }
    // reflection
    const ref = d.decorative ? 0.18 : 0.35;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radial(d.x + 30 * d.s, y + 30 * d.s, 0, 60 * d.s, [[0, `rgba(255,160,60,${ref})`], [1, 'rgba(255,160,60,0)']]);
    ctx.save();
    ctx.translate(d.x + 30 * d.s, y + 30 * d.s);
    ctx.scale(0.45, 1.6);
    ctx.beginPath();
    ctx.arc(0, 0, 60 * d.s, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha * (d.decorative ? 0.8 : 1);
    diya(d.x, y, d.s, t, d.decorative ? 0.8 : 1, d.id);
    ctx.restore();
    if (!d.decorative && hover === d.id) {
      ctx.strokeStyle = 'rgba(255,240,200,0.85)';
      ctx.lineWidth = 2;
      ellipse(d.x + 10 * d.s, y - 6 * d.s, 60 * d.s, 34 * d.s);
      ctx.stroke();
    }
  }
  vignette(0.45);
  grain(t, 0.05);
}

/** Flame position of a real diya, for hit-testing (matches `renderWall`). */
export function flamePoint(id: number) {
  const p = wallPos(id);
  return { x: p.x + 40 * p.s, y: p.y - 22 * p.s, r: Math.max(18, 46 * p.s) };
}
