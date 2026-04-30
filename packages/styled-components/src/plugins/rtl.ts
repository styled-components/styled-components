import type { SCPlugin } from '../utils/compiler';

/**
 * Direct prop-name swaps (1:1 mapping). Physical `left`/`right` sides swap
 * positions so LTR-authored CSS renders correctly in RTL locales. Logical
 * properties (`margin-inline-start`, `padding-block-end`) are intentionally
 * NOT swapped; they already flip with writing direction.
 */
const PROP_SWAP: Record<string, string> = {
  left: 'right',
  right: 'left',
  'padding-left': 'padding-right',
  'padding-right': 'padding-left',
  'margin-left': 'margin-right',
  'margin-right': 'margin-left',
  'border-left': 'border-right',
  'border-right': 'border-left',
  'border-left-color': 'border-right-color',
  'border-right-color': 'border-left-color',
  'border-left-style': 'border-right-style',
  'border-right-style': 'border-left-style',
  'border-left-width': 'border-right-width',
  'border-right-width': 'border-left-width',
  'border-top-left-radius': 'border-top-right-radius',
  'border-top-right-radius': 'border-top-left-radius',
  'border-bottom-left-radius': 'border-bottom-right-radius',
  'border-bottom-right-radius': 'border-bottom-left-radius',
  'scroll-margin-left': 'scroll-margin-right',
  'scroll-margin-right': 'scroll-margin-left',
  'scroll-padding-left': 'scroll-padding-right',
  'scroll-padding-right': 'scroll-padding-left',
};

/** Properties whose VALUES may contain `left` / `right` keywords that should flip. */
const DIRECTIONAL_VALUE_PROPS = new Set(['float', 'clear', 'text-align', 'caption-side']);

/** Shorthand properties using the `top right bottom left` 4-value order. */
const FOUR_VALUE_PROPS = new Set([
  'padding',
  'margin',
  'border-color',
  'border-style',
  'border-width',
]);

const LR_RE = /\b(left|right)\b/g;

/** Swap whole-word `left` ↔ `right` occurrences in a single pass. */
function swapDirectionKeyword(value: string): string {
  if (value.indexOf('left') === -1 && value.indexOf('right') === -1) return value;
  return value.replace(LR_RE, m => (m === 'left' ? 'right' : 'left'));
}

/**
 * Tokenize a shorthand value by top-level whitespace, preserving
 * parenthesized groups (`rgb(0, 0, 0)`, `calc(1px + 2px)`, etc).
 */
function tokenizeShorthand(value: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 40 /* ( */) depth++;
    else if (c === 41 /* ) */) depth--;
    else if (depth === 0 && (c === 32 /* space */ || c === 9) /* tab */) {
      if (i > start) tokens.push(value.substring(start, i));
      start = i + 1;
    }
  }
  if (start < value.length) tokens.push(value.substring(start));
  return tokens.filter(t => t.length > 0);
}

/**
 * Swap positions 1 and 3 (right and left) of a 4-value shorthand.
 * Leaves 1/2/3-value forms untouched; they're directionally symmetric.
 */
function swapFourValue(value: string): string {
  const tokens = tokenizeShorthand(value);
  if (tokens.length !== 4) return value;
  return tokens[0] + ' ' + tokens[3] + ' ' + tokens[2] + ' ' + tokens[1];
}

/**
 * Right-to-left layout plugin for `<StyleSheetManager plugins={[rtlPlugin]}>`.
 *
 * Covers the 80% of real RTL needs: physical side property swaps
 * (`padding-left` → `padding-right`), direction keyword values (`float: left`
 * → `float: right`), and 4-value shorthand position swap (`margin: 1 2 3 4`
 * → `margin: 1 4 3 2`). Logical properties (`margin-inline-start` etc) are
 * passed through; they already flip with writing direction.
 *
 * Transforms the author's LTR-authored CSS at emit time. For per-component
 * opt-in, scope a `<StyleSheetManager plugins={[rtlPlugin]}>` around the
 * subtree that needs flipping; the rest of the app keeps LTR output.
 *
 * Replacement for `stylis-plugin-rtl` under v6.
 */
const rtl: SCPlugin = {
  name: 'rtl',
  decl(prop, value) {
    const swappedProp = PROP_SWAP[prop];
    if (swappedProp) return { prop: swappedProp, value };
    if (DIRECTIONAL_VALUE_PROPS.has(prop)) {
      const swapped = swapDirectionKeyword(value);
      if (swapped !== value) return { prop, value: swapped };
    }
    if (FOUR_VALUE_PROPS.has(prop)) {
      const swapped = swapFourValue(value);
      if (swapped !== value) return { prop, value: swapped };
    }
    return undefined;
  },
};

export default rtl;
