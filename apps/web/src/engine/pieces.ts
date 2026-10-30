import {
  circle,
  ctx,
  ellipse,
  FONT_DISPLAY,
  glow,
  linear,
  radial,
  rgba,
  rr,
  text,
} from './gfx';
import { back, clamp, eo, rnd, seg, spring, TAU } from './math';

export const C = {
  ink: '#0c0416',
  panel: '#170a29',
  plum: '#3a0b4d',
  indigo: '#1b0a4a',
  marigold: '#ffb42e',
  saffron: '#ff7a1a',
  rose: '#ff3d81',
  teal: '#27d3c3',
  cream: '#fff3d6',
  muted: '#a999c4',
  success: '#2fbf6b',
  purple: '#6a00e0',
  violet: '#7a2cff',
  dark: '#1d1230',
  grey: '#6b6380',
} as const;

/* ------------------------------------------------------------------ flame */

/**
 * A teardrop flame whose base sits at (x, y). Flicker comes from summed sines,
 * so the same `t` always yields the same shape.
 */
export function flame(x: number, y: number, h: number, t: number, seed = 0, intensity = 1) {
  if (h <= 0.5) return;
  const f = 1 + 0.07 * Math.sin(t * 13.1 + seed) + 0.04 * Math.sin(t * 21.7 + seed * 2.3) + 0.03 * Math.sin(t * 34.3 + seed * 0.7);
  const hh = h * f;
  const w = hh * 0.34;
  const sway = hh * 0.07 * (Math.sin(t * 5.3 + seed) + 0.5 * Math.sin(t * 11.2 + seed * 1.7));

  glow(x, y - hh * 0.35, hh * 1.9, '#ff8a2a', 0.42 * intensity);
  glow(x, y - hh * 0.3, hh * 0.8, '#ffc04a', 0.5 * intensity);

  const tear = (scale: number, dy: number) => {
    const th = hh * scale;
    const tw = w * scale;
    const by = y + dy;
    ctx.beginPath();
    ctx.moveTo(x, by + tw * 0.2);
    ctx.bezierCurveTo(x - tw * 1.05, by, x - tw * 0.55, by - th * 0.55, x + sway * scale, by - th);
    ctx.bezierCurveTo(x + tw * 0.55, by - th * 0.55, x + tw * 1.05, by, x, by + tw * 0.2);
    ctx.closePath();
  };

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  tear(1, 0);
  ctx.fillStyle = radial(x, y - hh * 0.2, 0, hh, [
    [0, rgba('#fff4c2', 0.95 * intensity)],
    [0.35, rgba('#ffb42e', 0.9 * intensity)],
    [0.75, rgba('#ff5a1a', 0.75 * intensity)],
    [1, rgba('#c81e1e', 0)],
  ]);
  ctx.fill();
  tear(0.55, -hh * 0.02);
  ctx.fillStyle = radial(x, y - hh * 0.12, 0, hh * 0.5, [
    [0, rgba('#ffffff', intensity)],
    [0.6, rgba('#fff3b0', 0.9 * intensity)],
    [1, rgba('#ffd060', 0)],
  ]);
  ctx.fill();
  ctx.restore();
}

/* ----------------------------------------------------------------- embers */

type EmberOpts = { count?: number; spread?: number; height?: number; seed?: number; drift?: number; color?: string; size?: number; speed?: number };

/** Rising additive sparks; each one's position is a function of t and its index. */
export function embers(x: number, y: number, t: number, o: EmberOpts = {}) {
  const { count = 14, spread = 40, height = 180, seed = 1, drift = 0, color = '#ffb42e', size = 2.2, speed = 0.45 } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const r = rnd(seed * 31 + i * 7.13);
    const life = ((t * speed * (0.6 + r * 0.8) + rnd(seed + i * 3.7)) % 1 + 1) % 1;
    const px = x + (rnd(i * 9.1 + seed) - 0.5) * spread + Math.sin(t * 2 + i) * 8 * life + drift * life;
    const py = y - life * height;
    const a = Math.sin(life * Math.PI) * 0.9;
    const s = size * (0.6 + r * 0.8) * (1 - life * 0.5);
    ctx.fillStyle = rgba(color, a);
    circle(px, py, s);
    ctx.fill();
    ctx.fillStyle = rgba(color, a * 0.25);
    circle(px, py, s * 3);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ diyas */

/** A small clay diya, three-quarter view, centred on its rim at (x, y). Size 1 ≈ 80px wide. */
export function diya(x: number, y: number, s: number, t: number, lit = 1, seed = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (lit > 0) glow(0, 6, 90, '#ff8a2a', 0.35 * lit);
  // bowl
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.bezierCurveTo(-38, 22, -18, 30, 0, 30);
  ctx.bezierCurveTo(18, 30, 36, 22, 40, 2);
  ctx.lineTo(52, -6);
  ctx.lineTo(34, -4);
  ctx.closePath();
  ctx.fillStyle = linear(0, -4, 0, 30, [
    [0, '#c95a2c'],
    [0.6, '#8e3416'],
    [1, '#5a1d0b'],
  ]);
  ctx.fill();
  // painted dots on the body
  ctx.fillStyle = 'rgba(255,236,200,0.75)';
  for (let i = 0; i < 7; i++) {
    circle(-27 + i * 9, 15 + Math.sin((i / 6) * Math.PI) * 4, 1.6);
    ctx.fill();
  }
  // rim and oil
  ellipse(0, 0, 40, 8);
  ctx.fillStyle = '#d97a45';
  ctx.fill();
  ellipse(0, 1, 34, 5.5);
  ctx.fillStyle = lit > 0 ? radial(10, 1, 0, 34, [[0, '#ffe08a'], [0.5, '#e09a2a'], [1, '#7a3c0c']]) : '#4a250e';
  ctx.fill();
  // wick
  ctx.strokeStyle = '#3a1a08';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, -2);
  ctx.lineTo(40, -8);
  ctx.stroke();
  ctx.restore();
  if (lit > 0) flame(x + 40 * s, y - 8 * s, 34 * s * lit, t, seed, lit);
}

/* ------------------------------------------------------------------ icons */

export type IconKey = 'diya' | 'rangoli' | 'sweets' | 'lights' | 'toran' | 'sparkler' | 'gift' | 'thali' | 'ghee' | 'kaju' | 'garland' | 'candle' | 'hamper' | 'dryfruit' | 'incense'
  | 'akhand' | 'floating' | 'stencil' | 'kandil' | 'curtain' | 'laddoo' | 'soan' | 'idol' | 'kumkum' | 'bandhanwar' | 'eco-hamper' | 'puja-hamper';

/** Products that read better with their own icon than with their category's. */
const PRODUCT_ICONS: Record<string, IconKey> = {
  'brass-akhand-diya': 'akhand',
  'floating-diyas': 'floating',
  'rangoli-stencil-kit': 'stencil',
  'akash-kandil': 'kandil',
  'curtain-lights': 'curtain',
  'kaju-katli': 'kaju',
  'motichoor-laddoo': 'laddoo',
  'soan-papdi': 'soan',
  'dry-fruit-box': 'dryfruit',
  'scented-candle-trio': 'candle',
  'lakshmi-hamper': 'puja-hamper',
  'mithai-hamper': 'sweets',
  'family-festive-hamper': 'hamper',
  'eco-diwali-hamper': 'eco-hamper',
  'agarbatti-bundle': 'incense',
  'lakshmi-ganesh-idol': 'idol',
  'kumkum-haldi-set': 'kumkum',
  'ghee-cotton-wicks': 'ghee',
  'beaded-bandhanwar': 'bandhanwar',
  'marigold-garlands': 'garland',
};

/** The icon for a product: its own if it has one, else its category's. */
export const productIconKey = (p: { slug: string; category: { icon: string } }) => PRODUCT_ICONS[p.slug] ?? p.category.icon;

/**
 * Product icons drawn in code inside a 100×100 box centred on (cx, cy).
 * `active` animates (flame, sparks, twinkles); inactive icons hold a still frame.
 */
