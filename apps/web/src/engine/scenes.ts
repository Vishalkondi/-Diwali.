import { bg, cam, circle, ctx, ellipse, glow, grain, H, layerFor, linear, radial, rgba, rr, text, vignette, W, withCtx } from './gfx';
import { along, back, clamp, eio, eo, lerp, rnd, seg, TAU } from './math';
import {
  bag,
  burst,
  C,
  type CardData,
  diya,
  diyaMark,
  embers,
  flame,
  homeScreen,
  mandala,
  packingScreen,
  phone,
  plate,
  pointer,
  productCard,
  rocket,
  springAt,
  stars,
} from './pieces';

/* ------------------------------------------------------------ overrides */

let routeOverride: number | null = null;
/** Lets the live tracker drive the rider (0–1). Pass null to return to the film's own timing. */
export function setRouteProgress(p: number | null) {
  routeOverride = p === null ? null : clamp(p);
}

let greetingName: string | null = null;
/** Recipient line under "Shubh Deepavali" in the greeting scene. */
export function setGreetingName(name: string | null) {
  greetingName = name;
}

const INDIGO_BG = () =>
  radial(W / 2, H * 0.45, 40, W * 0.75, [
    [0, '#2b1173'],
    [0.55, '#1b0a4a'],
    [1, '#0c0416'],
  ]);

/* --------------------------------------------------------------- scenes */

/** 1 · Diya hero: low-angle clay diya, neon halo on the ground, beads lighting, sparks. */
function sceneDiya(lt: number) {
  bg(radial(W / 2, 520, 20, 900, [
    [0, '#ff7a24'],
    [0.28, '#d8361a'],
    [0.6, '#6a0f18'],
    [1, '#1b0614'],
  ]));
  ctx.save();
  cam(1 + 0.09 * eio(seg(lt, 0, 3.8)), 0, 10 * eio(seg(lt, 0, 3.8)));

  // light streaks drifting sideways
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const y = 120 + rnd(i * 3.3) * 420;
    const len = 160 + rnd(i * 7.1) * 260;
    const x = ((rnd(i) * W + lt * (60 + rnd(i * 2) * 80)) % (W + len)) - len;
    ctx.strokeStyle = linear(x, y, x + len, y, [[0, 'rgba(255,200,120,0)'], [0.5, `rgba(255,214,150,${0.18 + rnd(i * 5) * 0.2})`], [1, 'rgba(255,200,120,0)']]);
    ctx.lineWidth = 1.5 + rnd(i * 9) * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y - 6);
    ctx.stroke();
  }
  ctx.restore();

  const cx = 640;
  const cy = 470;
  const ring = eo(seg(lt, 0.15, 1.5));
  const rx = 360;
  const ry = 78;
  const ringY = cy + 62;
  const head = lt * 2.3 - Math.PI / 2;

  const halo = (from: number, to: number) => {
    if (ring <= 0) return;
    const end = from + (to - from) * ring;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = linear(cx - rx, 0, cx + rx, 0, [[0, '#ff7a1a'], [0.5, '#ffd36a'], [1, '#ff3db0']]);
    for (const [w, a] of [[18, 0.12], [8, 0.35], [3, 0.8], [1.2, 1]] as const) {
      ctx.beginPath();
      ctx.ellipse(cx, ringY, rx, ry, 0, from, end);
      ctx.strokeStyle = w < 2 ? `rgba(255,255,240,${a})` : grad;
      ctx.globalAlpha = w < 2 ? a : a;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    ctx.restore();
  };
  const headPt = (a: number) => [cx + Math.cos(a) * rx, ringY + Math.sin(a) * ry] as const;

  // back half of the halo sits behind the diya
  halo(Math.PI, TAU);
  glow(cx, ringY, 420, '#ff8a2a', 0.18 * ring);

  // diya body (low angle)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(30,0,0,0.45)';
  ellipse(10, 110, 230, 26);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-170, 0);
  ctx.bezierCurveTo(-162, 80, -80, 112, 0, 112);
  ctx.bezierCurveTo(90, 112, 160, 78, 178, 4);
  ctx.lineTo(236, -26);
  ctx.lineTo(150, -14);
  ctx.closePath();
  ctx.fillStyle = linear(0, -20, 0, 112, [[0, '#d0612c'], [0.45, '#9c3a17'], [1, '#4d160a']]);
  ctx.fill();
  // painted band
  ctx.strokeStyle = 'rgba(255,220,170,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 18, 160, 52, 0, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();
  for (let i = 0; i < 15; i++) {
    const a = 0.16 * Math.PI + (i / 14) * 0.68 * Math.PI;
    circle(Math.cos(a) * 148, 40 + Math.sin(a) * 44, 3.2);
    ctx.fillStyle = i % 2 ? '#ffd36a' : '#fff1d6';
    ctx.fill();
  }
  // rim and oil
  ellipse(0, 0, 170, 40);
  ctx.fillStyle = linear(-170, 0, 170, 0, [[0, '#b84f25'], [0.5, '#e58450'], [1, '#b84f25']]);
  ctx.fill();
  ellipse(0, 4, 146, 30);
  ctx.fillStyle = radial(40, 0, 0, 150, [[0, '#ffe7a0'], [0.4, '#f0a43a'], [1, '#7a3a0c']]);
  ctx.fill();
  ctx.restore();
  glow(cx + 40, cy, 200, '#ffb040', 0.3 + 0.1 * Math.sin(lt * 9));

  // beads along the inner front rim, lighting in sequence
  for (let i = 0; i < 44; i++) {
    const a = 0.06 * Math.PI + (i / 43) * 0.88 * Math.PI;
    const on = seg(lt, 0.35 + i * 0.028, 0.5 + i * 0.028);
    const bx = cx + Math.cos(a) * 152;
    const by = cy + 6 + Math.sin(a) * 33;
    const col = i < 15 ? '#fff6e0' : i < 30 ? '#ffd84a' : '#ff8a2a';
    circle(bx, by, 3.4);
    ctx.fillStyle = on > 0 ? col : '#5a2410';
    ctx.fill();
    if (on > 0) glow(bx, by, 12, col, 0.8 * on);
  }

  // wick and the flame growing in
  const grow = eo(seg(lt, 0.5, 1.6));
  ctx.strokeStyle = '#2a1206';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx + 48, cy - 2);
  ctx.lineTo(cx + 54, cy - 16);
  ctx.stroke();
  flame(cx + 54, cy - 14, 210 * grow, lt, 1.3, 1);
  embers(cx + 54, cy - 60, lt, { count: 22, spread: 70, height: 330, drift: 140, seed: 4, size: 2.4, speed: 0.4 });
  embers(cx + 54, cy - 60, lt, { count: 12, spread: 90, height: 280, drift: -120, seed: 9, size: 1.8, speed: 0.35 });

  // front half of the halo, with a bright head circling it
  halo(0, Math.PI);
  if (ring > 0) {
    for (let k = 0; k < 10; k++) {
      const [hx, hy] = headPt(head - k * 0.04);
      glow(hx, hy, 26 - k * 2, '#ffffff', (0.8 - k * 0.07) * ring);
    }
  }
  ctx.restore();
}

