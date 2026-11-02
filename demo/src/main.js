/**
 * Wick Demo — Lantern Lane.
 *
 * A tiny proof scene, not a game: a keeper walks a lane with her cat, talks
 * to Mabel at the market stall, buys an apple with Harbor coin, shakes the
 * apple tree (hold-to-work), and lives through days, seasons and weather —
 * while the Chronicle writes it all down. Every Wick module is exercised:
 * core loop, renderer, sprites, clock, weather, chronicle, entities, input
 * (+ touch + channels), ui kit, economy, shop, save, audio.
 *
 * A debug hook is exposed at window.WICK_DEMO so tools/drive-demo.mjs can
 * verify behaviour headlessly. Real games would not ship this.
 */
import { createLoop } from '../../src/core.js';
import { Renderer } from '../../src/renderer.js';
import { drawSprite } from '../../src/sprites.js';
import { WorldClock } from '../../src/clock.js';
import { Weather } from '../../src/weather.js';
import { Chronicle } from '../../src/chronicle.js';
import { World, follow } from '../../src/entities.js';
import { Input, touchButtons, Channel } from '../../src/input.js';
import { Chips, GaugePanel, Prompt, Dialogue, Objectives } from '../../src/ui.js';
import { Wallet, Stock } from '../../src/economy.js';
import { ShopPanel } from '../../src/shop.js';
import { SaveSystem } from '../../src/save.js';
import { AudioKit } from '../../src/audio.js';

/* ---------------------------------- art ---------------------------------- */
const KEEPER_PAL = { h: '#e8a33d', s: '#f0c8a0', e: '#23272f', c: '#3f6fb5', d: '#2c3550', b: '#59371f' };
const KEEPER_BODY = [
  '....hhhh....',
  '...hhhhhh...',
  '....ssss....',
  '....sese....',
  '....ssss....',
  '...cccccc...',
  '..cccccccc..',
  '..c.cccc.c..',
  '...cccccc...',
  '...cccccc...',
];
const LEGS_A = ['...dd..dd...', '...dd..dd...', '...bb..bb...'];
const LEGS_B = ['....dddd....', '....d..d....', '....bb.bb...'];

const MABEL_PAL = { w: '#e8e4da', s: '#eec39b', e: '#23272f', v: '#4d7c4d', a: '#d8d2c4', b: '#4a3220' };
const MABEL = [
  '....wwww....',
  '...wwwwww...',
  '....ssss....',
  '....sese....',
  '....ssss....',
  '...vvvvvv...',
  '..vvvvvvvv..',
  '..vaaaaav...',
  '..vaaaaav...',
  '...vvvvvv...',
  '...vvvvvv...',
  '...d....d...',
  '...b....b...',
];

const CAT_PAL = { k: '#9aa3b2', e: '#23272f', t: '#6b7280' };
const CAT = [
  '.k........k.',
  '.kk......kk.',
  '..kkkkkkkk..',
  '..kekkkkek..',
  '...kkkkkk...',
  '..kkkkkkkk..',
  '.kkkkkkkkkk.',
  '.kk.kkkk.kk.',
  '...k....k...',
  '..tt....tt..',
];

/* --------------------------------- setup --------------------------------- */
const root = document.getElementById('wick-root');
const canvas = document.createElement('canvas');
canvas.width = 960;
canvas.height = 540;
root.appendChild(canvas);
const renderer = new Renderer(canvas);
const input = new Input();
const audio = new AudioKit();

const clock = new WorldClock({ dayLength: 90, startTime: 0.38 });
const weather = new Weather({});
const chronicle = new Chronicle({ stamp: () => `Day ${clock.day} · ${clock.timeString}` });
const wallet = new Wallet(12);
const stock = new Stock({ apple: 0, oil: 1, seeds: 0 });
const world = new World();

const player = { x: 140, y: 430, speed: 150, facing: 1, moving: false, stamina: 100 };
const cat = world.spawn({
  x: 100, y: 446, speed: 190, z: 5,
  update(e, dt) { follow(e, player, dt, 34); },
  draw(e, ctx) { drawSprite(ctx, CAT, CAT_PAL, e.x - 18, e.y - 30, { scale: 3, flipX: player.facing < 0 }); },
});
const MABEL_POS = { x: 742, y: 428 };
const TREE_POS = { x: 330, y: 420 };

