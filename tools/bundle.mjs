#!/usr/bin/env node
/**
 * Lamplight's zero-dependency bundler.
 *
 * Resolves the small, disciplined subset of ES modules that Lamplight code uses:
 *   import { a, b as c } from './x.js'      named imports
 *   import './x.js'                          side-effect imports
 *   export function/class/const/let NAME     named declaration exports
 *   export { a, b }                          export lists
 *   export { a } from './x.js'               re-exports
 * Default exports and namespace imports are intentionally NOT supported.
 *
 * Each module is wrapped in a CommonJS-style function with its own scope, so
 * module-local names can never collide, and the output is one plain script:
 * no loaders, no network, file:// safe — which is exactly what an itch.io
 * single-file upload needs.
 *
 * Usage:
 *   node tools/bundle.mjs <entry.js> <out> [--html] [--title "Game Title"]
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , entryArg, outArg, ...flags] = process.argv;
if (!entryArg || !outArg) {
  console.error('usage: bundle.mjs <entry.js> <out> [--html] [--title "T"]');
  process.exit(1);
}
const asHtml = flags.includes('--html');
const titleIdx = flags.indexOf('--title');
const title = titleIdx >= 0 ? flags[titleIdx + 1] : 'Lamplight Game';

const root = process.cwd();
const keyOf = (abs) => path.relative(root, abs).split(path.sep).join('/');

/** @type {Map<string, string>} module key -> wrapped source */
const modules = new Map();

function transform(absPath) {
  const key = keyOf(absPath);
  if (modules.has(key)) return key;
  modules.set(key, ''); // placeholder guards cycles
  let src = fs.readFileSync(absPath, 'utf8');
  const dir = path.dirname(absPath);
  const exported = [];
  const prelude = [];

  const resolve = (spec) => {
    if (!spec.startsWith('.')) {
      throw new Error(`${key}: only relative imports are supported (got "${spec}")`);
    }
    return path.resolve(dir, spec);
  };
  const importClause = (clause, spec) => {
    const req = `__require(${JSON.stringify(keyOf(resolve(spec)))})`;
    const names = clause
      .replace(/[{}]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const m = s.match(/^(\w+)\s+as\s+(\w+)$/);
        return m ? `${m[1]}: ${m[2]}` : s;
      });
    return names.length ? `const { ${names.join(', ')} } = ${req};` : `${req};`;
  };

  // Re-exports: export { a, b as c } from './x.js'
  src = src.replace(
    /export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/g,
    (_, clause, spec) => {
      clause
        .replace(/[{}]/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => {
          const m = s.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
          exported.push(m[2] || m[1]);
        });
      return importClause(clause, spec);
    },
  );
  // Named + side-effect imports
  src = src.replace(
    /import\s*(?:\{([^}]*)\}\s*from\s*)?['"]([^'"]+)['"];?/g,
    (_, clause, spec) => importClause(clause || '', spec),
  );
  // Export lists: export { a, b as c };
  src = src.replace(/export\s*\{([^}]*)\};?/g, (_, clause) => {
    clause
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => {
        const m = s.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        exported.push({ local: m[1], name: m[2] || m[1] });
      });
    return '';
  });
  // Declaration exports: export function/class/const/let/var NAME
  src = src.replace(
    /export\s+(async\s+)?(function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    (_, a, kw, name) => {
      exported.push(name);
      return `${a || ''}${kw} ${name}`;
    },
  );
  if (/^\s*export\s+default/m.test(src) || /import\s*\*/.test(src)) {
    throw new Error(`${key}: default exports and namespace imports are not supported by the Lamplight bundler`);
  }

  const assigns = exported
    .map((e) => (typeof e === 'string' ? `__exports.${e} = ${e};` : `__exports.${e.name} = ${e.local};`))
    .join('\n');
  const body = `${prelude.join('\n')}\n${src}\n${assigns}`;
  modules.set(key, body);
  return key;
}

const entryAbs = path.resolve(root, entryArg);
const entryKey = transform(entryAbs);
// Walk: transform() already recursed via placeholder map? No — imports are
// resolved lazily at runtime by __require, so every reachable file must be
// transformed. Do a fixpoint scan over discovered import specs.
(function collect() {
  let grew = true;
  const seen = new Set();
  while (grew) {
    grew = false;
    for (const [key] of [...modules]) {
      if (seen.has(key)) continue;
      seen.add(key);
      const abs = path.resolve(root, key);
      const raw = fs.readFileSync(abs, 'utf8');
      for (const m of raw.matchAll(/(?:from|import)\s*['"](\.[^'"]+)['"]/g)) {
        const depAbs = path.resolve(path.dirname(abs), m[1]);
        const depKey = keyOf(depAbs);
        if (!modules.has(depKey)) {
          transform(depAbs);
          grew = true;
        }
      }
    }
  }
})();

const defs = [...modules.entries()]
  .map(([key, body]) => `__define(${JSON.stringify(key)}, function (__exports, __require) {\n${body}\n});`)
  .join('\n');

const runtime = `'use strict';
const __modules = Object.create(null);
const __cache = Object.create(null);
function __define(p, fn) { __modules[p] = fn; }
function __require(p) {
  if (__cache[p]) return __cache[p].exports;
  if (!__modules[p]) throw new Error('lamplight bundle: module not found: ' + p);
  const m = { exports: {} };
  __cache[p] = m;
  __modules[p](m.exports, __require);
  return m.exports;
}
${defs}
__require(${JSON.stringify(entryKey)});
`;

const outAbs = path.resolve(root, outArg);
fs.mkdirSync(path.dirname(outAbs), { recursive: true });
if (asHtml) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>${title}</title>
<style>
  html, body { margin: 0; padding: 0; background: #10131a; height: 100%; }
  body { display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif; }
  #lamplight-root { position: relative; width: min(100vw, 1280px); }
  canvas { display: block; width: 100%; height: auto; image-rendering: pixelated; background: #000; }
</style>
</head>
<body>
<div id="lamplight-root"></div>
<script>
${runtime}
</script>
</body>
</html>
`;
  fs.writeFileSync(outAbs, html);
} else {
  fs.writeFileSync(outAbs, runtime);
}
console.log(`bundled ${modules.size} module(s) -> ${keyOf(outAbs)} (${fs.statSync(outAbs).size} bytes)`);
