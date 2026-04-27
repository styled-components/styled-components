// @ts-check
/**
 * Extractor for Web Platform Tests (WPT) CSS parsing / computed-value
 * assertions. Walks the vendored WPT test files under
 * `wpt-corpus/raw/` and emits a flat JSON corpus that our jest
 * parity tests consume.
 *
 * Two WPT call patterns are recognised:
 *
 *   1. Direct:  `test_<kind>_value("property", "value"[, "expected"])`
 *      where <kind> is `valid` / `invalid` / `computed`.
 *
 *   2. Loop form used by most color tests:
 *        tests = [[value1, expected1], [value2, expected2], …];
 *        for (const t of tests) test_computed_value("property", t[0], t[1]);
 *
 * For each assertion we emit:
 *   { source, kind, property, value, expected?, description? }
 *
 * Kept deliberately heuristic — these are source-level regexes, not a
 * full JS parser. WPT tests overwhelmingly use the straightforward
 * patterns above; anything exotic is skipped and the rest continues.
 * The corpus is regenerated in CI whenever we bump the WPT commit pin.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 * Vendored fixtures are licensed under BSD-3-Clause / W3C Test Suite License.
 * See ../LICENSE.md for details.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * concatenate. This also means our regexes don't need to worry about
 * HTML-escaping — the scripts run as-is.
 */
function getInlineScripts(html) {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out.join('\n');
}

const DIRECT_RE =
  /test_(valid|invalid|computed)_value\s*\(\s*(['"`])((?:\\\2|(?!\2).)*?)\2\s*(?:,\s*(['"`])((?:\\\4|(?!\4).)*?)\4)?\s*(?:,\s*(['"`])((?:\\\6|(?!\6).)*?)\6)?\s*(?:,\s*(['"`])((?:\\\8|(?!\8).)*?)\8)?\s*\)/g;

/**
 * `fuzzy_test_computed_color("<input>", "<expected>")` — color-specific
 * helper in css-color tests. Input is always the COLOR value; implied
 * property is `color`.
 */
const FUZZY_COLOR_RE =
  /fuzzy_test_computed_color\s*\(\s*(['"`])((?:\\\1|(?!\1).)*?)\1\s*,\s*(['"`])((?:\\\3|(?!\3).)*?)\3\s*\)/g;

/**
 * Loop form:
 *   tests = [[value, expected[, description]], …];
 *   for (...) test_<kind>_value("property", test[0], test[1], ...);
 * We match the assignment + the property name from the loop body.
 */
const TESTS_ARRAY_RE =
  /(?:^|\s)tests\s*=\s*(\[[\s\S]*?\])\s*;\s*(?:[\s\S]*?)for\s*\([^)]*\)\s*\{?\s*test_(valid|invalid|computed)_value\s*\(\s*(['"])((?:\\\3|(?!\3).)*?)\3/g;

function unquote(s) {
  return s
    .replace(/\\(['"])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
}

/**
 * Parse a JS array literal of 2-3 element string tuples. We don't run
 * `eval`; we walk the string tracking bracket depth + quotes so nested
 * commas / brackets inside strings don't confuse us.
 */
function parseTupleArray(src) {
  const trimmed = src.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
  const body = trimmed.slice(1, -1);
  /** @type {string[][]} */
  const rows = [];
  let i = 0;
  while (i < body.length) {
    // Skip whitespace + commas + comments
    while (
      i < body.length &&
      (/[\s,]/.test(body[i]) || body.startsWith('//', i) || body.startsWith('/*', i))
    ) {
      if (body.startsWith('//', i)) {
        const eol = body.indexOf('\n', i);
        i = eol === -1 ? body.length : eol + 1;
      } else if (body.startsWith('/*', i)) {
        const close = body.indexOf('*/', i + 2);
        i = close === -1 ? body.length : close + 2;
      } else {
        i++;
      }
    }
    if (i >= body.length) break;
    if (body[i] !== '[') return null;
    // Parse one tuple
    let depth = 1;
    let j = i + 1;
    /** @type {string[]} */
    const elems = [];
    let cur = '';
    let inStr = null; // quote char
    let esc = false;
    while (j < body.length && depth > 0) {
      const c = body[j];
      if (inStr) {
        if (esc) {
          cur += c;
          esc = false;
        } else if (c === '\\') {
          cur += c;
          esc = true;
        } else if (c === inStr) {
          cur += c;
          inStr = null;
        } else {
          cur += c;
        }
      } else {
        if (c === '"' || c === "'") {
          inStr = c;
          cur += c;
        } else if (c === '[') {
          depth++;
          cur += c;
        } else if (c === ']') {
          depth--;
          if (depth === 0) {
            if (cur.trim()) elems.push(cur.trim());
            break;
          }
          cur += c;
        } else if (c === ',' && depth === 1) {
          if (cur.trim()) elems.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      j++;
    }
    rows.push(elems);
    i = j + 1;
  }
  return rows;
}

function stripStringLiteral(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return unquote(t.slice(1, -1));
  }
  return null;
}

function extractFromScript(script, source) {
  /** @type {Assertion[]} */
  const out = [];

  // Pattern 1 — direct calls. Third quoted arg = expected, fourth = description.
  DIRECT_RE.lastIndex = 0;
  let m;
  while ((m = DIRECT_RE.exec(script)) !== null) {
    const kind = /** @type {'valid'|'invalid'|'computed'} */ (m[1]);
    const property = m[3];
    const value = m[5] ?? '';
    const expected = m[7];
    const description = m[9];
    if (!property) continue;
    if (kind === 'invalid') {
      out.push({ source, kind, property, value });
    } else if (kind === 'computed' || kind === 'valid') {
      const rec = { source, kind, property, value, expected: expected ?? value };
      if (description) rec.description = description;
      out.push(rec);
    }
  }

  // Pattern 1b — `fuzzy_test_computed_color("<input>", "<expected>")`.
  // Implied property is `color`.
  FUZZY_COLOR_RE.lastIndex = 0;
  while ((m = FUZZY_COLOR_RE.exec(script)) !== null) {
    out.push({
      source,
      kind: 'computed',
      property: 'color',
      value: m[2],
      expected: m[4],
    });
  }

  // Pattern 2 — `tests = [...]; for (...) test_<kind>_value("prop", ...)`.
  TESTS_ARRAY_RE.lastIndex = 0;
  while ((m = TESTS_ARRAY_RE.exec(script)) !== null) {
    const arraySrc = m[1];
    const kind = /** @type {'valid'|'invalid'|'computed'} */ (m[2]);
    const property = m[4];
    const rows = parseTupleArray(arraySrc);
    if (!rows) continue;
    for (const row of rows) {
      const value = row[0] !== undefined ? stripStringLiteral(row[0]) : null;
      if (value === null) continue;
      const expected = row[1] !== undefined ? stripStringLiteral(row[1]) : null;
      const description = row[2] !== undefined ? stripStringLiteral(row[2]) : null;
      if (kind === 'invalid') {
        out.push({ source, kind, property, value });
      } else {
        const rec = {
          source,
          kind,
          property,
          value,
          expected: expected ?? value,
        };
        if (description) rec.description = description;
        out.push(rec);
      }
    }
  }

  return out;
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
