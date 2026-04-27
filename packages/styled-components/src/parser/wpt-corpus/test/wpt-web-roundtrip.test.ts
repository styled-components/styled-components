/**
 * WPT parity — web parser + emitter roundtrip.
 *
 * For each WPT `valid` / `computed` assertion we care about on the web
 * side, verify that parsing `${property}: ${value};` and emitting back
 * to CSS preserves the value's semantic content. The browser is
 * responsible for computing the final resolved value (our emit goes to
 * CSSOM); we just need to not mangle the string.
 *
 * `invalid` tests are handled differently — browsers compute an empty
 * value for invalid declarations; we don't reject at parse time (users
 * sometimes author invalid CSS that targets a future / polyfilled
 * feature). We verify only that the parser doesn't throw.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import corpus from '../corpus.json';
import { parse } from '../../parser';
import { emitWeb } from '../../emit-web';
import { preprocessCSS } from '../../../utils/cssCompile';

interface Assertion {
  source: string;
  kind: 'valid' | 'invalid' | 'computed';
  property: string;
  value: string;
  expected?: string;
  description?: string;
}

const assertions = corpus as Assertion[];

/**
 * Compare with whitespace collapsed — our parser may normalise
 * intra-value whitespace differently from source, but the token content
 * should be preserved.
 */
function normalizeWhitespace(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function emit(css: string): string {
  const ast = parse(preprocessCSS(css));
  return emitWeb(ast, '.t').join('');
}

describe('WPT parity — web parser roundtrip', () => {
  const kinds = { valid: 0, computed: 0, invalid: 0 };
  let mangled = 0;
  let unparseable = 0;
  const mismatches: Array<{ source: string; property: string; value: string; emitted: string }> =
    [];

  for (const a of assertions) {
    kinds[a.kind]++;
  }

  it('corpus has enough coverage to be meaningful', () => {
    expect(assertions.length).toBeGreaterThan(1000);
  });

  // Deep scan: sample a subset of each kind, assert the parser accepts
  // the declaration and the emitter preserves the raw value.
  it('parser accepts every WPT valid/computed declaration without throwing', () => {
    for (const a of assertions) {
      if (a.kind === 'invalid') continue;
      const css = `${a.property}: ${a.value};`;
      try {
        emit(css);
      } catch (err) {
        unparseable++;
        if (unparseable <= 5) {
          console.warn(`[wpt] parse threw: ${css} — ${(err as Error).message}`);
        }
      }
    }
    expect(unparseable).toBe(0);
  });

  it('emit preserves the input value for WPT valid/computed declarations', () => {
    for (const a of assertions) {
      if (a.kind === 'invalid') continue;
      const css = `${a.property}: ${a.value};`;
      let out: string;
      try {
        out = emit(css);
      } catch {
        continue; // counted above
      }
      const expectedValue = normalizeWhitespace(a.value);
      const actualOut = normalizeWhitespace(out);
      // Loose containment: the raw value tokens must appear in the
      // emitted output (modulo whitespace / case). Allows the emitter
      // to normalise around the edges.
      if (!actualOut.includes(expectedValue)) {
        // Many computed tests have `expected !== value` (e.g.
        // `hwb(120 30% 50%)` → `rgb(77, 128, 77)`). Our output mirrors
        // the INPUT, not the browser-computed form, so those are
        // expected to differ from `expected` but should still match
        // `value`. Count true mangles only.
        mangled++;
        if (mismatches.length < 10) {
          mismatches.push({ source: a.source, property: a.property, value: a.value, emitted: out });
        }
      }
    }

    if (mangled > 0) {
      console.warn(
        `[wpt] ${mangled}/${assertions.length} values mangled during roundtrip. First 10:`,
        mismatches
      );
    }
    // Budget: allow a handful of genuinely exotic values to differ
    // (e.g. calc() with sign()/cqw that we serialise differently).
    // Tighten as we find + fix specific cases.
    expect(mangled).toBeLessThan(assertions.length * 0.05);
  });

  it('parser accepts (does not throw on) WPT invalid-value declarations', () => {
    // Web semantics: invalid values compute to empty and the property
    // is unset. We don't enforce validity at parse time — browsers do.
    // What matters is the parser doesn't throw on garbage input.
    let threw = 0;
    for (const a of assertions) {
      if (a.kind !== 'invalid') continue;
      const css = `${a.property}: ${a.value};`;
      try {
        emit(css);
      } catch {
        threw++;
      }
    }
    expect(threw).toBe(0);
  });

  it('reports coverage by WPT test kind', () => {
    // Visible in CI output; not a strict assertion.
    console.log(`[wpt] corpus kinds:`, kinds);
    expect(kinds.computed + kinds.valid + kinds.invalid).toBe(assertions.length);
  });
});
