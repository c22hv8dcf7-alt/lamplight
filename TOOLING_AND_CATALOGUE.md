# Wick — Tool Bridges & Catalogue (scope note, 2026-11-02)

Levi's direction: Wick should work with other high-powered, high-efficiency
game-development tools, and help get a catalogue going. This note scopes what
that means for Porch Light. It does not change the Law: bridges are built only
when a real game needs one — no speculative importers.

## The use case (ours)

Wick is Porch Light's fast lane: small 2D web games (living sims, cozy pixel
worlds) that ship to itch as one HTML file. Wick is deliberately small. The
big tools stay big and external; Wick gains thin bridges so their output
drops straight into a Wick game:

- **Art — Krita (already on Levi's Mac) / Aseprite-style exports.**
  Spritesheets + JSON atlas in → Wick's `Sheet`/`Animation` play them.
  Replaces hand-typed string-map sprites when a game needs richer art.
- **Maps — Tiled.** Levels and villages laid out in a real map editor,
  exported as Tiled JSON → Wick loads layers, tilesets, and object points
  (spawn points, shop doors, NPC homes). Also fills Wick's tilemap gap,
  extracted by the first game that needs a real map.
- **Sound — sfxr/jsfxr-style exports & plain audio files.** Wick's tiny
  WebAudio helper already covers blips; a bridge just standardises file
  loading for richer sound packs.
- **Godot — not a bridge, a lane.** Godot stays the flagship/heavy engine
  (CozyDev). Wick never competes with it; the catalogue lists both lanes so
  each project starts on the right one.

Payoff: the next Wick game starts with Krita art and a Tiled map already
wired into the day/night, weather, Chronicle, dialogue, shop, and save
machinery — days of setup saved per game, art quality up.

## The catalogue

Two registries, both plain files in the repo:

1. **Games catalogue** (`catalogue/games.json`) — every game built on Wick:
   name, one-line pitch, itch/GitHub link, Wick version used, which bridges
   it exercised. Each new release advertises the engine and the other games.
2. **Tools catalogue** (`catalogue/tools.json`) — each supported external
   tool: what it produces, the exact format Wick accepts, the bridge module,
   and the game that proved it. Adding a tool = adding one importer + one
   registry line, never a rebuild.

If Wick is published on GitHub, the catalogue is the front window: README
links it, and outside developers can add games/tools by pull request.

## Phasing (under the Law)

- **Phase 1 (first real need):** spritesheet-JSON bridge — the first Wick
  game with Krita/Aseprite art extracts it.
- **Phase 2:** Tiled JSON loader — extracted by the first game with a
  hand-laid map bigger than a screen.
- **Phase 3:** catalogue files + README section — cheap, can land with the
  GitHub publication or the first bridged game, whichever comes first.
- **Not planned:** editors inside Wick, Godot import/export, asset stores,
  plugins system. Wick stays a runtime + bridges.

## Open gate

GitHub publication is Levi's separate decision (presented 2026-11-02).
The catalogue works locally either way; publishing makes it public.