export function drawIcon(key: IconKey | string, cx: number, cy: number, size: number, t: number, active = true) {
  const tt = active ? t : 0.8;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  switch (key) {
    case 'diya':
      iconDiya(tt);
      break;
    case 'rangoli':
      iconRangoli(tt, active);
      break;
    case 'sweets':
      iconSweets(tt);
      break;
    case 'kaju':
      iconKaju();
      break;
    case 'lights':
      iconLights(tt);
      break;
    case 'toran':
      iconToran(tt, false);
      break;
    case 'garland':
      iconToran(tt, true);
      break;
    case 'sparkler':
      iconSparkler(tt, active);
      break;
    case 'gift':
      iconGift(tt);
      break;
    case 'thali':
      iconThali(tt);
      break;
    case 'ghee':
      iconGhee();
      break;
    case 'candle':
      iconCandle(tt);
      break;
    case 'hamper':
      iconHamper('family', tt);
      break;
    case 'eco-hamper':
      iconHamper('eco', tt);
      break;
    case 'puja-hamper':
      iconHamper('puja', tt);
      break;
    case 'akhand':
      iconAkhand(tt);
      break;
    case 'floating':
      iconFloating(tt, active);
      break;
    case 'stencil':
      iconStencil();
      break;
    case 'kandil':
      iconKandil(tt);
      break;
    case 'curtain':
      iconCurtain(tt);
      break;
    case 'laddoo':
      iconLaddoo();
      break;
    case 'soan':
      iconSoan();
      break;
    case 'idol':
      iconIdol(tt);
      break;
    case 'kumkum':
      iconKumkum();
      break;
    case 'bandhanwar':
      iconBandhanwar(tt);
      break;
    case 'dryfruit':
      iconDryFruit();
      break;
    case 'incense':
      iconIncense(tt, active);
      break;
    default:
      iconDiya(tt);
  }
  ctx.restore();
}

function iconDiya(t: number) {
  ctx.fillStyle = 'rgba(80,30,10,0.18)';
  ellipse(0, 34, 36, 6);
  ctx.fill();
  diya(-8, 14, 0.95, t, 1, 2);
}

function cone(x: number, y: number, w: number, h: number, color: string, dark: string) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.18, y - h * 0.95, x, y - h);
  ctx.quadraticCurveTo(x + w * 0.18, y - h * 0.95, x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = linear(x - w / 2, 0, x + w / 2, 0, [
    [0, color],
    [0.7, color],
    [1, dark],
  ]);
  ctx.fill();
  ellipse(x, y, w / 2, w * 0.12);
  ctx.fillStyle = dark;
  ctx.fill();
}

function iconRangoli(t: number, active: boolean) {
  ellipse(0, 32, 46, 9);
  ctx.fillStyle = 'rgba(90,20,40,0.15)';
  ctx.fill();
  cone(-24, 30, 34, 40, '#ff3b5c', '#c41e3e');
  cone(24, 30, 34, 36, '#2fbf6b', '#178a46');
  cone(0, 32, 40, 52, '#ffc21a', '#e08a00');
  // powder sprinkles
  for (let i = 0; i < 14; i++) {
    const a = rnd(i * 3.1) * TAU;
    const d = 30 + rnd(i * 1.7) * 18;
    const tw = active ? 0.5 + 0.5 * Math.sin(t * 6 + i) : 0.8;
    ctx.fillStyle = rgba(['#ff3b5c', '#ffc21a', '#2fbf6b', '#ff7a1a'][i % 4]!, tw);
    circle(Math.cos(a) * d, 34 + Math.sin(a) * d * 0.18, 1.8);
    ctx.fill();
  }
}

function diamond(x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y);
  ctx.closePath();
}

function iconSweets(t: number) {
  ellipse(0, 30, 44, 9);
  ctx.fillStyle = '#e9d9b8';
  ctx.fill();
  const spots: [number, number][] = [[-20, 18], [14, 20], [-4, 4], [26, 4]];
  spots.forEach(([x, y], i) => {
    diamond(x, y, 36, 22);
    ctx.fillStyle = linear(x - 18, y, x + 18, y, [[0, '#f3e2c0'], [1, '#d9bf8f']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // silver leaf shimmer
    const sh = 0.4 + 0.4 * Math.sin(t * 3 + i * 1.3);
    ctx.fillStyle = `rgba(255,255,255,${sh})`;
    diamond(x - 3, y - 2, 12, 6);
    ctx.fill();
  });
  // a laddu
  circle(-30, 0, 11);
  ctx.fillStyle = radial(-33, -4, 0, 12, [[0, '#ffc25a'], [1, '#e8781a']]);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,60,0,0.4)';
  for (let i = 0; i < 6; i++) {
    circle(-30 + Math.cos(i) * 6, Math.sin(i * 2) * 6, 1);
    ctx.fill();
  }
}

function iconKaju() {
  // a red-and-yellow sweet box bar with kaju diamonds on top
  ctx.save();
  ctx.rotate(-0.12);
  rr(-40, -2, 80, 30, 6);
  ctx.fillStyle = '#e8322f';
  ctx.fill();
  rr(-40, 8, 80, 9, 0);
  ctx.fillStyle = '#ffcf33';
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    diamond(-27 + i * 18, -10, 22, 14);
    ctx.fillStyle = '#f1dfbb';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}


function iconLights(t: number) {
  // zig-zag wire with glowing bulbs
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) pts.push([-44 + i * 14.7, i % 2 ? 10 : -14]);
  ctx.strokeStyle = '#3d5a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  pts.forEach(([x, y], i) => {
    const on = 0.55 + 0.45 * Math.sin(t * 4 - i * 0.9);
    glow(x, y + 7, 16, '#ffd84a', 0.55 * on);
    ctx.fillStyle = '#ffe36b';
    ellipse(x, y + 7, 4.5, 6.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    circle(x - 1.2, y + 5, 1.5);
    ctx.fill();
  });
}

function marigold(x: number, y: number, r: number, i: number) {
  circle(x, y, r);
  ctx.fillStyle = i % 2 ? '#ff8a00' : '#ffb800';
  ctx.fill();
  ctx.fillStyle = i % 2 ? '#e86a00' : '#f09a00';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + i;
    circle(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.3);
    ctx.fill();
  }
}

function leaf(x: number, y: number, len: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.35, len * 0.5, 0, len);
  ctx.quadraticCurveTo(-len * 0.35, len * 0.5, 0, 0);
  ctx.fillStyle = '#2f8f3a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,255,180,0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, len - 3);
  ctx.stroke();
  ctx.restore();
}

function iconToran(t: number, arc: boolean) {
  const sway = Math.sin(t * 1.8) * 0.04;
  ctx.rotate(sway);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const x = -44 + p * 88;
    const y = arc ? 26 - Math.sin(p * Math.PI) * 40 : -26 + Math.sin(p * Math.PI) * 14;
    if (!arc && i % 2 === 0) leaf(x, y + 6, 26, Math.sin(t + i) * 0.08);
    marigold(x, y, 9, i);
  }
  if (!arc) {
    for (let i = 0; i < 5; i++) {
      const x = -36 + i * 18;
      for (let k = 0; k < 3; k++) marigold(x, -6 + k * 13 + Math.sin(i) * 3, 5.5, i + k);
    }
  }
}

