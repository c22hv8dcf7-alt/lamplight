/**
 * @module clock
 * The world clock: an endless day/night cycle with named phases and seasons.
 *
 * World Simulator ran past Year 11,980 on this pattern; The Living Reef ran
 * 6,000 days on it. Time never ends; days roll over, seasons cycle, and games
 * subscribe to day changes instead of polling.
 */

/** @typedef {{ name: string, days: number }} Season */

/** Default temperate seasons: 7 days each, a 28-day year. Games may replace. */
export const DEFAULT_SEASONS = [
  { name: 'Spring', days: 7 },
  { name: 'Summer', days: 7 },
  { name: 'Autumn', days: 7 },
  { name: 'Winter', days: 7 },
];

/** Phase boundaries as fractions of the day (0 = midnight). */
const PHASES = [
  { name: 'Night', until: 0.21 },
  { name: 'Dawn', until: 0.29 },
  { name: 'Day', until: 0.71 },
  { name: 'Dusk', until: 0.79 },
  { name: 'Night', until: 1.01 },
];

export class WorldClock {
  /**
   * @param {object} [opts]
   * @param {number} [opts.dayLength] seconds per full day at 1x (default 120)
   * @param {Season[]} [opts.seasons]
   * @param {number} [opts.startDay]
   * @param {number} [opts.startTime] 0..1 fraction of day (default 0.35, morning)
   */
  constructor({ dayLength = 120, seasons = DEFAULT_SEASONS, startDay = 1, startTime = 0.35 } = {}) {
    this.dayLength = dayLength;
    this.seasons = seasons;
    this.day = startDay;
    this.t = startTime;
    /** @type {Array<(day: number, season: Season) => void>} */
    this._dayListeners = [];
    /** @type {Array<(season: Season, day: number) => void>} */
    this._seasonListeners = [];
    this._lastSeason = this.season.name;
  }

  /** Advance the clock. Call from the sim tick. @param {number} dt seconds */
  update(dt) {
    this.t += dt / this.dayLength;
    while (this.t >= 1) {
      this.t -= 1;
      this.day++;
      for (const fn of this._dayListeners) fn(this.day, this.season);
      if (this.season.name !== this._lastSeason) {
        this._lastSeason = this.season.name;
        for (const fn of this._seasonListeners) fn(this.season, this.day);
      }
    }
  }

  /** Current phase name: Night | Dawn | Day | Dusk. */
  get phase() {
    for (const p of PHASES) if (this.t < p.until) return p.name;
    return 'Night';
  }

  /** True between dusk and dawn. */
  get isNight() { return this.t >= 0.79 || this.t < 0.21; }

  /** Current season, derived from the day count. */
  get season() {
    const yearLen = this.seasons.reduce((s, x) => s + x.days, 0);
    let d = (this.day - 1) % yearLen;
    for (const s of this.seasons) {
      if (d < s.days) return s;
      d -= s.days;
    }
    return this.seasons[0];
  }

  /** Year number (1-based) within the season cycle. */
  get year() {
    const yearLen = this.seasons.reduce((s, x) => s + x.days, 0);
    return Math.floor((this.day - 1) / yearLen) + 1;
  }

  /** Clock-face string, e.g. "14:30". */
  get timeString() {
    const mins = Math.floor(this.t * 24 * 60);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /**
   * Sky colours for the current time: games use these to tint their sky
   * gradient, or override entirely. Returns [top, horizon] CSS colours.
   * @returns {[string, string]}
   */
  skyTint() {
    const t = this.t;
    const lerp = (a, b, k) => Math.round(a + (b - a) * k);
    const mix = (c1, c2, k) => `rgb(${lerp(c1[0], c2[0], k)},${lerp(c1[1], c2[1], k)},${lerp(c1[2], c2[2], k)})`;
    // Keyframes: [t, topRGB, horizonRGB]
    const keys = [
      [0.0, [8, 10, 32], [24, 28, 58]],
      [0.21, [8, 10, 32], [24, 28, 58]],
      [0.29, [70, 80, 140], [240, 160, 90]],
      [0.4, [90, 160, 230], [190, 225, 250]],
      [0.71, [90, 160, 230], [190, 225, 250]],
      [0.79, [60, 60, 120], [245, 140, 80]],
      [0.88, [8, 10, 32], [24, 28, 58]],
      [1.0, [8, 10, 32], [24, 28, 58]],
    ];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, top0, hor0] = keys[i];
      const [t1, top1, hor1] = keys[i + 1];
      if (t >= t0 && t <= t1) {
        const k = (t - t0) / Math.max(t1 - t0, 1e-6);
        return [mix(top0, top1, k), mix(hor0, hor1, k)];
      }
    }
    return ['#080a20', '#181c3a'];
  }

  /** Darkness overlay alpha 0..1 — handy for a night tint rectangle. */
  get darkness() {
    if (this.phase === 'Day') return 0;
    if (this.phase === 'Dawn' || this.phase === 'Dusk') return 0.25;
    return 0.55;
  }

  /** Subscribe to day rollover. Returns an unsubscribe function. */
  onDay(fn) {
    this._dayListeners.push(fn);
    return () => { this._dayListeners = this._dayListeners.filter((f) => f !== fn); };
  }
  /** Subscribe to season change. Returns an unsubscribe function. */
  onSeason(fn) {
    this._seasonListeners.push(fn);
    return () => { this._seasonListeners = this._seasonListeners.filter((f) => f !== fn); };
  }

  /** Serializable state for the save module. */
  snapshot() { return { day: this.day, t: this.t }; }
  restore(s) { if (s) { this.day = s.day ?? this.day; this.t = s.t ?? this.t; this._lastSeason = this.season.name; } }
}
