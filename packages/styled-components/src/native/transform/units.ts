/**
 * RN props where a bare CSS number / `Xpx` / `0` / `X%` / `auto` is
 * accepted. These are the properties whose values we want to reduce
 * to plain JS primitives where possible.
 *
 * RN's own DimensionValue is `number | 'auto' | '${number}%' | null`.
 * We never try to emit `'10px'`; RN treats strings-with-units as
 * invalid for dimension props (outside of a few exceptions like
 * `borderRadius` which accepts `"10px"` strings since 0.78).
 */

import * as $ from '../../utils/charCodes';

const UNITLESS_NUMERIC_PROPS = new Set([
  'opacity',
  'flex',
  'flexGrow',
  'flexShrink',
  'zIndex',
  'aspectRatio',
  'fontWeight',
  'elevation',
  'shadowOpacity',
]);

/**
 * Convert a raw post-tokenize string to RN's preferred form for a
 * given property:
 * - unitless numeric props get `Number()`
 * - other numerics get `toDimension()` semantics (strip px, keep %/auto)
 * - unknown → pass through string
 */
const NPX_RE = /^(-?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(?:px)?$/i;

export function coerceRawValue(prop: string, value: string): number | string | null {
  if (UNITLESS_NUMERIC_PROPS.has(prop)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  // Numeric-prefix gate; only run the `N`/`Npx` regex when the value
  // could plausibly match. Saves a regex call per non-numeric value
  // (colors, idents, hex), which dominate real-world inputs.
  const c0 = value.charCodeAt(0);
  if ((c0 >= $.DIGIT_0 && c0 <= $.DIGIT_9) || c0 === $.HYPHEN || c0 === $.DOT || c0 === $.PLUS) {
    const match = NPX_RE.exec(value);
    if (match) return parseFloat(match[1]);
  }
  if (value === 'auto') return 'auto';
  if (value === 'null') return null;
  if (value === 'true') return 1 as unknown as number;
  if (value === 'false') return 0;
  return value;
}