function iconSparkler(t: number, active: boolean) {
  ctx.strokeStyle = '#8a8a96';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-30, 42);
  ctx.lineTo(10, -10);
  ctx.stroke();
  ctx.strokeStyle = '#4a4a55';
  ctx.beginPath();
  ctx.moveTo(-30, 42);
  ctx.lineTo(-18, 26);
  ctx.stroke();
  const x = 12;
  const y = -12;
  glow(x, y, 46, '#ffd060', 0.7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rot = active ? t * 2.4 : 0.3;
  for (let i = 0; i < 16; i++) {
    const a = rot + (i / 16) * TAU;
    const len = 16 + rnd(i * 4.3 + Math.floor(t * 12)) * (active ? 22 : 14);
    ctx.strokeStyle = i % 3 ? 'rgba(255,240,180,0.9)' : 'rgba(255,170,60,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
  circle(x, y, 4);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function iconGift(t: number) {
  const bob = Math.sin(t * 2) * 1.5;
  ctx.translate(0, bob);
  rr(-34, -8, 68, 48, 6);
  ctx.fillStyle = '#ff3d81';
  ctx.fill();
  rr(-38, -20, 76, 16, 5);
  ctx.fillStyle = '#ff5a96';
  ctx.fill();
  ctx.fillStyle = '#ffb42e';
  ctx.fillRect(-6, -20, 12, 60);
  // bow
  ctx.save();
  ctx.translate(0, -22);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(dir * 26, -20, dir * 26, 6, 0, 0);
    ctx.fillStyle = '#ffc94d';
    ctx.fill();
  }
  circle(0, 0, 5);
  ctx.fillStyle = '#e8941a';
  ctx.fill();
  ctx.restore();
}

function iconCandle(t: number) {
  ellipse(0, 36, 44, 7);
  ctx.fillStyle = 'rgba(80,30,10,0.18)';
  ctx.fill();
  const jars: [number, number, string, string][] = [[-26, 26, '#f6d7a8', '#d9a86a'], [26, 22, '#ffc9dc', '#e48aa8'], [0, 34, '#fff3d6', '#e6cfa0']];
  jars.forEach(([x, h, body, rim], i) => {
    rr(x - 13, 34 - h, 26, h, 5);
    ctx.fillStyle = linear(x - 13, 0, x + 13, 0, [[0, body], [0.7, body], [1, rim]]);
    ctx.fill();
    ellipse(x, 34 - h, 13, 3.5);
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x - 0.8, 34 - h - 6, 1.6, 6);
    flame(x, 34 - h - 5, 14, t, i * 2.1);
  });
}

function iconHamper(kind: 'family' | 'eco' | 'puja', t: number) {
  // goodies peeking out of a basket: wicker for family, jute and green for eco, red and brass for puja
  const eco = kind === 'eco';
  const puja = kind === 'puja';
  if (puja) {
    ellipse(-14, -4, 20, 6);
    ctx.fillStyle = linear(-34, 0, 6, 0, [[0, '#d9a425'], [0.5, '#ffe08a'], [1, '#c68a14']]);
    ctx.fill();
    diya(-14, -10, 0.34, t, 1, 4);
    rr(10, -22, 22, 24, 3);
    ctx.fillStyle = '#e8322f';
    ctx.fill();
    ctx.fillStyle = '#ffcf33';
    ctx.fillRect(10, -13, 22, 5);
  } else if (eco) {
    rr(-32, -30, 26, 32, 2);
    ctx.fillStyle = '#f3ead2';
    ctx.fill();
    ctx.fillStyle = '#7fbf3a';
    for (let i = 0; i < 5; i++) {
      circle(-26 + (i % 3) * 7, -22 + Math.floor(i / 3) * 8, 1.6);
      ctx.fill();
    }
    diya(16, -8, 0.3, t, 1, 7);
  } else {
    circle(-16, -6, 11);
    ctx.fillStyle = radial(-19, -10, 0, 12, [[0, '#ffc25a'], [1, '#e8781a']]);
    ctx.fill();
    rr(-2, -24, 16, 26, 3);
    ctx.fillStyle = '#ff3d81';
    ctx.fill();
    ctx.fillStyle = '#ffb42e';
    ctx.fillRect(4, -24, 4, 26);
    ellipse(24, -4, 10, 8);
    ctx.fillStyle = '#c8873a';
    ctx.fill();
  }
  const [top, bottom, rim, ribbon] = eco
    ? ['#c9b37a', '#9a8450', '#7a8f3a', '#2fbf6b']
    : puja
      ? ['#b8342a', '#7a1a14', '#e0a82a', '#ffcf33']
      : ['#d99a4e', '#a8662a', '#b8742f', '#ff3d81'];
  ctx.beginPath();
  ctx.moveTo(-42, 2);
  ctx.lineTo(42, 2);
  ctx.lineTo(34, 38);
  ctx.lineTo(-34, 38);
  ctx.closePath();
  ctx.fillStyle = linear(0, 2, 0, 38, [[0, top], [1, bottom]]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,10,0.35)';
  ctx.lineWidth = 1.5;
  for (let y = 10; y < 38; y += 8) {
    ctx.beginPath();
    ctx.moveTo(-40 + (y - 2) * 0.22, y);
    ctx.lineTo(40 - (y - 2) * 0.22, y);
    ctx.stroke();
  }
  rr(-44, -2, 88, 8, 4);
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.fillStyle = ribbon;
  ctx.fillRect(-4, -2, 8, 40);
}

function iconAkhand(t: number) {
  // brass diya on a stand under a glass chimney
  ellipse(0, 40, 34, 6);
  ctx.fillStyle = 'rgba(80,30,10,0.18)';
  ctx.fill();
  const brass = linear(-30, 0, 30, 0, [[0, '#b87a10'], [0.5, '#ffe08a'], [1, '#a86a0c']]);
  ctx.fillStyle = brass;
  ellipse(0, 36, 26, 6);
  ctx.fill();
  ctx.fillRect(-4, 14, 8, 22);
  ctx.beginPath();
  ctx.moveTo(-26, 6);
  ctx.quadraticCurveTo(0, 26, 26, 6);
  ctx.closePath();
  ctx.fill();
  flame(0, 4, 22, t, 1.3);
  ctx.beginPath();
  ctx.moveTo(-18, 6);
  ctx.bezierCurveTo(-28, -14, -12, -24, -12, -44);
  ctx.lineTo(12, -44);
  ctx.bezierCurveTo(12, -24, 28, -14, 18, 6);
  ctx.closePath();
  ctx.fillStyle = 'rgba(220,240,255,0.22)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ellipse(0, -44, 12, 3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.quadraticCurveTo(-18, -16, -8, -34);
  ctx.stroke();
}

function iconFloating(t: number, active: boolean) {
  // wax diyas floating in a bowl of water, with ripples
  ellipse(0, 18, 48, 20);
  ctx.fillStyle = linear(0, 0, 0, 38, [[0, '#4ab0d9'], [1, '#1f6f99']]);
  ctx.fill();
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const r = ((active ? t * 0.6 : 0) + i / 3) % 1;
    ellipse(-6, 16, 10 + r * 30, 4 + r * 10);
    ctx.strokeStyle = `rgba(255,255,255,${0.4 * (1 - r)})`;
    ctx.stroke();
  }
  const cups: [number, number, string][] = [[-22, 12, '#ff8fb3'], [6, 22, '#ffd23f'], [26, 8, '#9ee6a8']];
  cups.forEach(([x, y, c], i) => {
    const bob = Math.sin(t * 2 + i) * 1.5;
    ellipse(x, y + 4 + bob, 12, 5);
    ctx.fillStyle = c;
    ctx.fill();
    ellipse(x, y + bob, 10, 3.5);
    ctx.fillStyle = '#fff6dc';
    ctx.fill();
    flame(x, y + bob, 13, t, i * 2.7);
  });
}

function iconStencil() {
  // a round stencil plate with a cut-out motif, a filler cone and spilled powder
  ctx.save();
  ctx.rotate(-0.15);
  circle(-6, -4, 36);
  ctx.fillStyle = '#2a8fd9';
  ctx.fill();
  ctx.fillStyle = '#e6f3ff';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ellipse(-6 + Math.cos(a) * 18, -4 + Math.sin(a) * 18, 8, 3.5, a);
    ctx.fill();
  }
  circle(-6, -4, 6);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(32, 16);
  ctx.rotate(0.7);
  ctx.beginPath();
  ctx.moveTo(-7, -18);
  ctx.lineTo(7, -18);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fillStyle = '#ffc21a';
  ctx.fill();
  ctx.restore();
  const dots: [number, string][] = [[-30, '#ff3b5c'], [-18, '#ffc21a'], [-6, '#2fbf6b'], [6, '#ff7a1a']];
  dots.forEach(([x, c]) => {
    ellipse(x, 40, 6, 2.5);
    ctx.fillStyle = c;
    ctx.fill();
  });
}

