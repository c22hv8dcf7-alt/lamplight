/**
 * @module audio
 * A tiny WebAudio helper: synthesised blips and a soft noise-based ambience,
 * no audio assets. Games in this family ship as one file, so sound has to be
 * made, not loaded. Deliberately minimal: a blip, a chime arpeggio, rain-ish
 * noise you can fade with weather intensity, and a mute.
 *
 * The context is created lazily on first use (browsers require a user
 * gesture; games should call unlock() from their first click/keypress).
 */

export class AudioKit {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.muted = false;
    this._ambient = null; // { source, gain }
  }

  /** Create/resume the context. Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  /**
   * A short synthesised tone.
   * @param {object} [opts]
   * @param {number} [opts.freq] Hz (default 660)
   * @param {number} [opts.dur] seconds (default 0.08)
   * @param { OscillatorType } [opts.type]
   * @param {number} [opts.gain] 0..1
   * @param {number} [opts.slide] Hz to glide to over dur
   */
  blip({ freq = 660, dur = 0.08, type = 'sine', gain = 0.15, slide = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** A pleasant two-note chime — purchases, completed work, dawn. */
  chime() {
    this.blip({ freq: 660, dur: 0.12, type: 'triangle', gain: 0.12 });
    setTimeout(() => this.blip({ freq: 990, dur: 0.16, type: 'triangle', gain: 0.12 }), 70);
  }

  /**
   * Start/stop looping filtered-noise ambience (rain, wind, sea).
   * @param {number} level 0..1; 0 stops it
   * @param {{ freq?: number }} [opts] filter cutoff — low for wind, high for rain
   */
  setAmbient(level, { freq = 800 } = {}) {
    if (!this.ctx) return;
    if (level <= 0) {
      if (this._ambient) {
        try { this._ambient.source.stop(); } catch { /* already stopped */ }
        this._ambient = null;
      }
      return;
    }
    if (!this._ambient) {
      const len = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(this.ctx.destination);
      source.start();
      this._ambient = { source, gain, filter };
    }
    this._ambient.filter.frequency.value = freq;
    this._ambient.gain.gain.setTargetAtTime(this.muted ? 0 : level * 0.12, this.ctx.currentTime, 0.4);
  }

  setMuted(m) {
    this.muted = m;
    if (this._ambient && this.ctx) {
      this._ambient.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }
}
