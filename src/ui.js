/**
 * @module ui
 * The HUD kit every Wick game shares: top chips (counters), gauges (bars),
 * a contextual prompt line, a dialogue box, and an objectives list.
 *
 * All DOM, all inline-styled — no CSS file to ship, no framework — matching
 * the shipped games' HUDs: dark glass panels, amber accents, system font.
 */

const PANEL =
  'background:rgba(12,14,22,.88);border:1px solid #3a4157;border-radius:999px;color:#dfe6f2;' +
  'font:600 13px system-ui,sans-serif;padding:5px 12px;white-space:nowrap;';

/** A row of counter chips. `update(key, value)` rewrites one chip's value. */
export class Chips {
  /** @param {Array<{ key: string, label: string, value: string|number }>} defs */
  constructor(defs) {
    this.el = document.createElement('div');
    this.el.className = 'wick-chips';
    this.el.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    /** @type {Map<string, HTMLSpanElement>} */
    this._values = new Map();
    for (const d of defs) {
      const chip = document.createElement('div');
      chip.style.cssText = PANEL;
      chip.innerHTML = `${d.label} <span style="color:#f5c56b"></span>`;
      this._values.set(d.key, chip.querySelector('span'));
      this.set(d.key, d.value);
      this.el.appendChild(chip);
    }
  }
  set(key, value) {
    const s = this._values.get(key);
    if (s) s.textContent = String(value);
  }
}

/**
 * A labelled bar. Also exactly the shape a hold-to-work Channel renders with.
 * @param {string} label
 * @param {{ color?: string, max?: number }} [opts]
 */
export function gauge(label, { color = '#f5c56b', max = 100 } = {}) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'color:#dfe6f2;font:12px system-ui,sans-serif;margin:3px 0;';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;';
  const name = document.createElement('span');
  name.textContent = label;
  const val = document.createElement('span');
  val.style.color = '#8fa3c4';
  const track = document.createElement('div');
  track.style.cssText = 'height:8px;background:#232838;border-radius:99px;overflow:hidden;margin-top:2px;';
  const fill = document.createElement('div');
  fill.style.cssText = `height:100%;background:${color};border-radius:99px;transition:width .15s;`;
  track.appendChild(fill);
  row.appendChild(name);
  row.appendChild(val);
  wrap.appendChild(row);
  wrap.appendChild(track);
  return {
    el: wrap,
    /** @param {number} v value in 0..max */
    set(v) {
      const pct = Math.max(0, Math.min(100, (v / max) * 100));
      fill.style.width = pct + '%';
      val.textContent = `${Math.round(v)}`;
    },
  };
}

/** A stack of gauges in a titled panel (the keeper's-panel shape). */
export class GaugePanel {
  /** @param {string} title @param {Array<{ key: string, label: string, color?: string, max?: number }>} defs */
  constructor(title, defs) {
    this.el = document.createElement('div');
    this.el.style.cssText =
      'background:rgba(12,14,22,.92);border:1px solid #3a4157;border-radius:10px;padding:10px 12px;box-sizing:border-box;';
    const head = document.createElement('div');
    head.textContent = title;
    head.style.cssText = 'font:700 11px system-ui,sans-serif;letter-spacing:.06em;color:#f5c56b;margin-bottom:6px;';
    this.el.appendChild(head);
    /** @type {Map<string, ReturnType<typeof gauge>>} */
    this._gauges = new Map();
    for (const d of defs) {
      const g = gauge(d.label, d);
      this._gauges.set(d.key, g);
      this.el.appendChild(g.el);
    }
  }
  set(key, v) { const g = this._gauges.get(key); if (g) g.set(v); }
}

/** The contextual prompt line: "E — Read the instruments". */
export class Prompt {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'wick-prompt';
    this.el.style.cssText =
      'position:absolute;left:50%;bottom:14px;transform:translateX(-50%);' + PANEL + 'display:none;z-index:5;';
  }
  show(text) { this.el.textContent = text; this.el.style.display = 'block'; }
  hide() { this.el.style.display = 'none'; }
}

/**
 * A dialogue box: shows lines one at a time; advance() moves on (wire it to
 * the interact key's pressed edge). onDone fires after the last line.
 */
export class Dialogue {
  /** @param {{ onDone?: () => void }} [opts] */
  constructor({ onDone } = {}) {
    this.onDone = onDone;
    this.lines = [];
    this.i = 0;
    this.open = false;
    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:absolute;left:50%;bottom:14px;transform:translateX(-50%);width:min(92%,560px);' +
      'background:rgba(12,14,22,.95);border:1px solid #3a4157;border-radius:12px;color:#dfe6f2;' +
      'font:14px/1.5 system-ui,sans-serif;padding:12px 14px;box-sizing:border-box;display:none;z-index:6;';
    this._name = document.createElement('div');
    this._name.style.cssText = 'font-weight:700;color:#f5c56b;font-size:12px;letter-spacing:.05em;';
    this._text = document.createElement('div');
    this.el.appendChild(this._name);
    this.el.appendChild(this._text);
  }
  /** @param {Array<{ name?: string, text: string }>} lines */
  say(lines) {
    this.lines = lines;
    this.i = 0;
    this.open = true;
    this._render();
  }
  advance() {
    if (!this.open) return;
    this.i++;
    if (this.i >= this.lines.length) {
      this.open = false;
      this.el.style.display = 'none';
      if (this.onDone) this.onDone();
    } else this._render();
  }
  _render() {
    const line = this.lines[this.i];
    this._name.textContent = line.name || '';
    this._name.style.display = line.name ? 'block' : 'none';
    this._text.textContent = line.text;
    this.el.style.display = 'block';
  }
}

/** An objectives / readiness checklist with done ticks. */
export class Objectives {
  /** @param {string} title */
  constructor(title) {
    this.el = document.createElement('div');
    this.el.style.cssText =
      'background:rgba(12,14,22,.92);border:1px solid #3a4157;border-radius:10px;padding:10px 12px;' +
      'color:#dfe6f2;font:13px/1.5 system-ui,sans-serif;box-sizing:border-box;';
    const head = document.createElement('div');
    head.textContent = title;
    head.style.cssText = 'font:700 11px system-ui,sans-serif;letter-spacing:.06em;color:#f5c56b;margin-bottom:4px;';
    this.el.appendChild(head);
    this._list = document.createElement('div');
    this.el.appendChild(this._list);
    /** @type {Map<string, { text: string, done: boolean, row: HTMLElement }>} */
    this._items = new Map();
  }
  /** @param {string} key @param {string} text */
  add(key, text) {
    const row = document.createElement('div');
    this._list.appendChild(row);
    this._items.set(key, { text, done: false, row });
    this._render(key);
  }
  setDone(key, done = true) {
    const it = this._items.get(key);
    if (it) { it.done = done; this._render(key); }
  }
  _render(key) {
    const it = this._items.get(key);
    it.row.textContent = `${it.done ? '✓' : '○'} ${it.text}`;
    it.row.style.color = it.done ? '#8fa98f' : '#dfe6f2';
    it.row.style.textDecoration = it.done ? 'line-through' : 'none';
  }
}
