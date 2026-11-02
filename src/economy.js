/**
 * @module economy
 * Money and stuff, as primitives: a Wallet of coin and a Stock inventory of
 * counted goods. The Lighthouse's Harbor Board coin and Mabel's shelves are
 * the reference implementation — pay at dawn, spend at the counter, and the
 * numbers always move through these two objects so they can be saved,
 * displayed and audited in one place.
 */

export class Wallet {
  /** @param {number} [coin] starting coin */
  constructor(coin = 0) { this.coin = coin; }
  canAfford(price) { return this.coin >= price; }
  /** Add coin. @returns new balance */
  earn(n) { this.coin += n; return this.coin; }
  /**
   * Spend coin if affordable.
   * @returns {boolean} true if the spend happened
   */
  spend(n) {
    if (!this.canAfford(n)) return false;
    this.coin -= n;
    return true;
  }
  snapshot() { return { coin: this.coin }; }
  restore(s) { if (s) this.coin = s.coin ?? this.coin; }
}

export class Stock {
  /** @param {Object<string, number>} [initial] item id -> count */
  constructor(initial = {}) { this.items = { ...initial }; }
  count(id) { return this.items[id] ?? 0; }
  /** @returns new count of id */
  add(id, n = 1) { this.items[id] = this.count(id) + n; return this.items[id]; }
  /**
   * Remove n of id if available.
   * @returns {boolean} true if removed
   */
  take(id, n = 1) {
    if (this.count(id) < n) return false;
    this.items[id] -= n;
    return true;
  }
  snapshot() { return { items: { ...this.items } }; }
  restore(s) { if (s) this.items = { ...(s.items || {}) }; }
}