/* ----------------------------------- UI ----------------------------------- */
const topBar = document.createElement('div');
topBar.style.cssText = 'position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:flex-start;z-index:4;';
const chips = new Chips([
  { key: 'day', label: '📅', value: 'Day 1' },
  { key: 'time', label: '🕐', value: '' },
  { key: 'weather', label: '🌦', value: 'Clear' },
  { key: 'coin', label: '🪙', value: '12' },
]);
topBar.appendChild(chips.el);
const btnRow = document.createElement('div');
btnRow.style.cssText = 'display:flex;gap:6px;';
function hudButton(label, fn) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = 'border:1px solid #3a4157;background:rgba(20,24,36,.88);color:#dfe6f2;border-radius:999px;font:600 12px system-ui,sans-serif;padding:6px 12px;cursor:pointer;';
  b.addEventListener('click', fn);
  btnRow.appendChild(b);
  return b;
}
topBar.appendChild(btnRow);
root.appendChild(topBar);

const gauges = new GaugePanel("KEEPER'S PANEL", [
  { key: 'stamina', label: 'Stamina', color: '#7fc76b', max: 100 },
  { key: 'daylight', label: 'Day Progress', color: '#f5c56b', max: 100 },
]);
gauges.el.style.cssText += 'position:absolute;left:10px;top:56px;width:190px;z-index:4;';
root.appendChild(gauges.el);

const objectives = new Objectives("TODAY'S READINESS");
objectives.add('talk', 'Talk to Mabel at the stall');
objectives.add('buy', 'Buy something at the stall');
objectives.add('day', 'Live to see a new day');
objectives.el.style.cssText += 'position:absolute;left:10px;top:170px;width:230px;z-index:4;';
root.appendChild(objectives.el);

const chronicleEl = chronicle.renderPanel({ title: 'CHRONICLE', height: '130px' });
chronicleEl.style.cssText += 'position:absolute;right:10px;bottom:10px;width:min(320px,44vw);z-index:4;';
root.appendChild(chronicleEl);

const prompt = new Prompt();
root.appendChild(prompt.el);
const dialogue = new Dialogue();
root.appendChild(dialogue.el);

const shop = new ShopPanel({
  title: "Mabel's Stall",
  goods: [
    { id: 'apple', name: 'Apple', price: 3, blurb: 'Crisp. From the lane tree.' },
    { id: 'oil', name: 'Lantern Oil', price: 5, blurb: 'For the long nights.' },
    { id: 'seeds', name: 'Seed Packet', price: 4, blurb: 'Next spring, in paper.' },
  ],
  wallet,
  stock,
  onBuy(good) {
    audio.unlock(); audio.chime();
    chronicle.add(`Bought ${good.name} for ${good.price} coin.`, 'economy');
    objectives.setDone('buy');
  },
  onRefuse() { audio.unlock(); audio.blip({ freq: 160, dur: 0.15, type: 'square', gain: 0.08 }); },
});
root.appendChild(shop.el);

root.appendChild(touchButtons(input, [
  { action: 'left', label: '◀' },
  { action: 'right', label: '▶' },
  { action: 'up', label: '▲' },
  { action: 'down', label: '▼' },
  { action: 'interact', label: 'E' },
]));

/* ---------------------------------- save ---------------------------------- */
const saves = new SaveSystem({ prefix: 'wick-demo' });
let talked = false;
saves.register('clock', { save: () => clock.snapshot(), load: (d) => clock.restore(d) });
saves.register('wallet', { save: () => wallet.snapshot(), load: (d) => wallet.restore(d) });
saves.register('stock', { save: () => stock.snapshot(), load: (d) => stock.restore(d) });
saves.register('chronicle', { save: () => chronicle.snapshot(), load: (d) => chronicle.restore(d) });
saves.register('player', {
  save: () => ({ x: player.x, y: player.y, stamina: player.stamina, talked }),
  load: (d) => { player.x = d.x; player.y = d.y; player.stamina = d.stamina; talked = !!d.talked; if (talked) objectives.setDone('talk'); },
});

const speedBtn = hudButton('Speed 1×', () => { speedBtn.textContent = `Speed ${loop.cycleSpeed()}×`; });
hudButton('❚❚', () => { loop.togglePause(); });
hudButton('Save', () => { if (saves.save()) chronicle.add('Saved at the lantern post.', 'world'); });
hudButton('Load', () => {
  const r = saves.load();
  chronicle.add(r.ok ? 'Loaded the last lantern-post save.' : `No save to load (${r.reason}).`, 'world');
  shop.refresh();
});

/* ------------------------------ interactions ------------------------------ */
const treeChannel = new Channel({
  duration: 1.5,
  onComplete() {
    stock.add('apple', 1);
    chronicle.add('Shook an apple loose from the lane tree.', 'world');
    audio.blip({ freq: 520, slide: 300, dur: 0.12, type: 'triangle' });
    shop.refresh();
  },
});
const near = (p, r = 52) => Math.hypot(player.x - p.x, player.y - p.y) < r;

