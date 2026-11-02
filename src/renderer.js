/**
 * @module renderer
 * Canvas 2D rendering tuned for pixel art: smoothing off by default, sprite
 * sheets with frame animation, a simple camera, and z-ordered drawing.
 *
 * Every shipped Porch Light web game is a single canvas with crisp pixels —
 * this module is that canvas, codified.
 */

/**
 * A sprite sheet: one image cut into a grid of equal frames.
 */
export class Sheet {
  /**
   * @param {CanvasImageSource} image
   * @param {number} frameW frame width in source pixels
   * @param {number} frameH frame height in source pixels
   */
  constructor(image, frameW, frameH) {
    this.image = image;
    this.frameW = frameW;
    this.frameH = frameH;
    this.cols = Math.floor(image.width / frameW);
  }
  /** Number of frames in the sheet. */
  get frames() { return this.cols * Math.floor(this.image.height / this.frameH); }
}

/**
 * Frame animation over a Sheet: a named or indexed sequence at a rate.
 */
export class Animation {
  /**
   * @param {Sheet} sheet
   * @param {number[]} frames frame indices to cycle
   * @param {number} [fps] frames per second
   */
  constructor(sheet, frames, fps = 8) {
    this.sheet = sheet;
    this.frames = frames;
    this.fps = fps;
    this.t = 0;
  }
  update(dt) { this.t += dt; }
  /** Current frame index into the sheet. */
  get frame() {
    const i = Math.floor(this.t * this.fps) % this.frames.length;
    return this.frames[i];
  }
  reset() { this.t = 0; }
}

/**
 * The renderer. Owns the 2D context, the camera, and a per-frame draw list
 * so games can submit sprites in any order and have them sorted by z.
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ pixelPerfect?: boolean }} [opts] pixelPerfect (default true) disables smoothing.
   */
  constructor(canvas, { pixelPerfect = true } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pixelPerfect = pixelPerfect;
    /** Camera offset in world units. */
    this.camera = { x: 0, y: 0 };
    /** @type {Array<{z: number, fn: (ctx: CanvasRenderingContext2D) => void}>} */
    this._queue = [];
    this._applySmoothing();
  }
  _applySmoothing() { this.ctx.imageSmoothingEnabled = !this.pixelPerfect; }
  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }

  /** Clear the frame with a colour. */
  clear(color = '#000') {
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  /**
   * Queue a draw call at layer z (lower draws first). Flushed by endFrame().
   * Inside fn, coordinates are world coordinates (camera applied).
   * @param {number} z
   * @param {(ctx: CanvasRenderingContext2D) => void} fn
   */
  draw(z, fn) { this._queue.push({ z, fn }); }

  /** Draw immediately in screen space (no camera) — for weather overlays, vignettes. */
  drawScreen(fn) {
    const { ctx } = this;
    ctx.save();
    fn(ctx);
    ctx.restore();
  }

  /** Flush the queued draw list with the camera applied. */
  endFrame() {
    const { ctx } = this;
    this._queue.sort((a, b) => a.z - b.z);
    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
    for (const item of this._queue) item.fn(ctx);
    ctx.restore();
    this._queue.length = 0;
    this._applySmoothing();
  }

  /**
   * Draw one frame of a sheet at a world position.
   * @param {Sheet} sheet @param {number} frame @param {number} x @param {number} y
   * @param {{ scale?: number, flipX?: boolean, alpha?: number }} [opts]
   */
  blit(sheet, frame, x, y, { scale = 1, flipX = false, alpha = 1 } = {}) {
    const { ctx } = this;
    const sx = (frame % sheet.cols) * sheet.frameW;
    const sy = Math.floor(frame / sheet.cols) * sheet.frameH;
    const dw = sheet.frameW * scale;
    const dh = sheet.frameH * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (flipX) {
      ctx.translate(Math.round(x) + dw, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(sheet.image, sx, sy, sheet.frameW, sheet.frameH, 0, 0, dw, dh);
    } else {
      ctx.drawImage(sheet.image, sx, sy, sheet.frameW, sheet.frameH, Math.round(x), Math.round(y), dw, dh);
    }
    ctx.restore();
  }

  /** Centre the camera on a world point, clamped to optional bounds. */
  follow(x, y, bounds) {
    let cx = x - this.canvas.width / 2;
    let cy = y - this.canvas.height / 2;
    if (bounds) {
      cx = Math.max(0, Math.min(cx, Math.max(0, bounds.w - this.canvas.width)));
      cy = Math.max(0, Math.min(cy, Math.max(0, bounds.h - this.canvas.height)));
    }
    this.camera.x = cx;
    this.camera.y = cy;
  }
}
