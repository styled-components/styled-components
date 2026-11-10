import { KNOWN_PSEUDOS } from '../native/pseudoBits';
import {
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  CLOSE_PAREN,
  COLON,
  COMMA,
  CR,
  DIGIT_0,
  DIGIT_9,
  DOT,
  DOUBLE_QUOTE,
  FF,
  followsUrl,
  GT,
  HYPHEN,
  isIdentChar,
  isSpace,
  LF,
  LOWER_E,
  OPEN_BRACE,
  OPEN_BRACKET,
  OPEN_PAREN,
  PERCENT,
  PLUS,
  SINGLE_QUOTE,
  TILDE,
  urlTokenEnd,
} from './charCodes';
import type { DeclTransform } from './compiler';

/** Scratch for `matchVarUnit`: name, fallback and unit as start and end index pairs. */
const VAR_PARTS = [0, 0, 0, 0, 0, 0];

const KNOWN_UNITS = /* @__PURE__ */ new Set([
  'px',
  'em',
  'rem',
  'lh',
  'rlh',
  'ch',
  'cap',
  'ex',
  'ic',
  'rch',
  'rcap',
  'rex',
  'ric',
  '%',
  'vh',
  'vw',
  'vi',
  'vb',
  'vmin',
  'vmax',
  'svh',
  'svw',
  'svi',
  'svb',
  'svmin',
  'svmax',
  'lvh',
  'lvw',
  'lvi',
  'lvb',
  'lvmin',
  'lvmax',
  'dvh',
  'dvw',
  'dvi',
  'dvb',
  'dvmin',
  'dvmax',
  'cqh',
  'cqw',
  'cqmin',
  'cqmax',
  'cqi',
  'cqb',
  'in',
  'cm',
  'mm',
  'q',
  'pt',
  'pc',
  'fr',
  'deg',
  'rad',
  'grad',
  'turn',
  's',
  'ms',
]);

