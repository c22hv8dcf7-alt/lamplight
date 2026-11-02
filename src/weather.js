/**
 * @module weather
 * A weather state machine: named states with weighted random transitions,
 * minimum/maximum durations, and change listeners. Games extend it by
 * supplying their own state table (e.g. a reef adds 'Algal Bloom').
 *
 * States carry an `intensity` 0..1 that eases in and out, so rain fades in
 * rather than snapping on — the one-at-a-time, watchable weather Levi asked
 * for in World Simulator.
 */

/** @typedef {{ name: string, min: number, max: number, weight: number, next?: Object<string, number> }} WeatherStateDef
 *  min/max: duration range in seconds. weight: baseline pick weight.
 *  next: optional per-state transition weights overriding `weight`. */

export const DEFAULT_WEATHER = [
  { name: 'Clear', min: 20, max: 45, weight: 5 },
  { name: 'Cloudy', min: 15, max: 35, weight: 3 },
  { name: 'Rain', min: 12, max: 30, weight: 2 },
  { name: 'Fog', min: 10, max: 25, weight: 1 },
  { name: 'Storm', min: 8, max: 18, weight: 1 },
];

export class Weather {
  /**
   * @param {object} [opts]
   * @param {WeatherStateDef[]} [opts.states]
   * @param {string} [opts.start] starting state name
   * @param {() => number} [opts.random] injectable RNG for deterministic tests
   */
  constructor({ states = DEFAULT_WEATHER, start = 'Clear', random = Math.random } = {}) {
    this.states = new Map(states.map((s) => [s.name, s]));
    if (!this.states.has(start)) throw new Error(`weather: unknown start state "${start}"`);
    this.random = random;
    this.current = start;
    this.intensity = 0;
    this.targetIntensity = 1;
    this._age = 0;
    this._duration = this._rollDuration(this.states.get(start));
    /** @type {Array<(name: string, prev: string) => void>} */
    this._listeners = [];
  }

  _rollDuration(def) { return def.min + this.random() * (def.max - def.min); }

  _pickNext() {
    const from = this.states.get(this.current);
    const options = [...this.states.values()].filter((s) => s.name !== this.current);
    let total = 0;
    const weights = options.map((s) => {
      const w = from.next && from.next[s.name] != null ? from.next[s.name] : s.weight;
      total += w;
      return w;
    });
    let r = this.random() * total;
    for (let i = 0; i < options.length; i++) {
      r -= weights[i];
      if (r <= 0) return options[i].name;
    }
    return options[options.length - 1].name;
  }

  /** Advance the machine. Call from the sim tick. @param {number} dt seconds */
  update(dt) {
    this._age += dt;
    // Ease intensity toward target (ramps up on entry, down just before exit).
    const exiting = this._age > this._duration - 2;
    this.targetIntensity = exiting ? 0 : 1;
    const rate = dt / 2;
    this.intensity += Math.max(-rate, Math.min(rate, this.targetIntensity - this.intensity));
    if (this._age >= this._duration) this.set(this._pickNext());
  }

  /** Force a state now (storms arriving on schedule, scripted beats). */
  set(name) {
    if (!this.states.has(name)) throw new Error(`weather: unknown state "${name}"`);
    const prev = this.current;
    this.current = name;
    this._age = 0;
    this._duration = this._rollDuration(this.states.get(name));
    this.intensity = 0;
    if (name !== prev) for (const fn of this._listeners) fn(name, prev);
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter((f) => f !== fn); };
  }

  snapshot() { return { current: this.current }; }
  restore(s) { if (s && this.states.has(s.current)) { this.current = s.current; this._age = 0; this.intensity = 1; } }
}