/** 2 · App on a phone: the home screen, a cursor taps the Diwali Store. */
function sceneStore(lt: number) {
  bg(INDIGO_BG());
  stars(lt, 40, 3, 720);
  glow(640, 360, 420, '#7a2cff', 0.25);
  const rise = springAt(lt, 0, 1.1);
  const y = lerp(980, 362, rise) + Math.sin(lt * 1.3) * 6;
  const rot = lerp(0.16, 0, rise) + Math.sin(lt * 0.9) * 0.025;
  ctx.save();
  cam(1 + 0.04 * eio(seg(lt, 0, 3.8)));
  phone(640, y, 1, rot, () => homeScreen(lt, seg(lt, 1.2, 3.2)));
  ctx.restore();
}

export const FILM_CARDS: CardData[] = [
  { name: 'Pooja Ghee', sub: 'Pure cow ghee · 250 ml', price: '₹299', icon: 'ghee', tint: '#fff2c2' },
  { name: 'Kaju Katli', sub: 'Silver-leaf · 250 g', price: '₹199', icon: 'kaju', tint: '#ffe0c2' },
  { name: 'Clay Diyas', sub: 'Hand-painted · set of 12', price: '₹149', icon: 'diya', tint: '#ffd9a8' },
  { name: 'Rangoli Colours', sub: 'Bright powder · 5 shades', price: '₹99', icon: 'rangoli', tint: '#ffc9dc' },
  { name: 'LED String Lights', sub: 'Warm white · 10 m', price: '₹249', icon: 'lights', tint: '#fff0a8' },
  { name: 'Marigold Garland', sub: 'Fresh genda · 1.5 m', price: '₹129', icon: 'garland', tint: '#ffe7a0' },
];