const HOLDS_VAR_RE = /var\(/i;

/** Every `var(` in a value, in any case; `lastIndex` is set before each read. */
const VAR_CALL_RE = /var\(/gi;

/**
 * Index of the next `var(` in any case at or after `from`, or -1. The regex beats an
 * `indexOf('(')` walk with a letter check on values holding no `var(` (microbenchmarked).
 */
function nextVarCall(value: string, from: number): number {
  VAR_CALL_RE.lastIndex = from;
  return VAR_CALL_RE.test(value) ? VAR_CALL_RE.lastIndex - 4 : -1;
}

/**
 * The `align-content` value that makes a block container place its content as CSS lays out a
 * table cell with the authored `vertical-align`: `top`, `middle` and `bottom` map to `start`,
 * `center` and `end`, and every other value to `normal`, so a later declaration on the same
 * element undoes an earlier mapping. A trailing `!important` carries over. Returns `undefined`
 * for any other property, for `inherit`, and for a value holding `var(`, which are unknown here.
 * It reads the authored pair, so a plugin's rewrite of `vertical-align` is not seen, and a caller
 * adds the result only when the authored declaration survives the plugin seam.
 */
export function alignContentFor(prop: string, value: string): string | undefined {
  if (prop.length !== 14 || !spellsAt(prop, 0, 'vertical-align')) return undefined;

  let end = value.length;
  while (end > 0 && isSpace(value.charCodeAt(end - 1))) end--;

  let important = false;
  if (end > 9 && spellsAt(value, end - 9, 'important')) {
    let bang = end - 9;
    while (bang > 0 && isSpace(value.charCodeAt(bang - 1))) bang--;

    if (bang > 0 && value.charAt(bang - 1) === '!') {
      important = true;
      end = bang - 1;
      while (end > 0 && isSpace(value.charCodeAt(end - 1))) end--;
    }
  }

  const start = skipSpace(value, 0);
  const length = end - start;
  const isInherit = length === 7 && spellsAt(value, start, 'inherit');
  if (isInherit || HOLDS_VAR_RE.test(value)) return undefined;

  const mapped =
    length === 3 && spellsAt(value, start, 'top')
      ? 'start'
      : length === 6 && spellsAt(value, start, 'middle')
        ? 'center'
        : length === 6 && spellsAt(value, start, 'bottom')
          ? 'end'
          : 'normal';
  return important ? mapped + ' !important' : mapped;
}

/** react-native-web sets `aria-disabled` on a disabled primitive and leaves the `disabled` attribute to form controls. */
const DISABLED_ANY = ':is(:disabled,[aria-disabled=true])';

/** The inner `:is()` makes `:enabled` read as `:not(:disabled)` does, so both weigh and wrap alike. */
const ENABLED_ANY = ':not(:is(:disabled,[aria-disabled=true]))';

const DISABLED_OR_ENABLED_RE = /:(?:dis|en)abled/i;

const MAY_HOLD_NOT_RE = /:not\(/i;

/** Deepest paren and bracket nesting the `:where()` wrap reads; a head nesting deeper is left whole. */
const MAX_BLOCK_DEPTH = 30;

/** A text that can hold a url token: one spelling `url(`, or one with an escape that may spell it. */
const MAY_HOLD_URL_RE = /url\(|\\/i;

const MAY_HOLD_STRING_RE = /url\(|[\\"']/i;

const NO_SPANS: readonly number[] = [];

/** Index of the last character a string opened before `from` reads; a raw newline ends it. */
function stringEnd(text: string, from: number, len: number, quote: number): number {
  let i = from;
  while (i < len) {
    const code = text.charCodeAt(i);
    if (code === quote) return i;
    if (code === LF || code === CR || code === FF) return i - 1;
    i += code === BACKSLASH ? 2 : 1;
  }
  return len;
}

/**
 * Start and end (exclusive) pairs of every url token in `text`: an unquoted url through its
 * first `)`, a quoted one through the `)` after its string. Strings are read whole, so a
 * `url(` inside one opens nothing; `withStrings` also lists each string outside a url token.
 * One forward pass, and none for a text that cannot hold one.
 */
function urlSpans(text: string, withStrings = false): readonly number[] {
  if (!(withStrings ? MAY_HOLD_STRING_RE : MAY_HOLD_URL_RE).test(text)) return NO_SPANS;

  const spans: number[] = [];
  const len = text.length;
  let escape = -1;

  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code === BACKSLASH) {
      escape = i;
      i++;
    } else if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) {
      const end = stringEnd(text, i + 1, len, code);
      if (withStrings) spans.push(i, end + 1);
      i = end;
    } else if (code === OPEN_PAREN) {
      const spellsUrl = followsUrl(text, i);
      const start = spellsUrl ? i - 3 : i;
      const unquotedEnd = urlTokenEnd(text, i, len, escape);

      if (unquotedEnd !== -1) {
        spans.push(start, unquotedEnd + 1);
        i = unquotedEnd;
        continue;
      }

      const first = skipSpace(text, i + 1);
      const quote = text.charCodeAt(first);
      if (!spellsUrl || (quote !== DOUBLE_QUOTE && quote !== SINGLE_QUOTE)) continue;

      const close = text.indexOf(')', stringEnd(text, first + 1, len, quote));
      const end = close === -1 ? len : close + 1;
      spans.push(start, end);
      i = end - 1;
    }
  }

  return spans;
}

function isDigit(code: number): boolean {
  return code >= DIGIT_0 && code <= DIGIT_9;
}

function skipSpace(s: string, from: number): number {
  let i = from;
  while (isSpace(s.charCodeAt(i))) i++;
  return i;
}

/** Index after the signed number token at `from`, or -1 when none starts there. */
function numberEnd(s: string, from: number): number {
  let i = from;
  if (s.charCodeAt(i) === PLUS || s.charCodeAt(i) === HYPHEN) i++;

  const intStart = i;
  while (isDigit(s.charCodeAt(i))) i++;

  let hasDigits = i > intStart;
  if (s.charCodeAt(i) === DOT && isDigit(s.charCodeAt(i + 1))) {
    i++;
    while (isDigit(s.charCodeAt(i))) i++;
    hasDigits = true;
  }
  if (!hasDigits) return -1;

  // `| 32` lowercases an ASCII letter.
  if ((s.charCodeAt(i) | 32) !== LOWER_E) return i;

  let j = i + 1;
  if (s.charCodeAt(j) === PLUS || s.charCodeAt(j) === HYPHEN) j++;
  if (!isDigit(s.charCodeAt(j))) return i;

  while (isDigit(s.charCodeAt(j))) j++;
  return j;
}

/**
 * Whether `var(--name, <number>)<known unit>` starts at `at`; when it does, `VAR_PARTS` holds the
 * name, the fallback and the unit as index pairs. Nothing is allocated.
 */
function matchVarUnit(value: string, at: number): boolean {
  let i = skipSpace(value, at + 4);
  const nameStart = i;
  if (value.charCodeAt(i) !== HYPHEN || value.charCodeAt(i + 1) !== HYPHEN) return false;

  i += 2;
  while (isIdentChar(value.charCodeAt(i))) i++;
  if (i === nameStart + 2) return false;

  const nameEnd = i;
  i = skipSpace(value, i);
  if (value.charCodeAt(i) !== COMMA) return false;

  const numberStart = skipSpace(value, i + 1);
  const numberStop = numberEnd(value, numberStart);
  if (numberStop === -1) return false;

  i = skipSpace(value, numberStop);
  if (value.charCodeAt(i) !== CLOSE_PAREN) return false;

  const unitStart = i + 1;
  i = unitStart;
  if (value.charCodeAt(i) === PERCENT) i++;
  else while (isIdentChar(value.charCodeAt(i))) i++;
  if (i === unitStart) return false;
  if (!KNOWN_UNITS.has(value.slice(unitStart, i).toLowerCase())) return false;

  VAR_PARTS[0] = nameStart;
  VAR_PARTS[1] = nameEnd;
  VAR_PARTS[2] = numberStart;
  VAR_PARTS[3] = numberStop;
  VAR_PARTS[4] = unitStart;
  VAR_PARTS[5] = i;
  return true;
}

/**
 * Declaration repair for the rn-web bridge, run per `prop: value` pair by the compiler.
 * `padding: ${t.space.sm}px` joins a theme variable and its unit as `var(--sc-space-sm, 13)px`,
 * which a browser drops because the unit lands outside the `var()`. In any property, the form
 * `var(--name, <number>)<unit>` becomes `calc(var(--name, <number>) * 1<unit>)`. A match inside a
 * string or a url token is left alone, and so is every other value, unitless math included, which
 * a browser reads as standard CSS does. Returns `undefined` when nothing matches, without
 * allocating.
 */
export const rewriteBridgeValue: DeclTransform = (prop, value) => {
  let at = nextVarCall(value, 0);
  if (at < 0) return undefined;

  let out = '';
  let last = 0;
  let spans: readonly number[] | undefined;
  let cursor = 0;

  for (; at >= 0; at = nextVarCall(value, at + 4)) {
    // A longer function name (`myvar(`) or an escape before the name is no `var(`.
    const before = value.charCodeAt(at - 1);
    if (at > 0 && (isIdentChar(before) || before === BACKSLASH || before > 127)) continue;
    if (!matchVarUnit(value, at)) continue;

    const end = VAR_PARTS[5];
    if (spans === undefined) spans = urlSpans(value, true);
    // Matches come in order and never overlap, so the span cursor only moves forward.
    while (cursor < spans.length && spans[cursor + 1] <= at) cursor += 2;
    if (cursor < spans.length && spans[cursor] < end) continue;

    out +=
      value.slice(last, at) +
      'calc(var(' +
      value.slice(VAR_PARTS[0], VAR_PARTS[1]) +
      ', ' +
      value.slice(VAR_PARTS[2], VAR_PARTS[3]) +
      ') * 1' +
      value.slice(VAR_PARTS[4], end) +
      ')';
    last = end;
    at = end - 4;
  }

  return last === 0 ? undefined : { prop, value: out + value.slice(last) };
};

/** Whether `s` spells the lowercase `word` at `from`, ignoring ASCII case. */
function spellsAt(s: string, from: number, word: string): boolean {
  for (let k = 0; k < word.length; k++) {
    // `| 32` lowercases an ASCII letter; no other code lands on a letter.
    if ((s.charCodeAt(from + k) | 32) !== word.charCodeAt(k)) return false;
  }
  return true;
}

/** Index of the `]` closing an attribute selector whose `[` precedes `from`, or `len`. */
function attributeEnd(s: string, from: number, len: number): number {
  for (let i = from; i < len; i++) {
    const code = s.charCodeAt(i);
    if (code === BACKSLASH) i++;
    else if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) i = stringEnd(s, i + 1, len, code);
    else if (code === CLOSE_BRACKET) return i;
  }
  return len;
}

/**
 * `:disabled` becomes `:is(:disabled,[aria-disabled=true])` and `:enabled` its negation, since
 * react-native-web marks a disabled primitive with `aria-disabled` and only form controls take the
 * `disabled` attribute. Strings, attribute selectors, escapes and `::pseudo-element` names are
 * skipped, so only a real pseudo-class token matches, at any depth and in every list member. The
 * output is not scanned again. A selector without a token is returned as is.
 */
export function rewriteDisabledTokens(selector: string): string {
  if (!DISABLED_OR_ENABLED_RE.test(selector)) return selector;

  const len = selector.length;
  let out = '';
  let last = 0;

  for (let i = 0; i < len; i++) {
    const code = selector.charCodeAt(i);

    if (code === BACKSLASH) {
      i++;
    } else if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) {
      i = stringEnd(selector, i + 1, len, code);
    } else if (code === OPEN_BRACKET) {
      i = attributeEnd(selector, i + 1, len);
    } else if (code === COLON) {
      if (selector.charCodeAt(i + 1) === COLON) {
        i++;
        continue;
      }

      const isDisabled = spellsAt(selector, i + 1, 'disabled');
      if (!isDisabled && !spellsAt(selector, i + 1, 'enabled')) continue;

      const end = i + (isDisabled ? 9 : 8);
      const next = selector.charCodeAt(end);
      if (isIdentChar(next) || next >= 128 || next === BACKSLASH) continue;

      out += selector.slice(last, i) + (isDisabled ? DISABLED_ANY : ENABLED_ANY);
      last = end;
      i = end - 1;
    }
  }

  return last === 0 ? selector : out + selector.slice(last);
}

/**
 * Index of the `)` or `]` closing the block that opens at `selector[open]`, or -1 when it is
 * unclosed, holds a brace, or nests past `MAX_BLOCK_DEPTH`. Strings and escapes are read whole,
 * and only a block's own mirror closes it, as a browser reads it. The open blocks sit in the bits
 * of `stack` (1 for a paren), so no array is allocated.
 */
function blockEnd(selector: string, open: number, len: number): number {
  let stack = selector.charCodeAt(open) === OPEN_PAREN ? 1 : 0;
  let depth = 1;

  for (let i = open + 1; i < len; i++) {
    const code = selector.charCodeAt(i);

    if (code === BACKSLASH) {
      i++;
    } else if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) {
      i = stringEnd(selector, i + 1, len, code);
      if (i >= len) return -1;
    } else if (code === OPEN_PAREN || code === OPEN_BRACKET) {
      if (depth === MAX_BLOCK_DEPTH) return -1;
      stack = (stack << 1) | (code === OPEN_PAREN ? 1 : 0);
      depth++;
    } else if (code === CLOSE_PAREN || code === CLOSE_BRACKET) {
      if ((stack & 1) !== (code === CLOSE_PAREN ? 1 : 0)) continue;
      depth--;
      if (depth === 0) return i;
      stack >>>= 1;
    } else if (code === OPEN_BRACE || code === CLOSE_BRACE) {
      return -1;
    }
  }

  return -1;
}

