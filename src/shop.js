/**
 * @module shop
 * The shop panel: a list of goods with prices, bought with a Wallet into a
 * Stock. This is Mabel's Chandlery, generalised — the panel owns no game
 * state; it moves numbers through economy.Wallet / economy.Stock and reports
 * each purchase through onBuy so the game can chronicle it, play a sound, or
 * check an objective off.
 */

import { Wallet as _W, Stock as _S } from './economy.js'; // type-only reference for JSDoc readers

/**
 * @typedef {object} Good
 * @property {string} id stock item id the purchase adds
 * @property {string} name display name
 * @property {number} price in coin
 * @property {number} [qty] how many of `id` one purchase adds (default 1)
 * @property {string} [blurb] one-line description
 */

export class ShopPanel {
  /**
   * @param {object} opts
   * @param {string} opts.title shop name shown in the header
   * @param {Good[]} opts.goods
   * @param {InstanceType<typeof _W>} opts.wallet
   * @param {InstanceType<typeof _S>} opts.stock
   * @param {(good: Good) => void} [opts.onBuy] called after a successful purchase
   * @param {(good: Good) => void} [opts.onRefuse] called when the wallet can't pay
   */
  constructor({ title, goods, wallet, stock, onBuy, onRefuse }) {
    this.title = title;
    this.goods = goods;
    this.wallet = wallet;
    this.stock = stock;
    this.onBuy = onBuy;
    this.onRefuse = onRefuse;
    this.open = false;
    this.el = document.createElement('div');
    this.el.className = 'wick-shop';
    this.el.style.cssText =
      'position:absolute;right:12px;top:64px;width:min(88vw,300px);z-index:7;' +
      'background:rgba(12,14,22,.96);border:1px solid #3a4157;border-radius:12px;color:#dfe6f2;' +
      'font:13px/1.45 system-ui,sans-serif;padding:12px;box-sizing:border-box;display:none;';
    this._build();
  }

  _build() {
    this.el.innerHTML = '';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;';
    const name = document.createElement('div');
    name.textContent = this.title;
    name.style.cssText = 'font-weight:700;color:#f5c56b;';
    this._coinEl = document.createElement('div');
    this._coinEl.dataset.role = 'coin';
    this._coinEl.style.cssText = 'color:#8fa3c4;font-size:12px;';
    head.appendChild(name);
    head.appendChild(this._coinEl);
    this.el.appendChild(head);
    this._rows = new Map();
    for (const good of this.goods) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);';
      const info = document.createElement('div');
      const nameLine = document.createElement('div');
      nameLine.textContent = good.name;
      const owned = document.createElement('span');
      owned.dataset.role = 'owned';
      owned.style.cssText = 'color:#8fa3c4;font-size:12px;';
      nameLine.appendChild(owned);
      info.appendChild(nameLine);
      if (good.blurb) {
        const blurb = document.createElement('div');
        blurb.textContent = good.blurb;
        blurb.style.cssText = 'color:#8fa3c4;font-size:12px;';
        info.appendChild(blurb);
      }
      const btn = document.createElement('button');
      btn.textContent = `Buy · ${good.price}`;
      btn.dataset.good = good.id;
      btn.style.cssText =
        'border:1px solid #3a4157;background:#1b2130;color:#f5c56b;border-radius:8px;' +
        'font:600 12px system-ui,sans-serif;padding:6px 10px;cursor:pointer;white-space:nowrap;';
      btn.addEventListener('click', () => this.buy(good.id));
      row.appendChild(info);
      row.appendChild(btn);
      this.el.appendChild(row);
      this._rows.set(good.id, { owned, btn });
    }
    const close = document.createElement('button');
    close.textContent = 'Close (E)';
    close.style.cssText =
      'margin-top:10px;width:100%;border:1px solid #3a4157;background:transparent;color:#dfe6f2;' +
      'border-radius:8px;font:600 12px system-ui,sans-serif;padding:7px;cursor:pointer;';
    close.addEventListener('click', () => this.toggle(false));
    this.el.appendChild(close);
    this.refresh();
  }

  /** Re-read wallet/stock and update every number + button state. */
  refresh() {
    if (this._coinEl) this._coinEl.textContent = `Coin: ${this.wallet.coin}`;
    for (const good of this.goods) {
      const row = this._rows.get(good.id);
      if (!row) continue;
      row.owned.textContent = ` · have ${this.stock.count(good.id)}`;
      const afford = this.wallet.canAfford(good.price);
      row.btn.disabled = !afford;
      row.btn.style.opacity = afford ? '1' : '.45';
    }
  }

  /**
   * Buy one unit of a good by id. Moves coin and stock atomically.
   * @returns {boolean} true if the purchase happened
   */
  buy(id) {
    const good = this.goods.find((g) => g.id === id);
    if (!good) return false;
    if (!this.wallet.spend(good.price)) {
      if (this.onRefuse) this.onRefuse(good);
      this.refresh();
      return false;
    }
    this.stock.add(good.id, good.qty ?? 1);
    this.refresh();
    if (this.onBuy) this.onBuy(good);
    return true;
  }

  /** @param {boolean} [force] */
  toggle(force) {
    this.open = force != null ? force : !this.open;
    this.el.style.display = this.open ? 'block' : 'none';
    if (this.open) this.refresh();
    return this.open;
  }
}