/** 3 · Cards fan out of the phone into an arc. */
function sceneCards(lt: number) {
  bg(INDIGO_BG());
  stars(lt, 40, 5, 720);
  const drop = eo(seg(lt, 0, 0.55));
  ctx.save();
  cam(1 + 0.03 * eio(seg(lt, 0, 3.4)));
  glow(640, 330, 520, '#7a2cff', 0.2);
  phone(640, lerp(362, 700, drop), 1, 0, () => homeScreen(lt + 4, 0));
  for (let i = 0; i < 6; i++) {
    const k = i - 2.5;
    const p = springAt(lt, 0.3 + i * 0.13, 1.2);
    if (p <= 0) continue;
    const tx = 640 + k * 192;
    const ty = 290 + k * k * 15 + Math.sin(lt * 1.6 + i) * 5;
    const x = lerp(640, tx, p);
    const y = lerp(560, ty, p);
    const hover = i === 2 ? eo(seg(lt, 1.9, 2.3)) : 0;
    const s = lerp(0.3, 1, Math.min(1.2, p)) * (1 + 0.06 * hover);
    // fake 3D: rotate into the arc and narrow a touch
    ctx.save();
    ctx.translate(x, y - hover * 14);
    ctx.rotate(k * 0.11 * p);
    ctx.transform(1, 0, k * -0.02, 1, 0, 0);
    ctx.scale(s * (1 - Math.abs(k) * 0.025), s);
    productCard(-90, -115, FILM_CARDS[i]!, lt, hover);
    ctx.restore();
  }
  // hover cursor over the clay diyas card
  const c = eo(seg(lt, 1.5, 2.1));
  if (c > 0) pointer(lerp(900, 600, c), lerp(640, 340, c), 1.25);
  ctx.restore();
}

/** 4 · Packing: phone back at full height, bag bobbing in a soft circle. */
function scenePacking(lt: number, step = 1) {
  bg(INDIGO_BG());
  stars(lt, 30, 7, 720);
  glow(640, 360, 460, '#7a2cff', 0.22);
  const up = eo(seg(lt, 0, 0.6));
  ctx.save();
  cam(1 + 0.06 * eio(seg(lt, 0, 3)));
  phone(640, lerp(700, 362, up), 1, 0, () => packingScreen(lt, step));
  ctx.restore();
}

/** 5 · City: top-down night grid, a neon route, a rider and a firework. */
const CELL = 150;
const ROUTE: [number, number][] = [
  [-3.5, 2.5],
  [-3.5, 0.5],
  [-0.5, 0.5],
  [-0.5, -1.5],
  [2.5, -1.5],
].map(([x, y]) => [x! * CELL, y! * CELL]);

