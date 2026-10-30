// Exports film frames for the acceptance check (one per beat of the scene spec).
// Usage: node e2e/frames.mjs [outDir] [baseUrl]   (needs `npm run dev` running)
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const out = resolve(process.argv[2] ?? 'e2e/screenshots/frames');
const base = process.argv.slice(3).find((a) => a.startsWith('http')) ?? 'http://localhost:5173';
mkdirSync(out, { recursive: true });

// Representative moments inside each beat of the 21.8 s film.
const beats = [
  ['01-diya', 2.6],
  ['02-app', 5.9],
  ['03-cards', 9.4],
  ['04-packing', 11.8],
  ['05-city', 14.6],
  ['06-door-before', 17.0],
  ['07-door-delivered', 18.75],
  ['08-rangoli-plates', 19.75],
  ['09-ring', 20.45],
  ['10-brand', 21.0],
  ['11-greeting', 21.75],
];
const extra = process.argv.includes('--fireworks') ? [['fireworks', 4]] : [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

for (const [name, t] of [...beats, ...extra]) {
  const q = name === 'fireworks' ? `fireworks&t=${t}` : `t=${t}`;
  await page.goto(`${base}/dev/frame?${q}`);
  await page.waitForSelector('[data-frame-ready]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.locator('canvas').screenshot({ path: resolve(out, `${name}.png`) });
}
await browser.close();
console.log(`Saved ${beats.length + extra.length} frames to ${out}`);
if (errors.length) {
  console.error('Console errors:\n' + errors.join('\n'));
  process.exitCode = 1;
}