/**
 * Whether the argument in `selector[from, to)` of a `:not(` belongs in a `:where()` wrap: it holds
 * no escape and no paren outside a string, and is not one known pseudo-class, whose weight the
 * native engine counts as the pseudo-class's own.
 */
function isWrappableArgument(selector: string, from: number, to: number): boolean {
  let quote = 0;

  for (let i = from; i < to; i++) {
    const code = selector.charCodeAt(i);

    if (code === BACKSLASH) return false;
    if (quote !== 0) {
      if (code === quote || code === LF || code === CR || code === FF) quote = 0;
    } else if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) {
      quote = code;
    } else if (code === OPEN_PAREN || code === CLOSE_PAREN) {
      return false;
    }
  }

  let start = from;
  let end = to;
  while (start < end && isSpace(selector.charCodeAt(start))) start++;
  while (end > start && isSpace(selector.charCodeAt(end - 1))) end--;

  if (selector.charCodeAt(start) !== COLON) return true;
  return !KNOWN_PSEUDOS.has(selector.substring(start + 1, end).toLowerCase());
}

function addRun(runs: number[] | null, start: number, end: number): number[] {
  const out = runs === null ? [] : runs;
  out.push(start, end);
  return out;
}

/** Whether a name that ends at a character of this code goes on past it, so it is only a prefix. */
function continuesName(code: number): boolean {
  return isIdentChar(code) || code === BACKSLASH || code > 127;
}