function iconKandil(t: number) {
  // a paper star lantern on a string, glowing from inside, with a tassel
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(0, -34);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -34);
  ctx.rotate(Math.sin(t * 1.6) * 0.06);
  ctx.translate(0, 34);
  glow(0, 0, 50, '#ff9a3a', 0.45);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const r = i % 2 ? 15 : 34;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = radial(0, 0, 4, 34, [[0, '#ffe08a'], [0.5, '#ff7a1a'], [1, '#d4142a']]);
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.strokeStyle = i % 2 ? '#ffd23f' : '#ff3d81';
    ctx.beginPath();
    ctx.moveTo(i * 4, 28);
    ctx.lineTo(i * 5, 48);
    ctx.stroke();
  }
  ctx.restore();
}

function iconCurtain(t: number) {
  // a top wire with hanging strands of multicolour bulbs
  ctx.strokeStyle = '#3d5a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-46, -40);
  ctx.lineTo(46, -40);
  ctx.stroke();
  const colors = ['#ff3d81', '#ffd23f', '#27d3c3', '#7a2cff', '#ff7a1a'];
  for (let i = 0; i < 7; i++) {
    const x = -42 + i * 14;
    const len = 4 + (i % 3);
    ctx.strokeStyle = '#3d5a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, -40);
    ctx.lineTo(x, -40 + len * 15);
    ctx.stroke();
    for (let k = 1; k <= len; k++) {
      const y = -40 + k * 15;
      const c = colors[(i + k) % colors.length]!;
      const on = 0.55 + 0.45 * Math.sin(t * 4 - i * 0.7 - k);
      glow(x, y, 10, c, 0.5 * on);
      ellipse(x, y, 3, 4.5);
      ctx.fillStyle = c;
      ctx.fill();
    }
  }
}

function laddoo(x: number, y: number, r: number) {
  circle(x, y, r);
  ctx.fillStyle = radial(x - r * 0.3, y - r * 0.35, 0, r * 1.1, [[0, '#ffc25a'], [1, '#e8701a']]);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,60,0,0.4)';
  for (let i = 0; i < 7; i++) {
    circle(x + Math.cos(i * 2.1) * r * 0.55, y + Math.sin(i * 1.7) * r * 0.55, r * 0.09);
    ctx.fill();
  }
}

function iconLaddoo() {
  // a pyramid of motichoor laddoos on a steel plate
  ellipse(0, 34, 48, 10);
  ctx.fillStyle = linear(-48, 0, 48, 0, [[0, '#9aa0a8'], [0.5, '#e8ecf0'], [1, '#8a9098']]);
  ctx.fill();
  for (const x of [-27, -9, 9, 27]) laddoo(x, 22, 11);
  for (const x of [-18, 0, 18]) laddoo(x, 4, 11);
  for (const x of [-9, 9]) laddoo(x, -14, 11);
  laddoo(0, -31, 11);
}

function iconSoan() {
  // flaky soan papdi cubes stacked in an open box
  rr(-46, 6, 92, 32, 6);
  ctx.fillStyle = '#ff7a1a';
  ctx.fill();
  ctx.fillStyle = '#ffcf33';
  ctx.fillRect(-46, 26, 92, 5);
  const cubes: [number, number][] = [[-26, -2], [0, -2], [26, -2], [-13, -22], [13, -22]];
  cubes.forEach(([x, y]) => {
    rr(x - 12, y - 10, 24, 22, 3);
    ctx.fillStyle = '#f5dfa6';
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,140,60,0.5)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 6 + k * 5);
      ctx.lineTo(x + 10, y - 5 + k * 5);
      ctx.stroke();
    }
    ctx.fillStyle = '#7fbf3a';
    circle(x - 4, y - 10, 1.6);
    ctx.fill();
    circle(x + 5, y - 10, 1.4);
    ctx.fill();
  });
}

function iconIdol(t: number) {
  // a brass idol on a lotus pedestal with a halo behind
  glow(0, -10, 60, '#ffc04a', 0.25 + 0.05 * Math.sin(t * 2));
  circle(0, -16, 30);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.stroke();
  rr(-30, 30, 60, 10, 3);
  ctx.fillStyle = '#b8342a';
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    ellipse(-25 + i * 10, 28, 6, 4);
    ctx.fillStyle = '#ff8fb3';
    ctx.fill();
  }
  ctx.fillStyle = linear(-28, 0, 28, 0, [[0, '#a86a0c'], [0.5, '#ffe08a'], [1, '#a86a0c']]);
  ellipse(0, 22, 24, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-16, 20);
  ctx.quadraticCurveTo(-20, -6, 0, -8);
  ctx.quadraticCurveTo(20, -6, 16, 20);
  ctx.closePath();
  ctx.fill();
  circle(0, -18, 11);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, -26);
  ctx.lineTo(0, -40);
  ctx.lineTo(8, -26);
  ctx.closePath();
  ctx.fill();
  ellipse(14, 2, 4, 6);
  ctx.fill();
  circle(0, -18, 2);
  ctx.fillStyle = '#d4142a';
  ctx.fill();
}

function iconKumkum() {
  // a carved wooden box with four wells: kumkum, haldi, chandan and akshat
  ellipse(0, 40, 46, 6);
  ctx.fillStyle = 'rgba(80,30,10,0.18)';
  ctx.fill();
  rr(-44, -20, 88, 58, 8);
  ctx.fillStyle = linear(0, -20, 0, 38, [[0, '#9a5a26'], [1, '#5a2a10']]);
  ctx.fill();
  const wells: [number, number, string][] = [[-20, -4, '#d4142a'], [20, -4, '#ffc21a'], [-20, 22, '#f0c890'], [20, 22, '#fff6e6']];
  wells.forEach(([x, y, c], i) => {
    circle(x, y, 14);
    ctx.fillStyle = '#3a1a08';
    ctx.fill();
    circle(x, y, 11);
    ctx.fillStyle = c;
    ctx.fill();
    if (i === 3) {
      ctx.fillStyle = '#e8d8b8';
      for (let k = 0; k < 7; k++) {
        ellipse(x - 6 + (k % 4) * 4, y - 3 + Math.floor(k / 4) * 5, 2, 1, k);
        ctx.fill();
      }
    }
  });
  ctx.strokeStyle = 'rgba(255,220,170,0.35)';
  ctx.lineWidth = 1;
  rr(-40, -16, 80, 50, 6);
  ctx.stroke();
}

