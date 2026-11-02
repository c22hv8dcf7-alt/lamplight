# Wick Engine

*A small, open-source 2D web game engine for cozy pixel games and living simulations.*

Wick is the reusable machinery underneath Porch Light's single-file HTML5
games — [World Simulator](https://porchlight-developer.itch.io/world-simulator),
[The Living Reef](https://porchlight-developer.itch.io/the-living-reef) and
[The Last Lighthouse](https://porchlight-developer.itch.io/the-last-lighthouse)
were each built by hand-rolling the same systems: a fixed-timestep loop, a
day/night clock, weather, a dated chronicle, wandering creatures, hold-to-work
chores, a coin-and-shop economy, HUD panels, saves. Wick codifies that pattern
once, so the next game starts at the interesting part.

- **Zero runtime dependencies.** Plain JavaScript (ES2022) + JSDoc types.
- **Single-file output.** `tools/bundle.mjs` (also dependency-free) packs a
  game + the engine into one self-contained `.html` that runs from `file://`
  and uploads straight to itch.io.
- **MIT licensed.** Copyright © Lee Vitaly Wyszynski.

## The Law

> **The engine only grows by extracting what a real shipped game needed —
> no speculative features.**

Every module in `src/` exists because a shipped game needed it first. New
systems earn their place by being built inside a game, proven there, and then
extracted. The roadmap (`ROADMAP.md`) lists candidates as
*extraction-pending*, never as promises.

## Language choice

Wick is vanilla JS with JSDoc annotations rather than TypeScript: the whole
toolchain (engine, bundler, demo, verification) runs with nothing but Node —
no compiler, no packages to install, nothing that can break offline or rot.
JSDoc typedefs keep editor type-checking and autocomplete working. If a
future game genuinely needs TS, the modules are written to convert
mechanically.

## Quickstart

A complete (tiny) Wick game in about twenty lines — a canvas, a clock, a
chronicle, and something that moves:

```js
import { createLoop, Renderer, WorldClock, Chronicle, drawSprite } from './wick.js';

const canvas = document.createElement('canvas');
canvas.width = 960; canvas.height = 540;
document.body.appendChild(canvas);
const r = new Renderer(canvas);
const clock = new WorldClock({ dayLength: 90 });
const chronicle = new Chronicle({ stamp: () => `Day ${clock.day}` });
clock.onDay((d) => chronicle.add(`Day ${d} begins.`));
const KEEPER = ['.hh.', 'hssh', '.cc.', 'd..d'];
const PAL = { h: '#e8a33d', s: '#f0c8a0', c: '#3f6fb5', d: '#2c3550' };
let x = 100;
createLoop({
  tick(dt) { clock.update(dt); x += 20 * dt; if (x > 900) x = 40; },
  draw() {
    const [top, hor] = clock.skyTint();
    const g = r.ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, top); g.addColorStop(1, hor);
    r.drawScreen((c) => { c.fillStyle = g; c.fillRect(0, 0, 960, 540); });
    r.draw(1, (c) => drawSprite(c, KEEPER, PAL, x, 420));
    r.endFrame();
  },
});
```

Then bundle your game into one file:

```sh
npm run build   # engine alone  -> dist/wick.js
npm run demo    # the demo game -> demo/dist/lantern-lane.html (single file)
```

For your own game: `node tools/bundle.mjs src/main.js out/game.html --html --title "My Game"`.
The bundler understands named imports/exports, export lists and re-exports
between relative files — no default exports, no bare package imports (there
are no packages).

## The demo — Lantern Lane

`demo/` is a proof scene, not a game: a keeper and her cat on a lane, an NPC
(Mabel) with dialogue, a working shop, a hold-to-work apple tree, day/night
and seasons, changing weather, a live chronicle, objectives, gauges, touch
buttons, and save/load — every module exercised together. Open
`demo/dist/lantern-lane.html` in any browser. `npm run verify` drives it
headlessly and checks the behaviour (see `VERIFICATION.md`).

## Module map

| Module | File | What it does |
|---|---|---|
| Core loop | `src/core.js` | Fixed-timestep sim tick + render loop, pause, speed tiers 0.5×/1×/2×/4× |
| Renderer | `src/renderer.js` | Canvas 2D, pixel-perfect, sprite sheets + frame animation, camera, z-ordered draws |
| Sprites | `src/sprites.js` | Procedural pixel sprites from string maps + palettes (Pico-8 style) |
| World clock | `src/clock.js` | Endless day/night cycle, phases, seasons, sky tinting, day/season events |
| Weather | `src/weather.js` | Extensible weather state machine with eased intensity and transitions |
| Chronicle | `src/chronicle.js` | Dated, categorised event log (data + self-updating scrollable panel) |
| Entities | `src/entities.js` | Entity list with spawn/despawn and wander/follow/seek/flee steering |
| Input | `src/input.js` | Keyboard + touch buttons as one action API; hold-to-work `Channel` |
| UI kit | `src/ui.js` | Chips, gauges, prompt line, dialogue box, objectives checklist |
| Economy | `src/economy.js` | `Wallet` (coin) and `Stock` (counted inventory) primitives |
| Shop | `src/shop.js` | Shop panel: goods, prices, buy/refuse, wired to Wallet + Stock |
| Save | `src/save.js` | Versioned localStorage saves via per-system providers |
| Audio | `src/audio.js` | Tiny WebAudio synth: blips, chimes, noise ambience — no assets |

## Verification

`npm run verify` (after `npm run demo`) plays the demo in headless Chromium:
real key holds to walk, a dialogue, a purchase with exact coin/stock deltas,
a day rollover, and a save/load round-trip — 13 checks, all passing for
v0.1. Full record: `VERIFICATION.md`.

## Catalogue & tool bridges

Wick stays small; big tools stay external. Wick's job is to accept their
output through thin bridge modules — art from Krita or Aseprite-style
spritesheet exports, maps from Tiled — built only when a real game needs one
(see `TOOLING_AND_CATALOGUE.md`). The catalogue in `catalogue/` is the
registry: `games.json` lists every game built on Wick, and `tools.json`
lists each supported external tool, the format Wick accepts, and the game
that proved the bridge.

## Repository layout

```
src/          the engine (one file per module, header comment in each)
demo/         Lantern Lane proof game (src/, dist/ single-file build, screenshots/)
tools/        bundle.mjs (export tool) · drive-demo.mjs (verification drive)
dist/         wick.js — the bundled engine
catalogue/    games.json + tools.json — the registries described above
ROADMAP.md    extraction-pending candidates
```

## License

MIT — see `LICENSE`. Use it for anything; the games you make with it are yours.
