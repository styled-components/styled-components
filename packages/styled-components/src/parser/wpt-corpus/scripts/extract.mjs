// @ts-check
/**
 * Extractor for Web Platform Tests (WPT) CSS parsing / computed-value
 * assertions. Walks the vendored WPT test files under
 * `wpt-corpus/raw/` and emits a flat JSON corpus that our jest
 * parity tests consume.
 *
 * Each WPT `<script>` body runs inside Node's `vm` module with stubbed
 * test helpers (`test_computed_value`, etc.) and DOM stand-ins
 * (`document`, `getComputedStyle`, …) that swallow side-effects. The
 * stubs push to a collector. Because we let JS execute the script,
 * template literals (`color(${colorSpace} ...)`) and `for (const x of
 * [...])` loops expand naturally; yielding the real assertions, not
 * literal `${...}` placeholders.
 *
 * For each assertion we emit:
 *   { source, kind, property, value, expected?, description? }
 *
 * SPDX-License-Identifier: BSD-3-Clause
 * Vendored fixtures are licensed under BSD-3-Clause / W3C Test Suite License.
 * See ../LICENSE.md for details.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_ROOT = join(__dirname, '..', 'raw');
const OUT_FILE = join(__dirname, '..', 'corpus.json');

/** @typedef {{ source: string; kind: 'valid'|'invalid'|'computed'; property: string; value: string; expected?: string; description?: string }} Assertion */

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * Extract the inline `<script>` bodies from an HTML file. WPT tests
 * embed assertions in raw `<script>` blocks; we grab every block and
 * concatenate.
 */
function getInlineScripts(html) {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out.join('\n');
}

/**
 * Run a WPT script inside a sandbox and harvest `(property, value, expected)`
 * triples by side-effect. WPT helpers push to a collector; DOM, timers,
 * and assertion primitives are stubbed.
 *
 * @param {string} script
 * @param {string} source
 * @returns {Assertion[]}
 */
