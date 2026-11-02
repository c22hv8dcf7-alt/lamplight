/**
 * @module chronicle
 * The Chronicle: a dated, categorised event log — the memory of every Lamplight
 * world. World Simulator's wars and plagues, the Reef's bleaching warnings
 * and the Lighthouse's keeper's log are all this one idea: when something
 * happens, it is written down with its date, and the player can scroll it.
 *
 * Entries are plain data (serialisable for saves); renderPanel() builds a
 * scrollable DOM panel that live-updates as entries arrive.
 */

export class Chronicle {
  /**
   * @param {object} [opts]
   * @param {number} [opts.maxEntries] ring-buffer cap (default 500)
   * @param {() => string} [opts.stamp] date-stamp provider, e.g. () => `Day ${clock.day}`
   */
  constructor({ maxEntries = 500, stamp = () => '' } = {}) {
    this.maxEntries = maxEntries;
    this.stamp = stamp;
    /** @type {Array<{ stamp: string, category: string, text: string }>} */
    this.entries = [];
    /** @type {Array<(entry: object) => void>} */
    this._listeners = [];
    /** @type {HTMLElement|null} */
    this._panel = null;
  }

  /**
   * Write an entry.
   * @param {string} text
   * @param {string} [category] e.g. 'weather', 'economy', 'world', 'danger'
   * @returns the stored entry
   */
  add(text, category = 'world') {
    const entry = { stamp: this.stamp(), category, text };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    for (const fn of this._listeners) fn(entry);
    if (this._panel) this._appendToPanel(entry);
    return entry;
  }

  /** Newest-first copy of entries, optionally filtered by category. */
  list(category) {
    const src = category ? this.entries.filter((e) => e.category === category) : this.entries;
    return [...src].reverse();
  }

  onEntry(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter((f) => f !== fn); };
  }

  /**
   * Build the scrollable DOM panel. Newest entries appear at the top; the
   * panel updates itself as entries are added while it exists.
   * @param {{ title?: string, height?: string }} [opts]
   * @returns {HTMLElement}
   */
  renderPanel({ title = 'Chronicle', height = '180px' } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'lamplight-chronicle';
    wrap.style.cssText =
      'background:rgba(12,14,22,.92);border:1px solid #3a4157;border-radius:10px;color:#dfe6f2;' +
      'font:13px/1.45 system-ui,sans-serif;padding:8px 10px;box-sizing:border-box;';
    const head = document.createElement('div');
    head.textContent = title;
    head.style.cssText = 'font-weight:700;letter-spacing:.06em;font-size:11px;color:#f5c56b;margin-bottom:6px;';
    const body = document.createElement('div');
    body.className = 'lamplight-chronicle-body';
    body.style.cssText = `overflow-y:auto;max-height:${height};padding-right:4px;`;
    wrap.appendChild(head);
    wrap.appendChild(body);
    this._panel = body;
    for (const e of this.list()) this._appendToPanel(e, true);
    return wrap;
  }

  _appendToPanel(entry, atEnd = false) {
    if (!this._panel) return;
    const row = document.createElement('div');
    row.style.cssText = 'padding:2px 0;border-bottom:1px solid rgba(255,255,255,.05);';
    const when = entry.stamp ? `<span style="color:#8fa3c4">${entry.stamp}</span> · ` : '';
    row.innerHTML = `${when}<span style="color:#f5c56b">${entry.category}</span> — ${entry.text}`;
    if (atEnd) this._panel.appendChild(row);
    else this._panel.prepend(row);
  }

  snapshot() { return { entries: this.entries }; }
  restore(s) {
    if (!s) return;
    this.entries = Array.isArray(s.entries) ? s.entries.slice(-this.maxEntries) : [];
    if (this._panel) {
      this._panel.innerHTML = '';
      for (const e of this.list()) this._appendToPanel(e, true);
    }
  }
}