function handleInteract(dt) {
  if (dialogue.open) {
    if (input.pressed('interact')) { audio.blip({ freq: 880, dur: 0.05, gain: 0.06 }); dialogue.advance(); }
    prompt.hide();
    return;
  }
  if (shop.open) {
    if (input.pressed('interact')) shop.toggle(false);
    prompt.hide();
    return;
  }
  if (near(MABEL_POS)) {
    prompt.show(talked ? 'E — Browse Mabel’s stall' : 'E — Talk to Mabel');
    if (input.pressed('interact')) {
      audio.unlock();
      if (!talked) {
        dialogue.say([
          { name: 'MABEL', text: 'Morning, keeper. Fine day for the lane — mind the cat near the apples.' },
          { name: 'MABEL', text: 'Take a look at the stall when you\'re ready. Coin\'s coin, and yours is good here.' },
        ]);
        talked = true;
        objectives.setDone('talk');
        chronicle.add('Met Mabel at the market stall.', 'world');
      } else {
        shop.toggle(true);
      }
    }
  } else if (near(TREE_POS)) {
    treeChannel.update(dt, input.held('interact'));
    prompt.show(treeChannel.working
      ? `Shaking the apple tree… ${Math.round(treeChannel.progress * 100)}%`
      : 'Hold E — Shake the apple tree');
  } else {
    treeChannel.update(dt, false);
    prompt.hide();
  }
}

/* --------------------------------- events --------------------------------- */
clock.onDay((day, season) => {
  chronicle.add(`Day ${day} begins — ${season.name}, Year ${clock.year}.`, 'world');
  objectives.setDone('day');
  wallet.earn(2);
  chronicle.add('The Harbor Board paid 2 coin wages.', 'economy');
});
weather.onChange((name) => {
  chronicle.add(`The weather turns: ${name}.`, 'weather');
});
chronicle.add('Arrived at Lantern Lane. The light is lit, the cat is fed.', 'world');