function iconBandhanwar(t: number) {
  // a fabric band with mirror discs and hanging bead strings
  ctx.rotate(Math.sin(t * 1.8) * 0.04);
  rr(-46, -34, 92, 18, 4);
  ctx.fillStyle = '#c41e5a';
  ctx.fill();
  ctx.fillStyle = '#ffcf33';
  ctx.fillRect(-46, -20, 92, 3);
  for (let i = 0; i < 5; i++) {
    const x = -36 + i * 18;
    circle(x, -25, 5);
    ctx.fillStyle = linear(x - 5, -30, x + 5, -20, [[0, '#ffffff'], [1, '#9ab0c8']]);
    ctx.fill();
  }
  const beads = ['#ffcf33', '#27d3c3', '#ff3d81', '#2fbf6b'];
  for (let i = 0; i < 7; i++) {
    const x = -39 + i * 13;
    const n = 4 + (i % 2 ? 1 : 3 - Math.abs(3 - i));
    for (let k = 0; k < n; k++) {
      circle(x, -12 + k * 9, 3.4);
      ctx.fillStyle = beads[(i + k) % beads.length]!;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(x, n * 9 - 15);
    ctx.lineTo(x - 4, n * 9 - 7);
    ctx.lineTo(x + 4, n * 9 - 7);
    ctx.closePath();
    ctx.fillStyle = '#ffb42e';
    ctx.fill();
  }
}

function iconDryFruit() {
  // an open gift box split into three wells, heaped with almonds, cashews and raisins
  ellipse(0, 38, 50, 7);
  ctx.fillStyle = 'rgba(80,30,10,0.18)';
  ctx.fill();
  rr(-48, 0, 96, 36, 8);
  ctx.fillStyle = '#c41e5a';
  ctx.fill();
  ctx.fillStyle = '#ffb42e';
  ctx.fillRect(-48, 22, 96, 6);
  for (const x of [-31, 0, 31]) {
    rr(x - 14, 2, 28, 16, 4);
    ctx.fillStyle = '#7a0f38';
    ctx.fill();
  }
  // almonds
  const almonds: [number, number, number][] = [[-38, 4, 0.6], [-26, 4, -0.5], [-32, -4, 0.1], [-24, -10, 0.9], [-38, -8, -0.8]];
  almonds.forEach(([x, y, a], i) => {
    ellipse(x, y, 8, 4.6, a);
    ctx.fillStyle = i % 2 ? '#b8743a' : '#9a5a26';
    ctx.fill();
    ellipse(x - 1.5, y - 1.2, 3, 1.4, a);
    ctx.fillStyle = 'rgba(255,220,170,0.4)';
    ctx.fill();
  });
  // cashews
  ctx.lineCap = 'round';
  const cashews: [number, number, number][] = [[-6, 4, 0], [6, 4, 0.4], [0, -5, -0.3], [-5, -13, 0.6], [6, -12, -0.2]];
  cashews.forEach(([x, y, a]) => {
    ctx.beginPath();
    ctx.arc(x, y, 6, Math.PI * 0.05 + a, Math.PI * 1.05 + a);
    ctx.strokeStyle = '#efd7a4';
    ctx.lineWidth = 6;
    ctx.stroke();
  });
  // raisins
  for (let i = 0; i < 9; i++) {
    ellipse(22 + (i % 3) * 8 + (Math.floor(i / 3) % 2) * 3, 5 - Math.floor(i / 3) * 6, 4.4, 3.4, i);
    ctx.fillStyle = i % 2 ? '#5a2a14' : '#7a3a1c';
    ctx.fill();
  }
}

function iconIncense(t: number, active: boolean) {
  // a brass stand with three agarbatti and curling smoke
  ellipse(0, 34, 40, 7);
  ctx.fillStyle = 'rgba(80,30,10,0.18)';
  ctx.fill();
  ellipse(0, 30, 30, 7);
  ctx.fillStyle = linear(-30, 0, 30, 0, [[0, '#c68a14'], [0.5, '#ffe08a'], [1, '#b87a10']]);
  ctx.fill();
  const sticks: [number, number][] = [[-12, -0.25], [0, 0], [12, 0.25]];
  sticks.forEach(([x, a], i) => {
    ctx.save();
    ctx.translate(x, 28);
    ctx.rotate(a);
    ctx.fillStyle = '#5a2a14';
    ctx.fillRect(-1.6, -58, 3.2, 44);
    ctx.fillStyle = '#c9a26b';
    ctx.fillRect(-0.8, -14, 1.6, 14);
    glow(0, -58, 6, '#ff6a1a', 0.8);
    circle(0, -58, 1.8);
    ctx.fillStyle = '#ff7a1a';
    ctx.fill();
    // smoke
    ctx.beginPath();
    for (let k = 0; k <= 13; k++) {
      const y = -60 - k * 1.6;
      const xx = Math.sin(k * 0.35 + (active ? t * 2 : 0) + i * 1.7) * (2 + k * 0.35);
      if (k) ctx.lineTo(xx, y);
      else ctx.moveTo(xx, y);
    }
    ctx.strokeStyle = 'rgba(120,110,140,0.45)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  });
}

function iconThali(t: number) {
  ellipse(0, 18, 46, 16);
  ctx.fillStyle = linear(-46, 0, 46, 0, [[0, '#d9a425'], [0.5, '#ffe08a'], [1, '#c68a14']]);
  ctx.fill();
  ellipse(0, 16, 38, 12);
  ctx.fillStyle = '#f2c14e';
  ctx.fill();
  // kumkum and haldi bowls
  ellipse(-22, 16, 8, 4);
  ctx.fillStyle = '#d4142a';
  ctx.fill();
  ellipse(-6, 22, 7, 3.5);
  ctx.fillStyle = '#ffc21a';
  ctx.fill();
  // flowers
  for (let i = 0; i < 4; i++) marigold(18 + (i % 2) * 10, 10 + Math.floor(i / 2) * 9, 4.2, i);
  diya(-2, 6, 0.42, t, 1, 5);
}

function iconGhee() {
  // stack of ghee tubs, yellow with red lids
  const tub = (x: number, y: number, w: number, h: number) => {
    rr(x - w / 2, y - h, w, h, 5);
    ctx.fillStyle = linear(x - w / 2, 0, x + w / 2, 0, [[0, '#ffd23f'], [0.6, '#ffe682'], [1, '#e8b100']]);
    ctx.fill();
    rr(x - w / 2 - 2, y - h - 7, w + 4, 9, 4);
    ctx.fillStyle = '#e8322f';
    ctx.fill();
    rr(x - w * 0.3, y - h * 0.68, w * 0.6, h * 0.36, 3);
    ctx.fillStyle = '#fff6dc';
    ctx.fill();
    ctx.fillStyle = '#e8322f';
    ctx.font = `800 ${Math.round(h * 0.22)}px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GHEE', x, y - h * 0.5);
  };
  tub(-20, 40, 40, 36);
  tub(22, 40, 40, 36);
  tub(0, 0, 44, 36);
}

/* -------------------------------------------------------------------- bag */

/** Paper delivery bag, base centred at (x, y). `purple` is the in-app packing bag. */
export function bag(x: number, y: number, s: number, t: number, variant: 'paper' | 'purple' = 'paper', rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const paper = variant === 'paper';
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(0, 0, 62, 9);
  ctx.fill();
  // handle
  ctx.strokeStyle = paper ? '#c9a77a' : '#4a14a8';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -118, 26, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.moveTo(-54, -118);
  ctx.lineTo(54, -118);
  ctx.lineTo(60, 0);
  ctx.lineTo(-60, 0);
  ctx.closePath();
  ctx.fillStyle = paper
    ? linear(-60, 0, 60, 0, [[0, '#f1e6cf'], [0.5, '#fffaf0'], [1, '#e2d3b4']])
    : linear(-60, 0, 60, 0, [[0, '#5b16c9'], [0.5, '#7a2cff'], [1, '#4c10ad']]);
  ctx.fill();
  // fold shading
  ctx.fillStyle = paper ? 'rgba(120,90,40,0.08)' : 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.moveTo(30, -118);
  ctx.lineTo(54, -118);
  ctx.lineTo(60, 0);
  ctx.lineTo(36, 0);
  ctx.closePath();
  ctx.fill();
  // top band
  ctx.beginPath();
  ctx.moveTo(-54, -118);
  ctx.lineTo(54, -118);
  ctx.lineTo(55.2, -96);
  ctx.lineTo(-55.2, -96);
  ctx.closePath();
  ctx.fillStyle = paper ? linear(-54, 0, 54, 0, [[0, C.rose], [1, C.saffron]]) : '#ffb42e';
  ctx.fill();
  // diya mark
  diyaMark(0, -58, 0.62, t, paper ? C.saffron : '#ffe08a');
  if (paper) text('utsavly', 0, -24, { size: 15, weight: 800, color: '#3a0b4d' });
  ctx.restore();
}

/** The brand mark: a stylised diya with a flame, inside a rounded badge when `badge`. */
export function diyaMark(x: number, y: number, s: number, t: number, color: string = C.saffron, badge = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (badge) {
    circle(0, 0, 46);
    ctx.fillStyle = linear(-46, -46, 46, 46, [[0, C.marigold], [1, C.rose]]);
    ctx.fill();
    color = '#3a0b4d';
  }
  ctx.beginPath();
  ctx.moveTo(-26, 2);
  ctx.quadraticCurveTo(-24, 22, 0, 22);
  ctx.quadraticCurveTo(24, 22, 26, 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  const f = 1 + 0.06 * Math.sin(t * 11);
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.bezierCurveTo(-10, -6, -6, -18 * f, 0, -30 * f);
  ctx.bezierCurveTo(6, -18 * f, 10, -6, 0, -2);
  ctx.fillStyle = badge ? '#fff3d6' : C.marigold;
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ phone */

export const PHONE_W = 310;
export const PHONE_H = 640;

/** Phone centred at (x, y). `screen` draws in screen space (290 × 620, origin top-left). */
export function phone(x: number, y: number, s: number, rot: number, screen: () => void) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  // rose edge glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, a] of [[26, 0.06], [12, 0.12], [4, 0.35]] as const) {
    rr(-PHONE_W / 2, -PHONE_H / 2, PHONE_W, PHONE_H, 46);
    ctx.strokeStyle = rgba(C.rose, a);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.restore();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  rr(-PHONE_W / 2, -PHONE_H / 2, PHONE_W, PHONE_H, 46);
  ctx.fillStyle = '#0d0a14';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  rr(-PHONE_W / 2 + 2, -PHONE_H / 2 + 2, PHONE_W - 4, PHONE_H - 4, 44);
  ctx.strokeStyle = '#2a2433';
  ctx.lineWidth = 2;
  ctx.stroke();
  // screen
  ctx.save();
  rr(-145, -310, 290, 620, 38);
  ctx.clip();
  ctx.translate(-145, -310);
  screen();
  ctx.restore();
  // dynamic island
  rr(-46, -300, 92, 26, 13);
  ctx.fillStyle = '#000';
  ctx.fill();
  circle(28, -287, 4.5);
  ctx.fillStyle = '#16131f';
  ctx.fill();
  ctx.restore();
}

function statusBar(dark = true) {
  const c = dark ? '#16101f' : '#fff';
  text('6:40', 34, 27, { size: 14, weight: 700, font: 'body', color: c });
  // signal + battery
  ctx.fillStyle = c;
  for (let i = 0; i < 4; i++) ctx.fillRect(218 + i * 5, 30 - i * 3, 3, 4 + i * 3);
  rr(242, 21, 24, 12, 3);
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  rr(244.5, 23.5, 16, 7, 1.5);
  ctx.fill();
}

const CAT_DOTS = ['#ff7a1a', '#e0218a', '#ffd23f', '#e0a100', '#e8322f', '#ffcf33', '#7a2cff', '#ff8c2e'];
const CAT_LABELS = ['Diyas', 'Rangoli', 'Lights', 'Sweets', 'Gifts', 'Puja', 'Torans', 'Sparklers'];

export function pointer(x: number, y: number, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(6, 17);
  ctx.lineTo(10, 26);
  ctx.lineTo(14, 24);
  ctx.lineTo(10, 15);
  ctx.lineTo(17, 15);
  ctx.closePath();
  ctx.fillStyle = '#16101f';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

/** The app's home screen. `cursor` 0–1 moves the pointer to the banner and taps. */
export function homeScreen(t: number, cursor = 0) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 290, 620);
  statusBar();
  // address
  ctx.fillStyle = C.rose;
  ctx.beginPath();
  ctx.arc(26, 62, 6, Math.PI, 0);
  ctx.lineTo(26, 74);
  ctx.closePath();
  ctx.fill();
  circle(26, 62, 2.4);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.save();
  ctx.font = `800 15px ${FONT_DISPLAY}`;
  ctx.fillStyle = '#16101f';
  ctx.textBaseline = 'middle';
  ctx.fillText('Home', 40, 65);
  const hw = ctx.measureText('Home').width;
  ctx.font = `500 11.5px "DM Sans", sans-serif`;
  ctx.fillStyle = C.grey;
  ctx.fillText(' - 402, Sunrise Residency', 40 + hw, 66);
  ctx.restore();
  circle(258, 64, 13);
  ctx.fillStyle = '#efe8fb';
  ctx.fill();
  circle(258, 61, 4.5);
  ctx.fillStyle = C.violet;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(258, 72, 7, Math.PI, 0);
  ctx.fill();
  // search
  rr(16, 88, 258, 38, 19);
  ctx.fillStyle = '#f3f0f8';
  ctx.fill();
  ctx.strokeStyle = '#9a91ad';
  ctx.lineWidth = 2;
  circle(37, 105, 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(41.5, 109.5);
  ctx.lineTo(46, 114);
  ctx.stroke();
  text('Search for diyas, sweets…', 54, 107, { size: 12, weight: 500, font: 'body', color: '#8d849e', align: 'left' });
  // categories
  text('Shop by category', 18, 152, { size: 15, weight: 800, color: '#16101f', align: 'left' });
  for (let i = 0; i < 8; i++) {
    const cx = 44 + (i % 4) * 67;
    const cy = 194 + Math.floor(i / 4) * 78;
    const pop = back(seg(t, 0.1 + i * 0.04, 0.5 + i * 0.04));
    circle(cx, cy, 25 * pop);
    ctx.fillStyle = rgba(CAT_DOTS[i]!, 0.16);
    ctx.fill();
    circle(cx, cy, 12 * pop);
    ctx.fillStyle = CAT_DOTS[i]!;
    ctx.fill();
    circle(cx - 3.5, cy - 4, 3.5 * pop);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    text(CAT_LABELS[i]!, cx, cy + 36, { size: 10.5, weight: 600, font: 'body', color: '#3b3150' });
  }
  // Diwali Store banner
  const by = 350;
  ctx.save();
  ctx.shadowColor = 'rgba(106,0,224,0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  rr(14, by, 262, 132, 20);
  ctx.fillStyle = linear(14, by, 276, by + 132, [[0, '#6a00e0'], [1, '#a64dff']]);
  ctx.fill();
  ctx.restore();
  ctx.save();
  rr(14, by, 262, 132, 20);
  ctx.clip();
  glow(232, by + 66, 90, '#ff9a3a', 0.35);
  for (let i = 0; i < 10; i++) {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
    ctx.fillStyle = `rgba(255,230,160,${0.7 * tw})`;
    circle(30 + rnd(i) * 230, by + 10 + rnd(i + 9) * 110, 1.4);
    ctx.fill();
  }
  ctx.restore();
  text('Diwali Store', 32, by + 40, { size: 25, weight: 800, color: '#fff', align: 'left' });
  text('Diyas, sweets, lights & more', 32, by + 66, { size: 11.5, weight: 500, font: 'body', color: 'rgba(255,255,255,0.88)', align: 'left' });
  const tap = seg(cursor, 0.82, 0.92);
  const press = tap > 0 && tap < 1 ? 0.94 : 1;
  ctx.save();
  ctx.translate(76, by + 101);
  ctx.scale(press, press);
  rr(-44, -14, 88, 28, 14);
  ctx.fillStyle = '#fff';
  ctx.fill();
  text('Shop now', 0, 1, { size: 12, weight: 700, font: 'body', color: C.purple });
  ctx.restore();
  diya(214, by + 82, 0.9, t, 1, 3);
  // trending row
  text('Trending this Diwali', 18, 512, { size: 14, weight: 800, color: '#16101f', align: 'left' });
  const minis: [string, string, string][] = [['diya', '#ffd9a8', '₹149'], ['sweets', '#ffe0c2', '₹199'], ['lights', '#fff0a8', '₹249']];
  minis.forEach(([icon, tint, price], i) => {
    const x = 16 + i * 88;
    rr(x, 530, 80, 82, 14);
    ctx.fillStyle = tint;
    ctx.fill();
    drawIcon(icon, x + 40, 562, 50, t, false);
    text(price, x + 40, 600, { size: 11, weight: 700, font: 'body', color: '#16101f' });
  });

  // cursor and tooltip
  if (cursor > 0) {
    const p = seg(cursor, 0, 0.8);
    const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
    const px = 250 + (96 - 250) * e;
    const py = 590 + (by + 104 - 590) * e;
    if (tap > 0) {
      ctx.strokeStyle = rgba(C.violet, 0.6 * (1 - tap));
      ctx.lineWidth = 2;
      circle(px, py, 6 + tap * 24);
      ctx.stroke();
    }
    const tip = eo(seg(cursor, 0.9, 1));
    if (tip > 0) {
      ctx.save();
      ctx.globalAlpha = tip;
      ctx.translate(150, by - 22 + (1 - tip) * 6);
      rr(-78, -15, 156, 30, 10);
      ctx.fillStyle = '#16101f';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-50, 14);
      ctx.lineTo(-42, 22);
      ctx.lineTo(-34, 14);
      ctx.fill();
      text('Diwali Store is live', 0, 1, { size: 11.5, weight: 700, font: 'body', color: '#fff' });
      ctx.restore();
    }
    pointer(px, py);
  }
}

/** Packing screen. `step` is the active stage (0 placed … 3 delivered). */
export function packingScreen(t: number, step = 1) {
  ctx.fillStyle = '#f4f2f8';
  ctx.fillRect(0, 0, 290, 620);
  statusBar();
  text('Order #DD-402', 145, 70, { size: 12, weight: 600, font: 'body', color: C.grey });
  const cx = 145;
  const cy = 250;
  for (let k = 0; k < 3; k++) {
    const p = ((t * 0.55 + k / 3) % 1 + 1) % 1;
    circle(cx, cy, 100 + p * 60);
    ctx.strokeStyle = rgba(C.violet, 0.22 * (1 - p));
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  circle(cx, cy, 104);
  ctx.fillStyle = radial(cx, cy - 20, 10, 110, [[0, '#ffffff'], [1, '#e6dcfa']]);
  ctx.fill();
  const bob = Math.abs(Math.sin(t * 3.2)) * -12;
  const tick = 0.06 * Math.sin(Math.floor(t * 4) * 1.7);
  bag(cx, cy + 62 + bob, 0.82, t, 'purple', tick);
  text('Packing your order', 145, 398, { size: 21, weight: 800, color: '#16101f' });
  text('Diyas, packed with care', 145, 424, { size: 13, weight: 500, font: 'body', color: C.grey });
  // progress row
  const labels = ['Placed', 'Packing', 'On the way', 'Delivered'];
  const xs = [38, 109, 180, 252];
  ctx.strokeStyle = '#ddd5ea';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xs[0]!, 540);
  ctx.lineTo(xs[3]!, 540);
  ctx.stroke();
  ctx.strokeStyle = C.violet;
  ctx.beginPath();
  ctx.moveTo(xs[0]!, 540);
  ctx.lineTo(xs[Math.min(step, 3)]!, 540);
  ctx.stroke();
  labels.forEach((l, i) => {
    const done = i <= step;
    if (i === step) {
      const pulse = (t * 1.2) % 1;
      circle(xs[i]!, 540, 9 + pulse * 10);
      ctx.fillStyle = rgba(C.violet, 0.3 * (1 - pulse));
      ctx.fill();
    }
    circle(xs[i]!, 540, 8);
    ctx.fillStyle = done ? C.violet : '#fff';
    ctx.fill();
    ctx.strokeStyle = done ? C.violet : '#cfc6de';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(l, xs[i]!, 566, { size: 10.5, weight: done ? 700 : 500, font: 'body', color: done ? '#16101f' : '#8d849e' });
  });
}

/* ----------------------------------------------------------- product card */

export type CardData = { name: string; sub: string; price: string; icon: IconKey; tint: string };

export function productCard(x: number, y: number, c: CardData, t: number, hover = 0, w = 180, h = 230) {
  ctx.save();
  ctx.translate(x, y);
  if (hover > 0) glow(w / 2, h / 2, 190, C.rose, 0.45 * hover);
  ctx.shadowColor = 'rgba(10,0,30,0.45)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 12;
  rr(0, 0, w, h, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (hover > 0) {
    rr(0, 0, w, h, 20);
    ctx.strokeStyle = rgba(C.rose, 0.8 * hover);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  rr(10, 10, w - 20, 118, 14);
  ctx.fillStyle = c.tint;
  ctx.fill();
  drawIcon(c.icon, w / 2, 74, 92, t, true);
  // price tag
  ctx.font = `800 13px ${FONT_DISPLAY}`;
  const pw = ctx.measureText(c.price).width + 18;
  rr(16, 16, pw, 24, 8);
  ctx.fillStyle = C.success;
  ctx.fill();
  text(c.price, 16 + pw / 2, 29, { size: 13, weight: 800, color: '#fff' });
  text(c.name, 14, 150, { size: 15.5, weight: 800, color: '#16101f', align: 'left' });
  text(c.sub, 14, 170, { size: 11, weight: 500, font: 'body', color: C.grey, align: 'left' });
  rr(w - 76, h - 46, 62, 32, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = C.success;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  text('ADD', w - 45, h - 29, { size: 13.5, weight: 800, color: C.success });
  ctx.restore();
}

/* -------------------------------------------------------------- fireworks */

const BURST_COLOURS = ['#ffd24a', '#ff3d81', '#27d3c3', '#ffe97a', '#ff7a1a', '#c08bff'];

/** One firework burst `age` seconds after it pops at (x, y). Pure in age and seed. */
export function burst(x: number, y: number, age: number, seed: number, colour?: string, radius = 150, n = 44) {
  if (age < 0 || age > 2.2) return;
  const col = colour ?? BURST_COLOURS[Math.floor(rnd(seed) * BURST_COLOURS.length)]!;
  const fade = 1 - eo(seg(age, 0.5, 2.2));
  if (age < 0.35) glow(x, y, radius * 1.1, col, (1 - age / 0.35) * 0.85);
  glow(x, y + 20 * age, radius * 0.9, col, 0.16 * fade);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // Fast outward burst that slows (drag) and droops (gravity).
  const pos = (a: number, sp: number, k: number) => {
    const d = sp * (1 - Math.exp(-4 * k));
    return [x + Math.cos(a) * d, y + Math.sin(a) * d + 28 * k * k] as const;
  };
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd(seed + i) * 0.12;
    const sp = radius * (0.8 + rnd(seed * 3 + i) * 0.3);
    const [x1, y1] = pos(a, sp, age);
    const [x0, y0] = pos(a, sp, Math.max(0, age - 0.22));
    const tw = 0.75 + 0.25 * Math.sin(age * 38 + i * 1.7);
    const c = i % 4 === 0 ? '#fff6dc' : col;
    ctx.strokeStyle = linear(x1, y1, x0, y0, [[0, rgba(c, fade * tw)], [1, rgba(c, 0)]]);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.fillStyle = rgba(c, fade * tw * 0.4);
    circle(x1, y1, 5);
    ctx.fill();
    ctx.fillStyle = rgba(c, fade * tw);
    circle(x1, y1, 2.4);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', fade * tw * 0.7);
    circle(x1, y1, 1);
    ctx.fill();
  }
  ctx.restore();
}

/** Rising rocket trail from (x0, y0) to (x1, y1) at 0–1. */
export function rocket(x0: number, y0: number, x1: number, y1: number, p: number) {
  if (p <= 0 || p >= 1) return;
  const e = eo(p);
  const x = x0 + (x1 - x0) * e;
  const y = y0 + (y1 - y0) * e;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = linear(x, y, x0 + (x1 - x0) * eo(p - 0.15), y0 + (y1 - y0) * eo(p - 0.15), [[0, 'rgba(255,240,200,0.9)'], [1, 'rgba(255,160,60,0)']]);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x0 + (x1 - x0) * eo(Math.max(0, p - 0.15)), y0 + (y1 - y0) * eo(Math.max(0, p - 0.15)));
  ctx.stroke();
  ctx.restore();
  glow(x, y, 14, '#fff0c0', 0.9);
}

/* ---------------------------------------------------------------- rangoli */

function petal(len: number, width: number, color: string | CanvasGradient) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(width, len * 0.3, width * 0.8, len * 0.8, 0, len);
  ctx.bezierCurveTo(-width * 0.8, len * 0.8, -width, len * 0.3, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
}

function ringOf(n: number, r: number, rot: number, draw: (i: number) => void) {
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.rotate(rot + (i / n) * TAU);
    ctx.translate(0, r);
    draw(i);
    ctx.restore();
  }
}

/**
 * A concentric rangoli: grey core, glowing white ring, rose and gold petals, an orange
 * lotus, dots, a teal ring and teal/rose petals. Layers grow out one after another
 * with `grow` 0–1 and rotate in alternating directions.
 */
export function mandala(cx: number, cy: number, R: number, t: number, grow = 1, discs = false) {
  ctx.save();
  ctx.translate(cx, cy);
  glow(0, 0, R * 1.5, '#ff9a3a', 0.25 * grow);
  const layer = (k: number) => back(seg(grow, k * 0.1, k * 0.1 + 0.35), 1.4);
  const spin = (k: number) => (k % 2 ? 1 : -1) * t * (0.12 + k * 0.01);

  // 24 teal / rose outer petals
  let g = layer(6);
  if (g > 0) {
    ctx.save();
    ctx.scale(g, g);
    ringOf(24, R * 0.62, spin(6), (i) => petal(R * 0.3, R * 0.07, i % 2 ? '#27d3c3' : C.rose));
    ctx.restore();
  }
  // teal ring
  g = layer(5);
  if (g > 0) {
    circle(0, 0, R * 0.74 * g);
    ctx.strokeStyle = '#1fb8aa';
    ctx.lineWidth = R * 0.05;
    ctx.stroke();
    circle(0, 0, R * 0.74 * g);
    ctx.strokeStyle = 'rgba(200,255,250,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // 32 dots
  g = layer(4);
  if (g > 0) {
    ctx.save();
    ctx.scale(g, g);
    ringOf(32, R * 0.66, spin(4), (i) => {
      circle(0, 0, R * 0.018);
      ctx.fillStyle = i % 2 ? '#fff3d6' : '#ffd23f';
      ctx.fill();
    });
    ctx.restore();
  }
  // 16 orange / cream lotus petals
  g = layer(3);
  if (g > 0) {
    ctx.save();
    ctx.scale(g, g);
    ringOf(16, R * 0.2, spin(3), (i) =>
      petal(R * 0.42, R * 0.11, i % 2 ? '#fff0d0' : linear(0, 0, 0, R * 0.42, [[0, '#ff9a1a'], [1, '#ff5a1a']])),
    );
    ctx.restore();
  }
  // 8 gold petals
  g = layer(2);
  if (g > 0) {
    ctx.save();
    ctx.scale(g, g);
    ringOf(8, R * 0.16, spin(2) + TAU / 16, () => petal(R * 0.3, R * 0.11, '#ffc21a'));
    ctx.restore();
  }
  // 8 rose petals
  g = layer(1);
  if (g > 0) {
    ctx.save();
    ctx.scale(g, g);
    ringOf(8, R * 0.12, spin(1), () => petal(R * 0.22, R * 0.09, '#ff3d81'));
    ctx.restore();
  }
  // glowing white ring + grey core
  g = layer(0);
  if (g > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[R * 0.08, 0.15], [R * 0.035, 0.4], [3, 0.95]] as const) {
      circle(0, 0, R * 0.16 * g);
      ctx.strokeStyle = `rgba(255,240,250,${a})`;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    ctx.restore();
    circle(0, 0, R * 0.13 * g);
    ctx.fillStyle = radial(0, 0, 0, R * 0.13, [[0, '#b9b5c4'], [1, '#6f6a7d']]);
    ctx.fill();
    ctx.save();
    ctx.rotate(-t * 0.3);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(TAU / 8);
      circle(0, R * 0.075 * g, R * 0.02);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.restore();
  }
  // optional ring of 12 glowing coloured discs
  if (discs) {
    g = layer(7);
    if (g > 0) {
      ringOf(12, R * 0.95 * g, spin(7), (i) => {
        const col = ['#ff3d81', '#ffb42e', '#27d3c3', '#ff7a1a', '#c08bff', '#ffd23f'][i % 6]!;
        glow(0, 0, R * 0.12, col, 0.5);
        for (let k = 3; k >= 1; k--) {
          circle(0, 0, R * 0.025 * k);
          ctx.fillStyle = k % 2 ? col : '#fff3d6';
          ctx.fill();
        }
      });
    }
  }
  ctx.restore();
}

/** Twelve distinct festive plates for the rangoli ring. */
export function plate(i: number, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  circle(2, 5, r);
  ctx.fill();
  const disc = (fill: string | CanvasGradient, rr0 = r) => {
    circle(0, 0, rr0);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const rim = (c = 'rgba(255,255,255,0.35)') => {
    circle(0, 0, r - 1);
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  switch (i % 12) {
    case 0: // purple with a yellow cross
      disc('#7a2cff');
      ctx.fillStyle = '#ffd23f';
      rr(-r * 0.6, -r * 0.14, r * 1.2, r * 0.28, 4);
      ctx.fill();
      rr(-r * 0.14, -r * 0.6, r * 0.28, r * 1.2, 4);
      ctx.fill();
      break;
    case 1: // black and orange, with a diya
      disc('#16101f');
      circle(0, 0, r * 0.8);
      ctx.strokeStyle = C.saffron;
      ctx.lineWidth = 3;
      ctx.stroke();
      diya(-r * 0.15, r * 0.2, r / 70, t, 1, i);
      break;
    case 2: // white
      disc('#fbf8f2');
      circle(0, 0, r * 0.65);
      ctx.strokeStyle = '#e4dccd';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    case 3: // laddus
      disc('#fff0d6');
      for (const [lx, ly] of [[-r * 0.3, r * 0.15], [r * 0.3, r * 0.15], [0, -r * 0.25]] as const) {
        circle(lx, ly, r * 0.3);
        ctx.fillStyle = radial(lx - 3, ly - 3, 0, r * 0.3, [[0, '#ffc25a'], [1, '#e8701a']]);
        ctx.fill();
      }
      break;
    case 4: // yellow and red
      disc('#ffd23f');
      circle(0, 0, r * 0.82);
      ctx.strokeStyle = '#e8322f';
      ctx.lineWidth = r * 0.16;
      ctx.stroke();
      break;
    case 5: // white and yellow
      disc('#ffffff');
      disc('#ffcf33', r * 0.45);
      break;
    case 6: // white with red dots
      disc('#ffffff');
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU;
        circle(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.08);
        ctx.fillStyle = '#e8322f';
        ctx.fill();
      }
      circle(0, 0, r * 0.12);
      ctx.fill();
      break;
    case 7: // gold bowl
      disc(radial(-r * 0.3, -r * 0.3, 0, r * 1.2, [[0, '#fff1a8'], [0.5, '#e0a72a'], [1, '#9a6a0a']]));
      ellipse(0, 0, r * 0.62, r * 0.5);
      ctx.fillStyle = 'rgba(110,60,0,0.45)';
      ctx.fill();
      break;
    case 8: // black dots on yellow
      disc('#ffcf33');
      for (let k = 0; k < 13; k++) {
        const a = rnd(k * 2.3) * TAU;
        const d = rnd(k * 5.1) * r * 0.75;
        circle(Math.cos(a) * d, Math.sin(a) * d, r * 0.07);
        ctx.fillStyle = '#16101f';
        ctx.fill();
      }
      break;
    case 9: // orange flower
      disc('#fff3d6');
      ctx.save();
      ctx.rotate(t * 0.5);
      ringOf(8, 0, 0, () => petal(r * 0.75, r * 0.22, '#ff7a1a'));
      ctx.restore();
      disc('#ffd23f', r * 0.2);
      break;
    case 10: // mandala
      disc('#c01e6a');
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.2;
      for (let k = 1; k <= 3; k++) {
        circle(0, 0, r * 0.25 * k);
        ctx.stroke();
      }
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
        ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
        ctx.stroke();
      }
      break;
    default: // white
      disc('#f6f3fb');
      rim('#d8d0e6');
  }
  rim();
  ctx.restore();
}

/* ------------------------------------------------------------- utilities */

export function stars(t: number, n: number, seed = 1, maxY = 720, w = 1280) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = rnd(seed + i * 1.31) * w;
    const y = rnd(seed + i * 2.71) * maxY;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + rnd(i) * 2) + i));
    const s = 0.6 + rnd(i * 3.3) * 1.3;
    ctx.fillStyle = `rgba(255,244,220,${0.8 * tw})`;
    circle(x, y, s);
    ctx.fill();
  }
  ctx.restore();
}

/** Spring-in progress for an element that starts at `start` and settles over `dur`. */
export const springAt = (t: number, start: number, dur: number) => spring(clamp((t - start) / dur));