/**
 * Wraps each run of adjacent wrappable `:not()` groups in the component's own compound in
 * `:where()`, so source order decides against a sibling `.cls[attr]` rule. `head` is the component
 * as `selector` spells it (namespace included). A comma member is the component's own when it
 * starts with `head` and holds no combinator after that compound; only an own member's compound
 * before its first pseudo-element is wrapped, so a descendant, a sibling and a context compound
 * (`.dark:not(.x) &`) stay as written, as does every selector of a rule with no `head` (global
 * styles). Nothing is reordered. A selector is left whole when a group, string or bracket stays
 * open anywhere in it, or when it holds a url token, which a rewrite must not touch.
 */
export function wrapComponentNots(selector: string, head: string): string {
  if (head === '' || !MAY_HOLD_NOT_RE.test(selector)) return selector;

  const len = selector.length;
  const headLength = head.length;
  let runs: number[] | null = null;
  let i = 0;

  while (i < len) {
    const start = skipSpace(selector, i);
    let own =
      selector.startsWith(head, start) && !continuesName(selector.charCodeAt(start + headLength));
    let wraps = own;
    const mark = runs === null ? 0 : runs.length;
    let runStart = -1;
    let runEnd = -1;

    i = own ? start + headLength : start;

    while (i < len) {
      const code = selector.charCodeAt(i);
      if (code === COMMA) break;

      if (isSpace(code)) {
        const next = skipSpace(selector, i);
        if (next < len && selector.charCodeAt(next) !== COMMA) {
          own = false;
          wraps = false;
        }
        i = next;
      } else if (code === GT || code === PLUS || code === TILDE) {
        own = false;
        wraps = false;
        i++;
      } else if (code === COLON) {
        if (selector.charCodeAt(i + 1) === COLON) {
          wraps = false;
          i += 2;
        } else if (
          wraps &&
          spellsAt(selector, i + 1, 'not') &&
          selector.charCodeAt(i + 4) === OPEN_PAREN
        ) {
          const close = blockEnd(selector, i + 4, len);
          if (close === -1) return selector;

          if (isWrappableArgument(selector, i + 5, close)) {
            if (runStart === -1) {
              runStart = i;
            } else if (runEnd !== i) {
              runs = addRun(runs, runStart, runEnd);
              runStart = i;
            }
            runEnd = close + 1;
          }
          i = close + 1;
        } else {
          i++;
        }
      } else if (code === BACKSLASH) {
        i += 2;
      } else if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) {
        const end = stringEnd(selector, i + 1, len, code);
        if (end >= len) return selector;
        i = end + 1;
      } else if (code === OPEN_PAREN || code === OPEN_BRACKET) {
        const close = blockEnd(selector, i, len);
        if (close === -1) return selector;
        i = close + 1;
      } else if (
        code === CLOSE_PAREN ||
        code === CLOSE_BRACKET ||
        code === OPEN_BRACE ||
        code === CLOSE_BRACE
      ) {
        return selector;
      } else {
        i++;
      }
    }

    if (!own) {
      if (runs !== null) runs.length = mark;
    } else if (runStart !== -1) {
      runs = addRun(runs, runStart, runEnd);
    }
    i++;
  }

  if (runs === null || runs.length === 0) return selector;
  if (urlSpans(selector).length !== 0) return selector;

  let out = '';
  let last = 0;
  for (let r = 0; r < runs.length; r += 2) {
    out += selector.slice(last, runs[r]) + ':where(' + selector.slice(runs[r], runs[r + 1]) + ')';
    last = runs[r + 1];
  }
  return out + selector.slice(last);
}