/* ---------------------------------- loop ---------------------------------- */
let chipClock = '';
const loop = createLoop({
  step: 1 / 30,
  tick(dt) {
    clock.update(dt);
    weather.update(dt);
    // movement
    const mx = input.x;
    const my = input.y;
    player.moving = mx !== 0 || my !== 0;
    if (player.moving && player.stamina > 0) {
      player.x += mx * player.speed * dt;
      player.y += my * player.speed * 0.6 * dt;
      if (mx) player.facing = mx;
      player.stamina = Math.max(0, player.stamina - 6 * dt);
    } else {
      player.stamina = Math.min(100, player.stamina + 10 * dt);
    }
    player.x = Math.max(24, Math.min(936, player.x));
    player.y = Math.max(384, Math.min(478, player.y));
    world.update(dt);
    handleInteract(dt);
    input.endFrame();
    // rain ambience follows the weather
    audio.setAmbient(
      weather.current === 'Rain' || weather.current === 'Storm' ? weather.intensity : 0,
      { freq: weather.current === 'Storm' ? 500 : 1200 },
    );
  },
  draw() {
    const [top, horizon] = clock.skyTint();
    const { ctx } = renderer;
    const grad = ctx.createLinearGradient(0, 0, 0, 540);
    grad.addColorStop(0, top);
    grad.addColorStop(1, horizon);
    renderer.clear('#000');
    renderer.drawScreen((c) => { c.fillStyle = grad; c.fillRect(0, 0, 960, 540); });

    // sun / moon
    renderer.draw(0, (c) => {
      const a = clock.t * Math.PI * 2 - Math.PI / 2;
      const sx = 480 + Math.cos(a) * 380;
      const sy = 300 - Math.sin(a) * 240; // canvas y is down: subtract so noon is high
      c.fillStyle = clock.isNight ? '#e8ecf5' : '#ffd94d';
      c.beginPath(); c.arc(sx, sy, clock.isNight ? 14 : 20, 0, Math.PI * 2); c.fill();
    });
    // hills + ground
    renderer.draw(1, (c) => {
      c.fillStyle = 'rgba(30,60,40,.55)';
      c.beginPath(); c.moveTo(0, 400); c.quadraticCurveTo(240, 330, 480, 392); c.quadraticCurveTo(720, 440, 960, 380); c.lineTo(960, 540); c.lineTo(0, 540); c.fill();
      c.fillStyle = '#3d6b35';
      c.fillRect(0, 428, 960, 112);
      c.fillStyle = '#8a6f4d';
      c.fillRect(0, 446, 960, 14); // the lane itself
    });
    // tree
    renderer.draw(2, (c) => {
      c.fillStyle = '#5a4030'; c.fillRect(TREE_POS.x - 6, TREE_POS.y - 66, 12, 66);
      c.fillStyle = '#2f5d2a';
      for (const [ox, oy, r] of [[-26, -84, 26], [0, -100, 32], [28, -82, 24]]) {
        c.beginPath(); c.arc(TREE_POS.x + ox, TREE_POS.y + oy, r, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#c33';
      for (const [ox, oy] of [[-18, -78], [8, -96], [22, -70]]) { c.fillRect(TREE_POS.x + ox, TREE_POS.y + oy, 5, 5); }
    });
    // Mabel's stall
    renderer.draw(2, (c) => {
      const x = MABEL_POS.x + 26;
      c.fillStyle = '#6b4a2f'; c.fillRect(x, MABEL_POS.y - 58, 92, 58);
      c.fillStyle = '#a33b3b'; c.fillRect(x - 6, MABEL_POS.y - 74, 104, 16);
      c.fillStyle = '#e8e4da'; c.fillRect(x - 6, MABEL_POS.y - 74, 104, 5);
      c.fillStyle = '#c33';
      c.fillRect(x + 12, MABEL_POS.y - 34, 8, 8); c.fillRect(x + 30, MABEL_POS.y - 34, 8, 8);
      c.fillStyle = '#7fc76b'; c.fillRect(x + 48, MABEL_POS.y - 34, 8, 8); c.fillRect(x + 64, MABEL_POS.y - 34, 8, 8);
    });
    // Mabel (breathing bob) + player + cat via entities
    const bob = Math.round(Math.sin(loop.simTime * 2) * 1.5);
    renderer.draw(3, (c) => drawSprite(c, MABEL, MABEL_PAL, MABEL_POS.x - 18, MABEL_POS.y - 39 + bob, { scale: 3 }));
    renderer.draw(4, (c) => {
      const frame = player.moving && Math.floor(loop.simTime * 8) % 2 ? LEGS_B : LEGS_A;
      drawSprite(c, [...KEEPER_BODY, ...frame], KEEPER_PAL, player.x - 18, player.y - 39, { scale: 3, flipX: player.facing < 0 });
    });
    renderer.draw(4, (c) => world.draw(c));
    // night tint + lantern glow
    renderer.draw(6, (c) => {
      if (clock.darkness > 0) {
        c.fillStyle = `rgba(6,8,26,${clock.darkness})`;
        c.fillRect(0, 0, 960, 540);
        const g = c.createRadialGradient(player.x, player.y - 10, 8, player.x, player.y - 10, 110);
        g.addColorStop(0, 'rgba(255,190,90,.34)');
        g.addColorStop(1, 'rgba(255,190,90,0)');
        c.fillStyle = g;
        c.fillRect(player.x - 120, player.y - 130, 240, 240);
      }
    });
    // weather overlay
    renderer.drawScreen((c) => {
      if (weather.current === 'Rain' || weather.current === 'Storm') {
        c.strokeStyle = `rgba(170,200,255,${0.55 * weather.intensity})`;
        c.lineWidth = 1;
        const n = Math.floor((weather.current === 'Storm' ? 130 : 70) * weather.intensity);
        const slant = weather.current === 'Storm' ? 6 : 2;
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const rx = ((i * 173 + Math.floor(loop.simTime * 700)) % 980) - 10;
          const ry = ((i * 271 + Math.floor(loop.simTime * 900)) % 560) - 10;
          c.moveTo(rx, ry); c.lineTo(rx - slant, ry + 12);
        }
        c.stroke();
      }
      if (weather.current === 'Fog') {
        c.fillStyle = `rgba(210,218,228,${0.38 * weather.intensity})`;
        c.fillRect(0, 0, 960, 540);
      }
    });
    renderer.endFrame();

    // HUD refresh (cheap, change-guarded where it matters)
    const timeStr = `${clock.phase} ${clock.timeString}`;
    if (timeStr !== chipClock) {
      chipClock = timeStr;
      chips.set('day', `Day ${clock.day} · ${clock.season.name}`);
      chips.set('time', timeStr);
      chips.set('weather', weather.current);
    }
    chips.set('coin', wallet.coin);
    gauges.set('stamina', player.stamina);
    gauges.set('daylight', clock.t * 100);
  },
});

/* ------------------------------ debug hook ------------------------------- */
window.WICK_DEMO = { player, cat, clock, weather, chronicle, wallet, stock, shop, saves, loop, world };