function sceneCity(lt: number) {
  bg('#0b0620');
  const p = routeOverride ?? eio(seg(lt, 0.2, 3.1));
  const [rx, ry] = along(ROUTE, p);
  const base = ctx.getTransform();

  ctx.save();
  // tilted, y-squashed world that follows the rider
  const camX = lerp(-1.4 * CELL, rx, 0.55);
  const camY = lerp(1.2 * CELL, ry, 0.55);
  ctx.translate(W / 2, H / 2 + 20);
  ctx.scale(1, 0.64);
  ctx.rotate(-0.62 + 0.08 * Math.sin(lt * 0.25) + 0.06 * eio(seg(lt, 0, 3)));
  const z = 1.02 + 0.1 * eio(seg(lt, 0, 3.2));
  ctx.scale(z, z);
  ctx.translate(-camX, -camY);

  // roads glow under the blocks
  const span = 8;
  for (let k = -span; k <= span; k++) {
    const v = (k + 0.5) * CELL;
    const orange = k % 3 === 0;
    for (const horiz of [true, false]) {
      ctx.beginPath();
      if (horiz) {
        ctx.moveTo(-span * CELL, v);
        ctx.lineTo(span * CELL, v);
      } else {
        ctx.moveTo(v, -span * CELL);
        ctx.lineTo(v, span * CELL);
      }
      ctx.strokeStyle = '#24165a';
      ctx.lineWidth = 34;
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = orange ? 'rgba(255,140,40,0.55)' : 'rgba(150,100,255,0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }
  // blocks with roofs and windows
  for (let i = -span; i < span; i++) {
    for (let j = -span; j < span; j++) {
      const bx = i * CELL - 58;
      const by = j * CELL - 58;
      if (Math.abs(bx - camX) > 1100 || Math.abs(by - camY) > 1100) continue;
      const seed = i * 31.7 + j * 17.3;
      ctx.fillStyle = rnd(seed) > 0.5 ? '#160f34' : '#1b1340';
      rr(bx, by, 116, 116, 6);
      ctx.fill();
      ctx.fillStyle = '#231a52';
      rr(bx + 10, by + 10, 96, 96, 4);
      ctx.fill();
      for (let w = 0; w < 16; w++) {
        const s = seed + w * 1.9;
        if (rnd(s) < 0.5) continue;
        const flick = 0.55 + 0.45 * Math.sin(lt * (1 + rnd(s + 1) * 5) + w);
        ctx.fillStyle = rgba(rnd(s + 2) > 0.5 ? '#ffd27a' : '#fff1cf', 0.75 * flick);
        ctx.fillRect(bx + 18 + (w % 4) * 22, by + 18 + Math.floor(w / 4) * 22, 9, 9);
      }
      if (rnd(seed + 5) > 0.78) {
        for (let d = 0; d < 9; d++) {
          const col = ['#ff3d81', '#ffb42e', '#27d3c3'][d % 3]!;
          const tw = 0.5 + 0.5 * Math.sin(lt * 4 + d + seed);
          ctx.fillStyle = rgba(col, tw);
          circle(bx + 12 + d * 11.5, by + 6, 2.6);
          ctx.fill();
        }
      }
    }
  }
  // the route: dim full path, bright travelled part
  const path = () => {
    ctx.beginPath();
    ROUTE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  path();
  ctx.strokeStyle = 'rgba(255,61,129,0.25)';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.moveTo(ROUTE[0]![0], ROUTE[0]![1]);
  for (let s = 0; s <= 60; s++) {
    const [x, y] = along(ROUTE, (s / 60) * p);
    ctx.lineTo(x, y);
  }
  for (const [w, a] of [[22, 0.15], [9, 0.45], [3, 1]] as const) {
    ctx.strokeStyle = w === 3 ? `rgba(255,240,250,${a})` : rgba(C.rose, a);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.restore();

  const toScreen = (x: number, y: number) => base.inverse().transformPoint(ctx.getTransform().transformPoint(new DOMPoint(x, y)));
  const riderPt = toScreen(rx, ry);
  const end = ROUTE[ROUTE.length - 1]!;
  const pinPt = toScreen(end[0], end[1]);
  ctx.restore();

  // huge concentric neon arcs sweeping across the frame
  const sweep = eo(seg(lt, 0, 1.8));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  [1020, 1100, 1180].forEach((r, k) => {
    const a0 = -Math.PI / 2 - 0.35;
    const a1 = a0 + (0.95 + k * 0.08) * sweep;
    const g = linear(-150, 0, 1280, 0, [[0, '#ffffff'], [0.5, '#ff7ac0'], [1, '#ff8a2a']]);
    for (const [w, a] of [[16, 0.08], [6, 0.22], [2, 0.75]] as const) {
      ctx.beginPath();
      ctx.arc(-160, 1080, r, a0, a1);
      ctx.strokeStyle = g;
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    const ha = a0 + ((lt * 0.35 + k * 0.3) % 1) * (a1 - a0);
    ctx.globalAlpha = 1;
    glow(-160 + Math.cos(ha) * r, 1080 + Math.sin(ha) * r, 30, '#ffffff', 0.7 * sweep);
  });
  ctx.restore();

  // destination pin and rider dot, upright in screen space
  const pulse = (lt * 0.9) % 1;
  ctx.strokeStyle = rgba('#ff2a4a', 0.7 * (1 - pulse));
  ctx.lineWidth = 3;
  ellipse(pinPt.x, pinPt.y, 14 + pulse * 40, (14 + pulse * 40) * 0.6);
  ctx.stroke();
  glow(pinPt.x, pinPt.y - 20, 60, '#ff2a4a', 0.5);
  ctx.save();
  ctx.translate(pinPt.x, pinPt.y);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-18, -22, -18, -46, 0, -46);
  ctx.bezierCurveTo(18, -46, 18, -22, 0, 0);
  ctx.fillStyle = '#ff2a4a';
  ctx.fill();
  circle(0, -32, 6.5);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  glow(riderPt.x, riderPt.y, 70, '#a64dff', 0.7);
  circle(riderPt.x, riderPt.y, 12);
  ctx.fillStyle = '#fff';
  ctx.fill();
  circle(riderPt.x, riderPt.y, 8.5);
  ctx.fillStyle = C.violet;
  ctx.fill();

  // golden starburst, upper right (repeats when the tracker loops this scene)
  const POP = 1.5;
  const fa = (lt - POP) % 3.6;
  rocket(1110, 560, 1120, 140, seg(lt % 3.6, POP - 0.5, POP));
  burst(1120, 140, fa, 7 + Math.floor((lt - POP) / 3.6), '#ffc21a', 160, 56);
  burst(1120, 140, fa - 0.12, 3, '#fff1a8', 85, 28);
}

/** 6–7 · Doorstep. `delivered` adds the bag on the mat and lights the diyas. */
const DIYA_SPOTS: [number, number, number][] = [
  [318, 652, 0.95],
  [392, 664, 1.05],
  [452, 640, 0.85],
  [828, 640, 0.85],
  [890, 664, 1.05],
  [962, 652, 0.95],
];

function sceneDoor(lt: number, delivered: boolean) {
  // dark smoky wall of bricks
  bg('#170b18');
  ctx.save();
  cam(1 + 0.07 * eio(seg(lt, 0, delivered ? 2.5 : 3)) + (delivered ? 0.06 : 0), 0, delivered ? -8 : 0);
  for (let row = 0; row < 24; row++) {
    for (let col = -1; col < 22; col++) {
      const x = col * 66 + (row % 2) * 33;
      const y = row * 27 - 20;
      if (y > 610) continue;
      const v = rnd(row * 13.1 + col * 7.7);
      ctx.fillStyle = `rgb(${38 + v * 14},${20 + v * 6},${30 + v * 10})`;
      ctx.fillRect(x + 2, y + 2, 62, 23);
    }
  }
  // drifting smoke
  for (let i = 0; i < 6; i++) {
    const x = (rnd(i) * 1400 + lt * (14 + i * 5)) % 1500 - 100;
    const y = 120 + rnd(i * 4.1) * 380;
    ctx.fillStyle = radial(x, y, 0, 260, [[0, 'rgba(70,40,80,0.28)'], [1, 'rgba(70,40,80,0)']]);
    ctx.fillRect(x - 260, y - 260, 520, 520);
  }
  // floor
  ctx.fillStyle = linear(0, 600, 0, 720, [[0, '#24121c'], [1, '#0d060c']]);
  ctx.fillRect(-60, 600, W + 120, 180);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(640 + i * 60, 600);
    ctx.lineTo(640 + i * 170, 760);
    ctx.stroke();
  }

  // warm light on the wall and floor once delivered
  const lights = DIYA_SPOTS.map((_, k) => (delivered ? eo(seg(lt, 0.45 + k * 0.12, 0.7 + k * 0.12)) : 0));
  const warm = lights.reduce((a, b) => a + b, 0) / 6;
  if (warm > 0) {
    glow(380, 640, 420, '#ff8a2a', 0.45 * warm);
    glow(900, 640, 420, '#ff8a2a', 0.45 * warm);
    glow(640, 500, 700, '#ff9a3a', 0.18 * warm);
  }

  // door frame and door
  ctx.fillStyle = '#2e1a10';
  ctx.fillRect(466, 84, 348, 520);
  ctx.fillStyle = linear(490, 0, 790, 0, [[0, '#6a3a1c'], [0.5, '#8a5028'], [1, '#5e3218']]);
  ctx.fillRect(490, 108, 300, 494);
  ctx.strokeStyle = 'rgba(40,18,6,0.35)';
  ctx.lineWidth = 1.2;
  for (let g = 0; g < 26; g++) {
    const gx = 496 + g * 11.5 + rnd(g) * 4;
    ctx.beginPath();
    ctx.moveTo(gx, 110);
    for (let yy = 110; yy <= 600; yy += 30) ctx.lineTo(gx + Math.sin(yy * 0.02 + g) * 2.5, yy);
    ctx.stroke();
  }
  const panel = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = linear(x, y, x + w, y + h, [[0, '#9a5c30'], [1, '#6a3a1c']]);
    ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
    ctx.strokeStyle = 'rgba(255,210,160,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + h - 10);
    ctx.lineTo(x + 10, y + 10);
    ctx.lineTo(x + w - 10, y + 10);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,8,2,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + w - 10, y + 10);
    ctx.lineTo(x + w - 10, y + h - 10);
    ctx.lineTo(x + 10, y + h - 10);
    ctx.stroke();
  };
  panel(518, 140, 244, 200);
  panel(518, 368, 244, 206);
  // brass plate "402"
  rr(598, 200, 84, 40, 6);
  ctx.fillStyle = linear(598, 200, 682, 240, [[0, '#ffe08a'], [0.5, '#d9a425'], [1, '#a8740e']]);
  ctx.fill();
  text('402', 640, 222, { size: 26, weight: 800, color: '#4a2a06' });
  // brass handle
  rr(744, 330, 18, 70, 8);
  ctx.fillStyle = '#b8860b';
  ctx.fill();
  circle(753, 352, 11);
  ctx.fillStyle = radial(749, 348, 0, 12, [[0, '#fff1a8'], [0.5, '#e0a72a'], [1, '#8a5a06']]);
  ctx.fill();
  glow(750, 350, 26, '#ffd060', 0.35 + warm * 0.3);

  // fairy lights down both sides of the frame
  for (const sx of [458, 822]) {
    ctx.strokeStyle = '#2f3d1e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = 96; y <= 600; y += 6) ctx.lineTo(sx + Math.sin(y * 0.06) * 6, y);
    ctx.stroke();
    for (let b = 0; b < 17; b++) {
      const y = 110 + b * 29;
      const bx = sx + Math.sin(y * 0.06) * 6;
      const col = ['#ff3d81', '#ffd24a', '#27d3c3', '#ff7a1a', '#c08bff'][b % 5]!;
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(lt * 3 + b * 0.8 + sx));
      glow(bx, y, 16, col, 0.6 * tw);
      circle(bx, y, 3.4);
      ctx.fillStyle = col;
      ctx.fill();
    }
  }

  // marigold toran with string lights across the top, dropping in
  const drop = delivered ? 1 : back(seg(lt, 0.15, 0.85));
  ctx.save();
  ctx.translate(0, (1 - drop) * -150);
  ctx.strokeStyle = '#4a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const x = 450 + i * 15.8;
    const y = 94 + Math.sin((i / 24) * Math.PI) * 18;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i <= 24; i++) {
    const x = 450 + i * 15.8;
    const y = 94 + Math.sin((i / 24) * Math.PI) * 18;
    if (i % 3 === 1) {
      // hanging marigold strands and mango leaves
      const sway = Math.sin(lt * 1.6 + i) * 2;
      for (let k = 1; k <= 3; k++) {
        circle(x + sway * k * 0.3, y + k * 13, 7);
        ctx.fillStyle = k % 2 ? '#ff8a00' : '#ffb800';
        ctx.fill();
      }
    } else if (i % 3 === 2) {
      ctx.save();
      ctx.translate(x, y + 4);
      ctx.rotate(Math.sin(lt + i) * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(8, 14, 0, 30);
      ctx.quadraticCurveTo(-8, 14, 0, 0);
      ctx.fillStyle = '#2f8f3a';
      ctx.fill();
      ctx.restore();
    }
    circle(x, y, 9);
    ctx.fillStyle = i % 2 ? '#ff8a00' : '#ffbe0b';
    ctx.fill();
    const tw = 0.5 + 0.5 * Math.sin(lt * 5 + i * 1.3);
    glow(x, y - 8, 10, '#fff1a8', 0.7 * tw);
  }
  ctx.restore();

  // doorbell with ripples, and a white plate
  rr(856, 250, 74, 42, 6);
  ctx.fillStyle = '#f6f2ea';
  ctx.fill();
  text('शुभ लाभ', 893, 272, { size: 15, weight: 700, color: '#b3261e' });
  rr(880, 330, 26, 40, 5);
  ctx.fillStyle = '#e8e2d6';
  ctx.fill();
  circle(893, 350, 7);
  ctx.fillStyle = '#ffd060';
  ctx.fill();
  glow(893, 350, 26, '#ffd060', 0.7);
  for (let k = 0; k < 2; k++) {
    const rp = ((lt * 0.8 + k * 0.5) % 1 + 1) % 1;
    circle(893, 350, 10 + rp * 34);
    ctx.strokeStyle = `rgba(255,220,120,${0.5 * (1 - rp)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // rangoli colours in the bottom-left corner
  ctx.save();
  ctx.translate(150, 668);
  ctx.scale(1, 0.32);
  mandala(0, 0, 110, lt, 1);
  ctx.restore();
  for (const [x, col] of [[60, '#ff3b5c'], [96, '#ffc21a'], [236, '#2fbf6b']] as const) {
    ellipse(x, 700, 22, 8);
    ctx.fillStyle = col;
    ctx.fill();
  }

  // doormat
  ctx.beginPath();
  ctx.moveTo(540, 604);
  ctx.lineTo(740, 604);
  ctx.lineTo(770, 660);
  ctx.lineTo(510, 660);
  ctx.closePath();
  ctx.fillStyle = '#5a1a1a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,120,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // diyas along the floor
  DIYA_SPOTS.forEach(([x, y, s], k) => diya(x, y, s, lt, lights[k]!, k));

  // the bag drops onto the mat and bounces
  if (delivered) {
    const p = seg(lt, 0, 0.75);
    const fall = p < 0.55 ? (p / 0.55) ** 2 : 1;
    const bounce = p < 0.55 ? 0 : Math.abs(Math.sin(((p - 0.55) / 0.45) * Math.PI)) * 24 * (1 - (p - 0.55) / 0.45);
    const y = lerp(260, 640, fall) - bounce;
    const squash = p > 0.55 && p < 0.65 ? 0.94 : 1;
    ctx.save();
    ctx.translate(640, y);
    ctx.scale(2 - squash, squash);
    bag(0, 0, 0.95, lt, 'paper');
    ctx.restore();
  }
  ctx.restore();
}

/** 8 · A rangoli ringed by twelve plates. */
function scenePlates(lt: number) {
  bg(INDIGO_BG());
  stars(lt, 30, 11, 720);
  const grow = seg(lt, 0, 0.75);
  ctx.save();
  cam(1 + 0.03 * eio(seg(lt, 0, 1.2)));
  mandala(640, 360, 210, lt, grow);
  const spin = lt * 0.22;
  for (let i = 0; i < 12; i++) {
    const pop = back(seg(lt, 0.08 + i * 0.045, 0.38 + i * 0.045), 2);
    if (pop <= 0) continue;
    const a = spin + (i / 12) * TAU - Math.PI / 2;
    plate(i, 640 + Math.cos(a) * 292, 360 + Math.sin(a) * 292, 40 * pop, lt);
  }
  ctx.restore();
}

/** 9 · The plates fly into the centre, leaving a pulsing halo. */
function sceneCollapse(lt: number) {
  bg(INDIGO_BG());
  const p = eio(seg(lt, 0, 0.42));
  const spin = (1 + lt) * 0.22;
  mandala(640, 360, 210 * (1 - p), 1 + lt, 1);
  for (let i = 0; i < 12; i++) {
    const a = spin + (i / 12) * TAU - Math.PI / 2 + p * 1.2;
    const r = 292 * (1 - p);
    if (r < 4) continue;
    plate(i, 640 + Math.cos(a) * r, 360 + Math.sin(a) * r, 40 * (1 - p * 0.8), lt);
  }
  const ring = seg(lt, 0.2, 0.5);
  const pulse = 1 + 0.06 * Math.sin(lt * 18);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, a, col] of [[40, 0.12, '#ff7ac0'], [16, 0.35, '#ffb0d8'], [5, 0.9, '#ffffff']] as const) {
    circle(640, 360, 170 * pulse);
    ctx.strokeStyle = rgba(col, a * ring);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.restore();
  glow(640, 360, 300, '#ff7ac0', 0.25 * ring);
}

/** 10 · Brand reveal on flat purple. */
function sceneBrand(lt: number) {
  bg('#6a00e0');
  bg(radial(640, 360, 0, 800, [[0, 'rgba(160,80,255,0.55)'], [1, 'rgba(60,0,140,0.4)']]));
  // bokeh drifting up
  for (let i = 0; i < 28; i++) {
    const x = rnd(i * 2.1) * W;
    const y = (((rnd(i * 4.7) * (H + 200) - lt * (40 + rnd(i) * 60)) % (H + 200)) + H + 200) % (H + 200) - 100;
    const r = 10 + rnd(i * 6.3) * 34;
    glow(x, y, r * 2, i % 3 ? '#ffd6ff' : '#ffc46a', 0.22);
  }
  const flash = 1 - seg(lt, 0, 0.18);
  if (flash > 0) bg(`rgba(255,240,255,${0.85 * flash})`);
  const pop = back(seg(lt, 0.04, 0.4), 2.2);
  ctx.save();
  ctx.translate(640, 330);
  ctx.scale(pop, pop);
  ctx.font = `800 150px ${'"Baloo 2", system-ui, sans-serif'}`;
  const tw = ctx.measureText('utsavly').width;
  const markW = 120;
  const left = -(tw + markW) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 40;
  diyaMark(left + 50, -4, 1.1, lt, '#fff', true);
  text('utsavly', left + markW + tw / 2, 0, { size: 150, weight: 800, color: '#f3eefa' });
  ctx.restore();
  ctx.restore();
  text('Ghar ghar jagmag.', 640, 440, { size: 36, weight: 600, color: '#ffe9b0', alpha: eo(seg(lt, 0.2, 0.45)) });
}

/** 11 · Greeting: a tiny diya flame and "Shubh Deepavali". */
function sceneGreeting(lt: number) {
  bg(INDIGO_BG());
  stars(lt, 80, 21, 720);
  const rise = eo(seg(lt, 0, 0.6));
  glow(640, 520 - rise * 160, 420 + rise * 120, '#ff8a2a', 0.38);
  glow(640, 300, 380, '#ffd6e8', 0.12 + 0.05 * Math.sin(lt * 4));
  diya(620, 590, 0.9, lt, 1, 2);
  const title = 'Shubh Deepavali';
  const shown = Math.floor(seg(lt, 0.02, 0.36) * title.length + 0.001);
  ctx.save();
  ctx.font = `800 96px "Baloo 2", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const full = ctx.measureText(title).width;
  const sub = title.slice(0, Math.max(shown, lt > 0.4 ? title.length : 0));
  ctx.shadowColor = 'rgba(255,200,120,0.75)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = linear(640 - full / 2, 230, 640 + full / 2, 300, [[0, '#fff3d6'], [0.5, '#ffe08a'], [1, '#fff3d6']]);
  ctx.fillText(sub, 640 - full / 2, 260);
  ctx.restore();
  const nameA = eo(seg(lt, 0.25, 0.5));
  text(greetingName ?? 'For you and your family', 640, 350, { size: 38, weight: 800, color: '#ffffff', alpha: nameA });
  text('Concept film · Utsavly is a fictional brand', 640, 690, { size: 15, weight: 500, font: 'body', color: C.muted, alpha: nameA });
}

/* ------------------------------------------------------------- timeline */

export type SceneInfo = { name: string; start: number; dur: number };

const SCENE_DRAW: ((lt: number) => void)[] = [
  sceneDiya,
  sceneStore,
  sceneCards,
  (lt) => scenePacking(lt, 1),
  sceneCity,
  (lt) => sceneDoor(lt, false),
  (lt) => sceneDoor(lt, true),
  scenePlates,
  sceneCollapse,
  sceneBrand,
  sceneGreeting,
];

export const SCENES: SceneInfo[] = [
  { name: 'Diya', start: 0, dur: 3.5 },
  { name: 'Store', start: 3.5, dur: 3.5 },
  { name: 'Cards', start: 7, dur: 3 },
  { name: 'Packing', start: 10, dur: 2.5 },
  { name: 'City', start: 12.5, dur: 3 },
  { name: 'Doorstep', start: 15.5, dur: 2 },
  { name: 'Delivered', start: 17.5, dur: 1.5 },
  { name: 'Rangoli', start: 19, dur: 1 },
  { name: 'Halo', start: 20, dur: 0.6 },
  { name: 'Brand', start: 20.6, dur: 0.6 },
  { name: 'Greeting', start: 21.2, dur: 0.6 },
];

export const DURATION = 21.8;
export const XFADE = 0.4;

/** Scene indices the live tracker uses for each order status. */
export const TRACKER_SCENES = { placed: 2, packing: 3, on_the_way: 4, delivered: 6 } as const;

function post(t: number) {
  vignette(0.5);
  grain(t, 0.07);
}

/** Darkens the whole frame toward the film's black (for dips between scenes). */
export function dim(alpha: number) {
  if (alpha > 0) bg(`rgba(10,3,20,${clamp(alpha)})`);
}

/** Draws one scene at its local time `lt` (no transitions), plus grain and vignette. */
export function renderScene(i: number, lt: number) {
  const draw = SCENE_DRAW[clamp(Math.round(i), 0, SCENE_DRAW.length - 1)]!;
  ctx.save();
  draw(lt);
  ctx.restore();
  post(lt);
}

export function sceneAt(t: number) {
  let i = 0;
  for (let k = 0; k < SCENES.length; k++) if (t >= SCENES[k]!.start) i = k;
  return i;
}

/** The whole film at time `t` (0–DURATION), with 0.4 s cross-dissolves between beats. */
export function render(t: number) {
  t = clamp(t, 0, DURATION);
  const i = sceneAt(t);
  const s = SCENES[i]!;
  // Which boundary (if any) are we dissolving across?
  let a = i;
  let b = -1;
  let mixP = 0;
  const next = SCENES[i + 1];
  if (next && t > next.start - XFADE / 2) {
    b = i + 1;
    mixP = seg(t, next.start - XFADE / 2, next.start + XFADE / 2);
  } else if (i > 0 && t < s.start + XFADE / 2) {
    a = i - 1;
    b = i;
    mixP = seg(t, s.start - XFADE / 2, s.start + XFADE / 2);
  }

  ctx.save();
  SCENE_DRAW[a]!(t - SCENES[a]!.start);
  ctx.restore();
  if (b >= 0 && mixP > 0) {
    const target = ctx;
    const layer = layerFor(target);
    layer.ctx.setTransform(target.getTransform());
    withCtx(layer.ctx, () => SCENE_DRAW[b]!(t - SCENES[b]!.start));
    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.globalAlpha = eio(mixP);
    target.drawImage(layer.canvas, 0, 0);
    target.restore();
  }
  post(t);
  // fade in from the dark at the very start
  const fadeIn = 1 - seg(t, 0, 0.35);
  if (fadeIn > 0) bg(`rgba(10,3,20,${fadeIn})`);
}

/** Night sky over a skyline with endless looping fireworks. */
export function renderFireworks(t: number) {
  bg(linear(0, 0, 0, H, [[0, '#07031a'], [0.6, '#1b0a4a'], [1, '#2a0f3a']]));
  stars(t, 120, 2, 520);
  glow(640, 720, 700, '#ff7a1a', 0.12);
  const SLOTS = 7;
  const P = 3.4;
  for (let k = 0; k < SLOTS; k++) {
    const local = t + k * (P / SLOTS) * 1.7;
    const cycle = Math.floor(local / P);
    const ph = local - cycle * P;
    const seed = k * 101 + cycle * 7.7;
    const x = 140 + rnd(seed) * 1000;
    const y = 110 + rnd(seed + 1) * 230;
    rocket(x + (rnd(seed + 2) - 0.5) * 80, 640, x, y, seg(ph, 0, 0.7));
    burst(x, y, ph - 0.7, seed, undefined, 110 + rnd(seed + 3) * 90, 40);
  }
  // skyline
  ctx.fillStyle = '#07030f';
  ctx.beginPath();
  ctx.moveTo(0, H);
  let x = 0;
  let i = 0;
  const tops: [number, number, number][] = [];
  while (x < W) {
    const w = 50 + rnd(i * 3.3) * 90;
    const h = 90 + rnd(i * 5.1) * 170;
    ctx.lineTo(x, H - h);
    ctx.lineTo(x + w, H - h);
    tops.push([x, w, h]);
    x += w;
    i++;
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  tops.forEach(([bx, bw, bh], b) => {
    for (let wy = H - bh + 14; wy < H - 10; wy += 18) {
      for (let wx = bx + 10; wx < bx + bw - 10; wx += 16) {
        const s = b * 13 + wx * 0.7 + wy * 0.3;
        if (rnd(s) < 0.6) continue;
        const fl = 0.6 + 0.4 * Math.sin(t * (0.5 + rnd(s + 1) * 2) + s);
        ctx.fillStyle = rgba(rnd(s + 2) > 0.5 ? '#ffd27a' : '#ffb35a', 0.7 * fl);
        ctx.fillRect(wx, wy, 6, 8);
      }
    }
  });
  vignette(0.4);
}
