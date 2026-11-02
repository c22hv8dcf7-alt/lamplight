/**
 * @module core
 * The game loop: a fixed-timestep simulation tick decoupled from rendering.
 *
 * Extracted from the pattern shared by World Simulator, The Living Reef and
 * The Last Lighthouse: the world advances in fixed sim steps (so behaviour is
 * identical at any frame rate), rendering happens every animation frame, and
 * the player can pause or change speed in tiers (0.5x / 1x / 2x / 4x).
 */

export const SPEED_TIERS = [0.5, 1, 2, 4];

/**
 * Create and start a game loop.
 *
 * @param {object} opts
 * @param {(dt: number) => void} opts.tick   Fixed-step simulation update. dt is always `step` seconds.
 * @param {(alpha: number) => void} opts.draw Render callback; alpha is interpolation remainder (0..1).
 * @param {number} [opts.step]  Fixed sim step in seconds (default 1/30).
 * @param {number} [opts.speed] Initial speed multiplier; snapped to SPEED_TIERS.
 * @returns {{
 *   pause(): void, resume(): void, togglePause(): void,
 *   setSpeed(n: number): number, cycleSpeed(): number,
 *   readonly paused: boolean, readonly speed: number,
 *   readonly simTime: number, stop(): void
 * }}
 */
export function createLoop({ tick, draw, step = 1 / 30, speed = 1 }) {
  let raf = 0;
  let last = 0;
  let acc = 0;
  let simTime = 0;
  let paused = false;
  let currentSpeed = SPEED_TIERS.includes(speed) ? speed : 1;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    // Clamp the frame delta so a backgrounded tab doesn't fast-forward.
    let delta = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (!paused) {
      acc += delta * currentSpeed;
      // Spiral-of-death guard: never run more than 8 steps in one frame.
      let steps = 0;
      while (acc >= step && steps < 8) {
        tick(step);
        simTime += step;
        acc -= step;
        steps++;
      }
      if (steps === 8) acc = 0;
    }
    draw(acc / step);
  }
  raf = requestAnimationFrame(frame);

  return {
    pause() { paused = true; },
    resume() { paused = false; },
    togglePause() { paused = !paused; return paused; },
    setSpeed(n) {
      if (SPEED_TIERS.includes(n)) currentSpeed = n;
      return currentSpeed;
    },
    cycleSpeed() {
      const i = SPEED_TIERS.indexOf(currentSpeed);
      currentSpeed = SPEED_TIERS[(i + 1) % SPEED_TIERS.length];
      return currentSpeed;
    },
    get paused() { return paused; },
    get speed() { return currentSpeed; },
    get simTime() { return simTime; },
    stop() { cancelAnimationFrame(raf); },
  };
}
