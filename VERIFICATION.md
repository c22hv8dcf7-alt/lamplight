# Verification — Lamplight v0.1

**How:** `npm run demo` builds the single-file demo
(`demo/dist/lantern-lane.html`, 70,682 bytes), then
`node tools/drive-demo.mjs` plays it in headless Chromium (Playwright,
borrowed from the workshop install — Lamplight itself has zero dependencies).
The drive uses real keyboard holds and real DOM clicks against the exported
file at `file://`, and asserts on live game state via the demo's
`window.LAMPLIGHT_DEMO` debug hook.

**Result: 13/13 checks passed, zero console errors, zero page errors.**

| # | Check | Evidence |
|---|---|---|
| 1 | Loads with a live demo hook | `window.LAMPLIGHT_DEMO` present |
| 2 | Zero console errors on load | none captured |
| 3 | Keeper walks right on held ArrowRight | x 140 → 280 in 0.9 s |
| 4 | Keeper walks back left on held ArrowLeft | x 280 → 220 in 0.4 s |
| 5 | Talking to Mabel writes a chronicle entry | "Met Mabel at the market stall." (2 entries total at that point) |
| 6 | Shop opens after the dialogue | `shop.open === true` |
| 7 | Buying an apple spends exactly 3 coin | coin 12 → 9 |
| 8 | Buying an apple adds exactly 1 to stock | apples 0 → 1 |
| 9 | Purchase is chronicled | "Bought Apple for 3 coin." |
| 10 | Day rollover fires and is chronicled | Day 1 → 2; dawn wages entry (+2 coin) also fired |
| 11 | Night phase reached | phase = Night at t = 0.97 |
| 12 | Save/load round-trips coin and stock | saved coin 11 (12 − 3 apple + 2 wages), apples 1; scrambled to 999/42 in between, restored exactly |
| 13 | Zero console errors for the whole drive | none captured |

**Screenshots** (visually inspected, not just captured):
- `demo/screenshots/day.png` — Day 1, 09:34: keeper + cat on the lane, apple
  tree, Mabel at her stall, sun in a tinted sky, chips/gauges/objectives/
  chronicle/touch buttons all rendered.
- `demo/screenshots/shop.png` — Mabel's Stall open: three goods with prices,
  owned counts ("have 0/1/0"), coin readout; "Talk to Mabel" objective ticked.
- `demo/screenshots/night.png` — Day 2, 23:09: night tint with a lantern-glow
  radial around the keeper, moon, all three objectives ticked, chronicle
  showing purchase + day-rollover + wages entries in order.

**Also verified:** `npm run build` bundles the engine alone
(`dist/lamplight.js`, 56,830 bytes, 14 modules) with no errors.
Re-run after the Wick → Lamplight rename (2026-11-02): 13/13 again, unchanged.

**Found and fixed during verification:** the demo's sun/moon orbit used
canvas-positive y, putting the sun *below* the horizon at noon (invisible in
the first day screenshot). Fixed in `demo/src/main.js`, demo rebuilt, full
drive re-run green, day screenshot re-inspected (sun visible).

**Not covered by the drive** (present in code, verified only by reading it
and by its rendered UI):
touch-button input (the buttons render in every screenshot and call the same
`Input.setVirtual` path the keyboard uses, but no touch was emulated), the
hold-to-work tree-shake channel *completing* (its prompt renders — see the
day screenshot — but the drive never held E at the tree for the full 1.5 s),
a natural weather *transition* (the drive is shorter than the shortest
weather duration; the machine's state was read live, and the rain/fog
overlays draw from that same state), and audible audio (headless Chromium
has nothing to assert against; `AudioKit.unlock/blip/chime` were called by
the dialogue and purchase during the drive and produced no errors).