function extractFromScript(script, source) {
  /** @type {Assertion[]} */
  const collected = [];

  function pushAssertion(kind, property, value, expected, description) {
    if (typeof value !== 'string') return;
    if (typeof property !== 'string' || !property) return;
    // Drop unresolved template-literal placeholders. They indicate a
    // failed expansion (e.g. sandbox threw mid-loop); cleaner to omit
    // than to ship junk.
    if (value.includes('${')) return;
    if (typeof expected === 'string' && expected.includes('${')) return;
    /** @type {Assertion} */
    const rec = { source, kind, property, value };
    if (kind !== 'invalid') {
      rec.expected = typeof expected === 'string' ? expected : value;
    }
    if (typeof description === 'string' && description.length > 0) {
      rec.description = description;
    }
    collected.push(rec);
  }

  // Chainable Proxy used for `document`, `window`, return values from
  // `getComputedStyle`, etc. Any get / set / call / construct returns the
  // same proxy; covers `document.getElementById('x').style.width = '10px'`
  // and friends without modeling them.
  const dom = (() => {
    const handler = {
      get(_t, key) {
        if (key === Symbol.toPrimitive) return () => '';
        if (key === Symbol.iterator) return undefined;
        if (key === 'then') return undefined;
        if (key === 'length') return 0;
        return proxy;
      },
      set() {
        return true;
      },
      apply() {
        return proxy;
      },
      construct() {
        return proxy;
      },
      has() {
        return true;
      },
    };
    /** @type {any} */
    const proxy = new Proxy(function () {}, handler);
    return proxy;
  })();

  const testharness = {
    done() {},
    step(f) {
      if (typeof f === 'function') f();
    },
    step_func(f) {
      return f;
    },
    step_func_done(f) {
      return f;
    },
    add_cleanup() {},
  };

  const sandbox = {
    // ── Primary WPT test helpers ─────────────────────────────────────
    test_computed_value(property, value, expected, description) {
      pushAssertion('computed', property, value, expected, description);
    },
    test_valid_value(property, value, expected, description) {
      pushAssertion('valid', property, value, expected, description);
    },
    test_invalid_value(property, value, description) {
      pushAssertion('invalid', property, value, undefined, description);
    },
    fuzzy_test_computed_color(value, expected, description) {
      pushAssertion('computed', 'color', value, expected, description);
    },
    // css-values helpers
    test_invalid_length(property, value, description) {
      pushAssertion('invalid', property, value, undefined, description);
    },
    test_length_equals(property, value, expected, description) {
      pushAssertion('computed', property, value, expected, description);
    },
    test_math_used(value, expected, options) {
      // `test_math_used(value, expected, { type })` ultimately compares
      // computed-value output of a math function on a property of the
      // given type. We map type→a representative property so the
      // assertion lands in the right bucket; unknown types default to
      // `width` which is the most common.
      let prop = 'width';
      if (options && typeof options === 'object' && typeof options.type === 'string') {
        const t = options.type;
        if (t === 'integer' || t === 'number') prop = 'z-index';
        else if (t === 'length') prop = 'width';
        else if (t === 'length-percentage') prop = 'width';
        else if (t === 'percentage') prop = 'width';
        else if (t === 'angle') prop = 'transform';
        else if (t === 'time') prop = 'transition-duration';
        else if (t === 'flex') prop = 'flex-grow';
        else if (t === 'resolution') prop = 'image-resolution';
        else prop = t;
      }
      pushAssertion('computed', prop, value, expected, '');
    },
    // Rule-level tests (e.g. css-cascade `@layer`); currently not modeled
    // in the corpus since the parser sees declarations, not at-rules.
    test_valid_rule() {},
    test_invalid_rule() {},

    // Test framework primitives.
    test(fn) {
      try {
        if (typeof fn === 'function') fn(testharness);
      } catch {
        /* assertion failed inside body; ignore */
      }
    },
    promise_test(fn) {
      try {
        if (typeof fn === 'function') {
          const r = fn(testharness);
          if (r && typeof r.then === 'function')
            r.then(
              () => {},
              () => {}
            );
        }
      } catch {
        /* ignore */
      }
    },
    async_test(fn) {
      try {
        if (typeof fn === 'function') fn(testharness);
      } catch {
        /* ignore */
      }
    },
    setup() {},

    // Assertions: all no-ops; we don't replay browser semantics.
    assert_equals() {},
    assert_not_equals() {},
    assert_true() {},
    assert_false() {},
    assert_throws_js() {},
    assert_throws_dom() {},
    assert_in_array() {},
    assert_array_equals() {},
    assert_approx_equals() {},
    assert_unreached() {},

    // Higher-level WPT helpers that don't translate cleanly. Stub to swallow.
    test_specific() {},
    test_system_font() {},
    test_various() {},
    testComputedValueGreaterOrLowerThan() {},
    testTransformValuesCloseTo() {},

    // DOM stand-ins.
    document: dom,
    window: dom,
    self: dom,
    getComputedStyle: () => dom,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    CSS: {
      supports: () => false,
      escape: s => s,
      registerProperty: () => {},
    },
    console,
    Math,
    Number,
    String,
    JSON,
    Array,
    Object,
    Symbol,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    NaN,
    Infinity,
  };

  vm.createContext(sandbox);

  // Wrap in try/catch at the top level so a partial run still keeps
  // assertions collected before any failure.
  const wrapped = `try {\n${script}\n} catch (e) { /* swallow */ }`;

  try {
    vm.runInContext(wrapped, sandbox, { timeout: 30_000, displayErrors: false });
  } catch {
    /* timeout / parse error; keep what we have */
  }

  return collected;
}

function main() {
  const files = walk(RAW_ROOT).sort();
  /** @type {Assertion[]} */
  const all = [];
  for (const file of files) {
    const relPath = relative(RAW_ROOT, file);
    const html = readFileSync(file, 'utf8');
    const script = getInlineScripts(html);
    const extracted = extractFromScript(script, relPath);
    all.push(...extracted);
  }
  writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  const byKind = all.reduce((acc, a) => ((acc[a.kind] = (acc[a.kind] ?? 0) + 1), acc), {});
  const byProp = all.reduce((acc, a) => ((acc[a.property] = (acc[a.property] ?? 0) + 1), acc), {});
  console.log(`Extracted ${all.length} assertions from ${files.length} WPT files`);
  console.log(`  by kind:`, byKind);
  console.log(
    `  top properties:`,
    Object.entries(byProp)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  );
}

main();
