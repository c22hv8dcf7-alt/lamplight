# Wick Roadmap

Per the Law, nothing here is a promise. Each item is a candidate that becomes
real only when a shipped (or shipping) Porch Light game needs it, gets built
inside that game first, and is then extracted into the engine.

## v0.2 candidates (extraction-pending)

- **Tilemaps** — The Last Lighthouse's point/village/lane were hand-drawn
  rects and sprites per scene. The first Wick game with a genuinely tiled
  world (a village you can walk *through*, not past) will need a tilemap
  layer + collision grid; built there, extracted here.
- **Pathfinding** — Lighthouse villagers stroll fixed streets today; World
  Simulator's citizens will want A* on the tilemap grid to go *somewhere*.
  Lands together with tilemaps, from the same game.
- **Particles** — Reef plankton drift, Lighthouse surf spray and rain were
  all one-off canvas code in their games. A tiny pooled particle emitter is
  the most obvious repeated cost across all three; the next game that needs
  weather dressing or ambient motes extracts it.

## Explicitly not planned

- 3D, physics engines, networking/multiplayer, an editor GUI, ECS. Wick is a
  2D single-file web engine for cozy games and living sims; if a future game
  needs one of these, that game is probably a Godot game instead.
