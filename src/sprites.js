/**
 * @module sprites
 * Procedural pixel sprites, Pico-8 style: a sprite is an array of strings,
 * one character per pixel, mapped through a palette to colours. '.' (or a
 * character missing from the palette) is transparent.
 *
 * All three shipped games drew their creatures and props this way because it
 * needs no asset pipeline: the art lives in the source, diffs cleanly, and
 * ships inside the single file. Image-sheet support lives in renderer.Sheet.
 */

const cache = new Map();

/**
 * Build (or fetch from cache) an offscreen canvas for a string-map sprite.
 *
 * @param {string[]} rows e.g. ["..kk..", ".koop."] — one character per pixel.
 * @param {Object<string, string>} palette char -> CSS colour
 * @returns {HTMLCanvasElement}
 */
export function makeSprite(rows, palette) {
  const key = rows.join('\n') + '|' + JSON.stringify(palette);
  if (cache.has(key)) return cache.get(key);
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const colour = palette[row[x]];
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

/**
 * Draw a string-map sprite with a renderer's context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} rows @param {Object<string,string>} palette
 * @param {number} x @param {number} y
 * @param {{ scale?: number, flipX?: boolean }} [opts]
 */
export function drawSprite(ctx, rows, palette, x, y, { scale = 3, flipX = false } = {}) {
  const img = makeSprite(rows, palette);
  ctx.save();
  if (flipX) {
    ctx.translate(Math.round(x) + img.width * scale, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
  } else {
    ctx.drawImage(img, Math.round(x), Math.round(y), img.width * scale, img.height * scale);
  }
  ctx.restore();
}

/**
 * Pixel dimensions of a string-map sprite at a scale.
 * @param {string[]} rows @param {number} [scale]
 * @returns {{ w: number, h: number }}
 */
export function spriteSize(rows, scale = 3) {
  return { w: Math.max(...rows.map((r) => r.length)) * scale, h: rows.length * scale };
}

/** Empty the sprite cache (e.g. after a palette/theme swap). */
export function clearSpriteCache() { cache.clear(); }
