// Drives the real app end to end in headless Chromium and saves screenshots.
// Needs `npm run dev` running (web on :5173, API on :4000).
// Usage: node e2e/flow.mjs [screenshotDir] [baseUrl]
// Tip: start the API with a fast clock so the tracker finishes quickly, e.g.
//   FULFIL_PLACED_SECONDS=4 FULFIL_PACKING_SECONDS=5 FULFIL_ON_THE_WAY_SECONDS=8 npm run dev
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const out = resolve(process.argv[2] ?? 'e2e/screenshots');
const base = process.argv[3] ?? 'http://localhost:5173';
mkdirSync(out, { recursive: true });

const errors = [];
// The register step submits an invalid form on purpose; the browser logs that 400.
let expectedFailures = 0;
const log = (msg) => console.log(`✓ ${msg}`);
const shot = (page, name, opts = {}) => page.screenshot({ path: resolve(out, `${name}.png`), ...opts });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const watch = (p) => {
  p.on('pageerror', (e) => errors.push(`[pageerror] ${p.url()} ${e.message}`));
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (expectedFailures > 0 && m.text().includes('status of 400')) {
      expectedFailures--;
      return;
    }
    errors.push(`[console] ${p.url()} ${m.text()}`);
  });
};
watch(page);

try {
  // 1. Intro plays on a first visit, then skips.
  await page.goto(base);
  const intro = page.getByTestId('intro');
  await intro.waitFor({ state: 'visible' });
  await page.waitForTimeout(2600);
  await shot(page, '01-intro');
  await page.getByTestId('skip-intro').click();
  await intro.waitFor({ state: 'detached' });
  log('intro played and skipped');
  await page.waitForTimeout(900);
  await shot(page, '02-home-hero');

  // A reload must not replay the intro.
  await page.reload();
  await page.waitForTimeout(600);
  if (await page.getByTestId('intro').count()) throw new Error('intro replayed on second visit');
  log('intro is remembered');

  // 2. Filter, search and add to bag.
  await page.locator('#store').scrollIntoViewIfNeeded();
  await page.getByRole('tab', { name: 'Sweets' }).click();
  await page.waitForURL(/cat=sweets/);
  await page.waitForTimeout(700);
  const sweets = await page.getByTestId('product-card').count();
  if (sweets < 3) throw new Error(`expected sweets, got ${sweets} cards`);
  await shot(page, '03-store-sweets');
  await page.getByRole('button', { name: 'Add Kaju Katli to bag' }).click();
  await page.waitForTimeout(900);
  log(`filtered to sweets (${sweets} items) and added Kaju Katli`);

  await page.getByRole('tab', { name: 'All' }).click();
  await page.getByTestId('search').fill('diya');
  await page.waitForTimeout(800);
  await shot(page, '04-search-diya');
  await page.getByRole('button', { name: 'Add Clay Diyas to bag' }).click();
  await page.getByRole('button', { name: 'Add one more Clay Diyas' }).click();
  await page.getByTestId('search').fill('');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Add Fairy Lights to bag' }).click();
  await page.waitForTimeout(1000);
  log('searched and added more items');

  // 3. Bag drawer.
  await page.getByTestId('bag-button').click();
  const drawer = page.getByTestId('bag-drawer');
  await drawer.waitFor();
  await page.waitForTimeout(700);
  await shot(page, '05-bag-drawer');
  await page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'detached' });
  await page.getByTestId('bag-button').click();
  await drawer.getByTestId('checkout-link').click();
  log('bag drawer opens, closes on Escape, links to sign in');

  // 4. Register (via the login page's link), landing back on checkout.
  await page.waitForURL(/\/login\?next=%2Fcheckout|\/login\?next=\/checkout/);
  await page.getByRole('link', { name: 'Create one' }).click();
  await page.waitForURL(/\/register/);
  const email = `e2e-${Date.now()}@example.com`;
  await page.getByLabel('Your name').fill('A');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('short');
  expectedFailures = 1;
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByText('Name must be at least 2 characters.').waitFor();
  await shot(page, '06-register-errors');
  await page.getByLabel('Your name').fill('Meera Iyer');
  await page.getByLabel('Password').fill('lakshmi-puja-2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/checkout/);
  log('inline field errors shown, then registered and redirected to checkout');

  // 5. Checkout with a coupon and a gift message.
  await page.getByLabel('Flat / house no.').fill('402');
  await page.getByLabel('Society / street').fill('Lotus Residency, Baner');
  await page.getByRole('button', { name: 'DIWALI10' }).click();
  await page.getByText(/DIWALI10 applied/).waitFor();
  await page.getByLabel('Gift message (optional)').fill('Happy Diwali, Nani!');
  await page.waitForTimeout(400);
  await shot(page, '07-checkout', { fullPage: true });
  await page.getByTestId('place-order').click();
  await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  log('placed order with DIWALI10');

  // 6. Tracker passes all four stages.
  const title = page.getByTestId('stage-title');
  const stages = [
    ['Order placed', '08-tracker-placed'],
    ['Packing your order', '09-tracker-packing'],
    ['On the way', '10-tracker-on-the-way'],
    ['Delivered', '11-tracker-delivered'],
  ];
  for (const [text, name] of stages) {
    await page.waitForFunction((t) => document.querySelector('[data-testid="stage-title"]')?.textContent === t, text, { timeout: 60_000 });
    await page.waitForTimeout(text === 'Delivered' ? 1800 : 1200);
    await shot(page, name);
    log(`tracker: ${text}`);
  }
  await page.getByTestId('delivered-banner').waitFor();
  if ((await title.textContent()) !== 'Delivered') throw new Error('tracker did not finish');

  // 7. Spin the wheel.
  await page.getByTestId('open-wheel').click();
  await page.getByTestId('spin-button').click();
  await page.getByTestId('spin-wheel').getByTestId('reward-code').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await shot(page, '12-wheel-reward');
  const code = await page.getByTestId('spin-wheel').getByTestId('reward-code').textContent();
  // The segment under the pointer must be the prize the server picked.
  const landed = await page.evaluate(() => {
    const m = new DOMMatrix(getComputedStyle(document.querySelector('[data-testid="wheel-rotor"]')).transform);
    const deg = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    const atTop = (((360 - deg) % 360) + 360) % 360;
    return { segment: Math.floor(atTop / 45), prize: Number(document.querySelector('[data-prize]').getAttribute('data-prize')) };
  });
  if (landed.segment !== landed.prize) throw new Error(`wheel stopped on segment ${landed.segment}, prize was ${landed.prize}`);
  await page.getByRole('button', { name: 'Close' }).click();
  log(`spun the wheel and won ${code}`);

  // 8. Create and open a wish (Hindi, fireworks).
  await page.goto(`${base}/wish`);
  await page.getByRole('button', { name: /Fireworks/ }).click();
  await page.getByRole('button', { name: 'हिन्दी' }).click();
  await page.getByLabel('To').fill('Nani');
  await page.getByLabel('From').fill('Meera');
  await page.getByRole('button', { name: /यह दीपावली/ }).click();
  await page.waitForTimeout(1200);
  await shot(page, '13-wish-builder');
  await page.getByTestId('create-wish').click();
  await page.waitForURL(/\/w\/[A-Za-z0-9_-]{8}/);
  await page.getByTestId('wish-card').waitFor();
  await page.waitForTimeout(1500);
  await shot(page, '14-wish-view');
  await page.getByTestId('copy-wish-link').click();
  await page.getByText('✓ Link copied').waitFor();
  const wishUrl = page.url().replace('?new=1', '');
  log(`wish created at ${wishUrl}`);

  // A fresh visitor opening the wish link sees no intro, and the view count goes up.
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const gp = await guest.newPage();
  watch(gp);
  await gp.goto(wishUrl);
  await gp.getByTestId('wish-card').waitFor();
  if (await gp.getByTestId('intro').count()) throw new Error('intro shown on a wish link');
  await gp.waitForTimeout(1500);
  await gp.screenshot({ path: resolve(out, '15-wish-mobile.png') });
  log(`wish opened by a guest: ${await gp.getByTestId('wish-views').textContent()}`);
  await guest.close();

  // 9. Orders list and rewards.
  await page.goto(`${base}/orders`);
  await page.getByTestId('order-row').first().waitFor();
  await page.waitForTimeout(700);
  await shot(page, '16-orders');
  log('orders list shows the order and the reward');

  // 10. Festival layer pages.
  await page.goto(`${base}/diwali`);
  await page.waitForTimeout(1500);
  await shot(page, '17-festival', { fullPage: true });
  await page.getByRole('button', { name: /Add \d+ missing to bag/ }).click();
  await page.waitForTimeout(2500);
  await shot(page, '18-festival-complete');
  log('festival checklist added missing items');

  await page.goto(`${base}/wall`);
  await page.getByTestId('light-diya').click();
  await page.getByLabel('Your name').fill('Meera');
  await page.getByLabel('Your wish').fill('Light and laughter for every home');
  await page.getByRole('button', { name: /Light it/ }).click();
  await page.waitForTimeout(1800);
  await shot(page, '19-diya-wall');
  log('lit a diya on the wall');

  await page.goto(`${base}/rangoli`);
  const canvas = page.getByTestId('rangoli-canvas');
  const box = await canvas.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy - box.height * 0.08);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) await page.mouse.move(cx + Math.sin(i / 3) * 60, cy - box.height * (0.1 + i * 0.015));
  await page.mouse.up();
  await page.getByRole('button', { name: /Surprise me/ }).click();
  await page.getByPlaceholder('Lotus for Lakshmi').fill('E2E lotus');
  await page.getByTestId('save-rangoli').click();
  await page.getByText(/Saved! Anyone with the link/).waitFor();
  await shot(page, '20-rangoli-studio');
  await page.getByRole('link', { name: /\/rangoli\// }).click();
  await page.waitForTimeout(5600);
  await shot(page, '21-rangoli-replay');
  log('drew, saved and replayed a rangoli');

  // 11. Film player from the header.
  await page.goto(base);
  await page.getByRole('button', { name: 'Watch the film' }).first().click();
  await page.getByTestId('film-player').waitFor();
  await page.getByRole('button', { name: /5\. City/ }).click();
  await page.waitForTimeout(1200);
  await shot(page, '22-film-player');
  await page.keyboard.press('Escape');
  log('film player opened with scene buttons');

  // 12. 404 and small screens.
  await page.goto(`${base}/nope`);
  await page.waitForTimeout(500);
  await shot(page, '23-not-found');
  const phone = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 });
  const pp = await phone.newPage();
  watch(pp);
  await pp.addInitScript(() => localStorage.setItem('diya-dash-intro-seen', '1'));
  for (const [path, name] of [['/', '24-mobile-home'], ['/diwali', '25-mobile-festival'], ['/rangoli', '26-mobile-rangoli']]) {
    await pp.goto(base + path);
    await pp.waitForTimeout(1200);
    const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) throw new Error(`horizontal scroll of ${overflow}px on ${path} at 360px`);
    await pp.screenshot({ path: resolve(out, `${name}.png`) });
  }
  await pp.goto(`${base}/#store`);
  await pp.waitForTimeout(1500);
  await pp.screenshot({ path: resolve(out, '27-mobile-store.png') });
  await phone.close();
  log('360px layouts have no horizontal scroll');
} catch (err) {
  await shot(page, 'zz-failure').catch(() => undefined);
  console.error(`✗ ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(`\n${errors.length} console error(s):\n` + errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('\nNo console errors.');
}
console.log(`Screenshots: ${out}`);
