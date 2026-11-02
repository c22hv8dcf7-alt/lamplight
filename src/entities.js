/**
 * @module entities
 * A minimal entity world: a list of things with position, velocity and a
 * behaviour, updated and drawn each frame. Deliberately NOT an ECS — the
 * shipped games never needed one. Behaviours are small steering functions:
 * wander, follow, seek, and flee, composable in an entity's own update.
 */

/**
 * @typedef {object} Entity
 * @property {number} x @property {number} y
 * @property {number} vx @property {number} vy
 * @property {number} speed base movement speed (units/sec)
 * @property {boolean} dead set true to despawn on the next sweep
 * @property {Function} [update] per-entity update fn(entity, dt, world)
 * @property {Function} [draw] per-entity draw fn(entity, ctx)
 * @property {object} data free-form game data
 */

/** Behaviour: drift randomly within optional bounds. */
export function wander(e, dt, rng = Math.random) {
  e._wanderT = (e._wanderT ?? 0) - dt;
  if (e._wanderT <= 0) {
    e._wanderT = 1 + rng() * 2;
    const a = rng() * Math.PI * 2;
    e.vx = Math.cos(a) * e.speed;
    e.vy = Math.sin(a) * e.speed;
  }
  step(e, dt);
  if (e.bounds) clampToBounds(e);
}

/** Behaviour: follow a target point/entity, stopping inside `arrive` radius. */
export function follow(e, target, dt, arrive = 24) {
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const d = Math.hypot(dx, dy);
  if (d <= arrive) { e.vx = 0; e.vy = 0; return; }
  e.vx = (dx / d) * e.speed;
  e.vy = (dy / d) * e.speed;
  step(e, dt);
}

/** Behaviour: move straight toward a point at full speed. */
export function seek(e, x, y, dt) {
  const dx = x - e.x;
  const dy = y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.vx = (dx / d) * e.speed;
  e.vy = (dy / d) * e.speed;
  step(e, dt);
}

/** Behaviour: move directly away from a point (ducks scattering, deer bolting). */
export function flee(e, x, y, dt) {
  const dx = e.x - x;
  const dy = e.y - y;
  const d = Math.hypot(dx, dy) || 1;
  e.vx = (dx / d) * e.speed;
  e.vy = (dy / d) * e.speed;
  step(e, dt);
}

function step(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; }
function clampToBounds(e) {
  const b = e.bounds;
  e.x = Math.max(b.x, Math.min(b.x + b.w, e.x));
  e.y = Math.max(b.y, Math.min(b.y + b.h, e.y));
}

export class World {
  constructor() {
    /** @type {Entity[]} */
    this.entities = [];
  }

  /**
   * Spawn an entity.
   * @param {Partial<Entity> & { x: number, y: number }} props
   * @returns {Entity} the spawned entity (same object, mutated in place)
   */
  spawn(props) {
    const e = Object.assign(
      { x: 0, y: 0, vx: 0, vy: 0, speed: 40, dead: false, data: {} },
      props,
    );
    this.entities.push(e);
    return e;
  }

  /** Mark an entity for removal. */
  despawn(e) { e.dead = true; }

  /** Update all entities (and sweep the dead). Call from the sim tick. */
  update(dt) {
    for (const e of this.entities) {
      if (e.update) e.update(e, dt, this);
    }
    if (this.entities.some((e) => e.dead)) {
      this.entities = this.entities.filter((e) => !e.dead);
    }
  }

  /**
   * Draw all entities that have a draw fn, sorted by y (cheap depth for
   * top-down scenes) unless an entity sets `z` explicitly.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const sorted = [...this.entities].sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y));
    for (const e of sorted) if (e.draw) e.draw(e, ctx);
  }

  /** Live entities matching a predicate. */
  find(fn) { return this.entities.filter((e) => !e.dead && fn(e)); }
  get count() { return this.entities.length; }
  clear() { this.entities = []; }
}
