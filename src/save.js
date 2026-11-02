/**
 * @module save
 * localStorage saves with a version field. Games register named providers —
 * one per system that has state (clock, wallet, stock, chronicle, their own
 * world) — each a { save(), load(data) } pair. The envelope is always
 * { version, savedAt, data: { key: ... } }, so old saves can be migrated by
 * version instead of silently misread.
 */

export const SAVE_VERSION = 1;

export class SaveSystem {
  /**
   * @param {object} [opts]
   * @param {string} [opts.prefix] localStorage key prefix (per game)
   * @param {number} [opts.version]
   */
  constructor({ prefix = 'lamplight', version = SAVE_VERSION } = {}) {
    this.prefix = prefix;
    this.version = version;
    /** @type {Map<string, { save: () => any, load: (data: any) => void }>} */
    this._providers = new Map();
  }

  /**
   * Register a state provider.
   * @param {string} key
   * @param {{ save: () => any, load: (data: any) => void }} provider
   */
  register(key, provider) { this._providers.set(key, provider); }

  _key(slot) { return `${this.prefix}:save:${slot}`; }

  /**
   * Write a save slot.
   * @param {string} [slot]
   * @returns {boolean} false if storage was unavailable/full
   */
  save(slot = 'main') {
    const data = {};
    for (const [key, p] of this._providers) data[key] = p.save();
    try {
      localStorage.setItem(this._key(slot), JSON.stringify({ version: this.version, savedAt: Date.now(), data }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read a save slot into all providers.
   * @param {string} [slot]
   * @returns {{ ok: boolean, reason?: string, version?: number }}
   */
  load(slot = 'main') {
    let raw;
    try { raw = localStorage.getItem(this._key(slot)); } catch { return { ok: false, reason: 'storage-unavailable' }; }
    if (!raw) return { ok: false, reason: 'empty' };
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return { ok: false, reason: 'corrupt' }; }
    if (parsed.version !== this.version) {
      return { ok: false, reason: 'version-mismatch', version: parsed.version };
    }
    for (const [key, p] of this._providers) {
      if (parsed.data && key in parsed.data) p.load(parsed.data[key]);
    }
    return { ok: true, version: parsed.version };
  }

  has(slot = 'main') {
    try { return localStorage.getItem(this._key(slot)) != null; } catch { return false; }
  }
  clear(slot = 'main') {
    try { localStorage.removeItem(this._key(slot)); } catch { /* storage unavailable */ }
  }
}
