#!/usr/bin/env node
/**
 * Wick demo verification drive.
 *
 * Loads the exported single-file demo (demo/dist/lantern-lane.html) in
 * headless Chromium and actually plays it:
 *   1. page loads with zero console errors / pageerrors
 *   2. the keeper walks with real key holds (ArrowRight / ArrowLeft)
 *   3. a chronicle event fires (talking to Mabel writes an entry)
 *   4. the shop opens and an apple is bought — coin and stock must move
 *      by exactly the price/qty
 *   5. save -> scramble -> load restores the numbers
 *   6. screenshots: day, night, shop (demo/screenshots/)
 *
 * Playwright is borrowed from the workshop install at
 * ~/workspace/tools/pw-capture (Wick itself has zero dependencies).
 *
 * Usage: node tools/drive-demo.mjs    (run `npm run demo` first)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.join(process.env.HOME, 'workspace/tools/pw-capture/package.json'));
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const demoFile = path.join(here, '..', 'demo', 'dist', 'lantern-lane.html');
const shotsDir = path.join(here, '..', 'demo', 'screenshots');
fs.mkdirSync(shotsDir, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('file://' + demoFile);
await page.waitForFunction(() => window.WICK_DEMO, null, { timeout: 10000 });
await page.waitForTimeout(600);

const state = () => page.evaluate(() => {
  const d = window.WICK_DEMO;
  return {
    x: d.player.x, y: d.player.y,
    coin: d.wallet.coin,
    apples: d.stock.count('apple'),
    day: d.clock.day, phase: d.clock.phase, t: d.clock.t,
    weather: d.weather.current,
    shopOpen: d.shop.open,
    entries: d.chronicle.entries.map((e) => e.text),
  };
});

// 1. clean load
let s = await state();
check('loads with a live demo hook', !!s);
check('zero console errors on load', errors.length === 0, errors.join(' | '));

// 2. walk with real key holds
const x0 = s.x;
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(900);
await page.keyboard.up('ArrowRight');
s = await state();
check('keeper walks right on held ArrowRight', s.x > x0 + 60, `x ${x0} -> ${s.x}`);
await page.screenshot({ path: path.join(shotsDir, 'day.png') });

await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(400);
await page.keyboard.up('ArrowLeft');
s = await state();
check('keeper walks back left on held ArrowLeft', s.x < 936, `x now ${s.x}`);

// 3. walk to Mabel and talk -> chronicle event + dialogue
await page.evaluate(() => { window.WICK_DEMO.player.x = 700; window.WICK_DEMO.player.y = 430; });
await page.waitForTimeout(150);
await page.keyboard.press('KeyE'); // open dialogue
await page.waitForTimeout(250);
s = await state();
check('talking to Mabel writes a chronicle entry', s.entries.some((t) => t.includes('Met Mabel')), `${s.entries.length} entries`);
await page.keyboard.press('KeyE'); // advance line 2
await page.waitForTimeout(150);
await page.keyboard.press('KeyE'); // close dialogue
await page.waitForTimeout(150);

// 4. open shop, buy an apple: coin 12 -> 9, apples 0 -> 1
const before = await state();
await page.keyboard.press('KeyE'); // open shop (talked already)
await page.waitForTimeout(300);
s = await state();
check('shop opens after talking to Mabel', s.shopOpen === true);
await page.screenshot({ path: path.join(shotsDir, 'shop.png') });
await page.click('button[data-good="apple"]');
await page.waitForTimeout(250);
s = await state();
check('buying an apple spends exactly 3 coin', s.coin === before.coin - 3, `coin ${before.coin} -> ${s.coin}`);
check('buying an apple adds exactly 1 to stock', s.apples === before.apples + 1, `apples ${before.apples} -> ${s.apples}`);
check('purchase is chronicled', s.entries.some((t) => t.includes('Bought Apple')), '');
await page.keyboard.press('KeyE'); // close shop
await page.waitForTimeout(150);

// 5. day rollover fires a chronicle event (jump the clock to just before midnight)
const dayBefore = (await state()).day;
await page.evaluate(() => { window.WICK_DEMO.clock.t = 0.999; });
await page.waitForTimeout(1200);
s = await state();
check('day rollover fires and is chronicled', s.day === dayBefore + 1 && s.entries.some((t) => t.includes('begins')), `day ${dayBefore} -> ${s.day}`);

// 6. night screenshot (park the clock at 23:00 and let the tint settle)
await page.evaluate(() => { window.WICK_DEMO.clock.t = 0.96; window.WICK_DEMO.loop.setSpeed(0.5); });
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(shotsDir, 'night.png') });
s = await state();
check('night phase reached for screenshot', s.phase === 'Night', `phase=${s.phase} t=${s.t.toFixed(2)}`);

// 7. save -> scramble -> load restores coin/apples
const saved = await state();
await page.evaluate(() => window.WICK_DEMO.saves.save());
await page.evaluate(() => { window.WICK_DEMO.wallet.coin = 999; window.WICK_DEMO.stock.items.apple = 42; });
const loadResult = await page.evaluate(() => window.WICK_DEMO.saves.load());
s = await state();
check('save/load round-trips coin and stock', loadResult.ok && s.coin === saved.coin && s.apples === saved.apples,
  `coin ${s.coin} (saved ${saved.coin}), apples ${s.apples} (saved ${saved.apples})`);

check('zero console errors for the whole drive', errors.length === 0, errors.join(' | '));
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
