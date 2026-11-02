/**
 * @module input
 * Keyboard + touch input, unified: games read named actions ("left",
 * "interact") and never care which device produced them. Touch buttons are
 * real DOM buttons that press the same virtual keys, so one code path serves
 * desktop and phone — the pattern all three shipped games used.
 *
 * Also home to the Channel: hold-to-work. The Lighthouse's chores (fill,
 * clean, cook, climb) are holds, not taps: press, keep holding while a
 * progress bar fills, release to cancel.
 */

export const DEFAULT_BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  interact: ['KeyE', 'Space'],
  pause: ['KeyP', 'Escape'],
};

export class Input {
  /**
   * @param {object} [opts]
   * @param {Object<string, string[]>} [opts.bindings] action -> KeyboardEvent.code list
   * @param {HTMLElement} [opts.target] element to listen on (default window)
   */
  constructor({ bindings = DEFAULT_BINDINGS, target = window } = {}) {
    this.bindings = bindings;
    this._down = new Set(); // physical codes currently down
    this._virtual = new Set(); // action names pressed via touch buttons
    this._pressed = new Set(); // actions that went down this frame
    this._target = target;
    this._onKeyDown = (ev) => {
      if (this._isBound(ev.code)) {
        if (!ev.repeat) {
          for (const [action, codes] of Object.entries(this.bindings)) {
            if (codes.includes(ev.code) && !this.held(action)) this._pressed.add(action);
          }
        }
        this._down.add(ev.code);
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(ev.code)) ev.preventDefault();
      }
    };
    this._onKeyUp = (ev) => { this._down.delete(ev.code); };
    this._onBlur = () => { this._down.clear(); this._virtual.clear(); };
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }
  _isBound(code) {
    return Object.values(this.bindings).some((codes) => codes.includes(code));
  }
  /** Is the action held right now (keyboard or touch)? */
  held(action) {
    if (this._virtual.has(action)) return true;
    const codes = this.bindings[action] || [];
    return codes.some((c) => this._down.has(c));
  }
  /** Did the action go down since the last endFrame()? Edge trigger. */
  pressed(action) { return this._pressed.has(action); }
  /** Horizontal axis: -1, 0 or 1. */
  get x() { return (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0); }
  /** Vertical axis: -1, 0 or 1. */
  get y() { return (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0); }
  /** Press/release a virtual action (used by touch buttons). */
  setVirtual(action, down) {
    if (down && !this.held(action)) this._pressed.add(action);
    if (down) this._virtual.add(action); else this._virtual.delete(action);
  }
  /** Call once per frame after game logic has consumed edge triggers. */
  endFrame() { this._pressed.clear(); }
  destroy() {
    this._target.removeEventListener('keydown', this._onKeyDown);
    this._target.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}

/**
 * Build a row of on-screen touch buttons bound to an Input's actions.
 * Buttons fire on pointerdown/up, so holds work exactly like held keys.
 * @param {Input} input
 * @param {Array<{ action: string, label: string }>} defs
 * @returns {HTMLElement}
 */
export function touchButtons(input, defs) {
  const bar = document.createElement('div');
  bar.className = 'lamplight-touch';
  bar.style.cssText =
    'display:flex;gap:8px;justify-content:space-between;padding:8px;box-sizing:border-box;' +
    'pointer-events:none;';
  const mk = ({ action, label }) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.action = action;
    b.style.cssText =
      'pointer-events:auto;min-width:52px;min-height:52px;border-radius:12px;border:1px solid #3a4157;' +
      'background:rgba(20,24,36,.85);color:#dfe6f2;font:600 15px system-ui,sans-serif;touch-action:none;' +
      'user-select:none;-webkit-user-select:none;';
    const on = (ev) => { ev.preventDefault(); input.setVirtual(action, true); };
    const off = (ev) => { ev.preventDefault(); input.setVirtual(action, false); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('pointercancel', off);
    return b;
  };
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;gap:8px;';
  const right = document.createElement('div');
  right.style.cssText = 'display:flex;gap:8px;';
  defs.forEach((d, i) => (i < defs.length - 1 ? left : right).appendChild(mk(d)));
  bar.appendChild(left);
  bar.appendChild(right);
  return bar;
}

/**
 * A hold-to-work channel: while `activeWhen()` is true, progress fills over
 * `duration` seconds; completing fires onComplete once; letting go resets.
 * Render the bar wherever you like from `progress` (0..1) — see ui.gauge.
 */
export class Channel {
  /**
   * @param {object} opts
   * @param {number} opts.duration seconds of holding required
   * @param {() => void} opts.onComplete
   * @param {() => void} [opts.onStart]
   */
  constructor({ duration, onComplete, onStart }) {
    this.duration = duration;
    this.onComplete = onComplete;
    this.onStart = onStart;
    this.progress = 0;
    this.active = false;
  }
  /**
   * @param {number} dt
   * @param {boolean} holding whether the interact control is held AND conditions are met
   */
  update(dt, holding) {
    if (holding) {
      if (!this.active) { this.active = true; if (this.onStart) this.onStart(); }
      this.progress += dt / this.duration;
      if (this.progress >= 1) {
        this.progress = 0;
        this.active = false;
        this.onComplete();
      }
    } else if (this.active || this.progress > 0) {
      this.active = false;
      this.progress = 0;
    }
  }
  get working() { return this.active; }
}
