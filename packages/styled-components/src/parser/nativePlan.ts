import * as $ from '../utils/charCodes';
import {
  AtRuleNode,
  AttrSelector,
  ConditionalAttr,
  NATIVE_AT_CLASS,
  NATIVE_RULE_CLASS,
  NativeAtClass,
  NativeRuleClass,
  PseudoState,
  RuleNode,
} from './ast';

export type { AttrSelector, ConditionalAttr, NativeAtClass, NativeRuleClass, PseudoState };
export { NATIVE_AT_CLASS, NATIVE_RULE_CLASS };

/**
 * Parse-time-classified selector/at-rule metadata for the native runtime.
 * Lives on the AST node directly via Symbol-keyed non-enumerable
 * properties (same pattern as `[DYN]`), so:
 *
 * - `Object.keys` / `for..in` / `JSON.stringify` ignore it.
 * - Jest `toEqual` equality (which walks both keys and own symbols filtered
 *   by enumerable) skips it.
 * - V8 still inline-caches the property as a hidden-class slot read.
 *
 * The classification is computed once per AST and survives across every
 * cache-miss render. Phase A's `fillAst` returns static subtrees by
 * reference, so static Rule / AtRule nodes carry the same classification
 * through to `astToNativeStyles`. Dynamic-selector nodes (those whose
 * selectors carry `\0I` interpolation sentinels) skip classification at
 * parse time; the render path falls through to the legacy inline classifier
 * once values are filled in (rare in practice).
 */

const KNOWN_PSEUDOS: Record<string, PseudoState> = {
  hover: 'hover',
  focus: 'focus',
  'focus-visible': 'focus',
  active: 'pressed',
  disabled: 'disabled',
};

/**
 * Stamp a freshly-constructed RuleNode with parse-time native
 * classification. Called by the parser at Rule construction sites; web
 * builds skip these calls entirely via the `__NATIVE__` build constant
 * (rollup tree-shakes the import after dead-code elimination).
 *
 * Selectors carrying interpolations (TemplateValue) skip classification;
 * the render path retries via {@link classifyRuleNow} on the filled
 * (now-string) selectors. This is the rare path; `&:hover` /
 * `&[aria-pressed]` style selectors don't typically interpolate.
 */
export function stampRuleClass(node: RuleNode): void {
  const selectors = node.selectors;
  for (let i = 0; i < selectors.length; i++) {
    if (typeof selectors[i] !== 'string') return;
  }
  Object.defineProperty(node, NATIVE_RULE_CLASS, {
    value: classifyRuleNow(selectors as string[]),
    enumerable: false,
    configurable: true,
  });
}

/**
 * Compute (without stamping) the native classification for an AtRule by
 * its `name` + `prelude` (both strings; callers handle the
 * TemplateValue case before invoking this). Used by {@link stampAtClass}
 * at parser construction time on static-name+prelude at-rules, and by
 * the render-time fallback in `compileNative.ts` (where `fillAst` has
 * already substituted any TemplateValue back to strings).
 */
export function classifyAtRuleNow(name: string, prelude: string): NativeAtClass {
  if (name === 'starting-style') return { kind: 'starting-style' };
  if (name === 'media' || name === 'container' || name === 'supports') {
    if (name === 'container') {
      // `${Component}` interpolation pre-stringifies as a class selector
      // (`.sc-aBcDeF`) for normal selector contexts; in the `@container
      // <name>` slot the bare ident is wanted. Strip a leading dot from
      // the prelude before extraction so both the name and the
      // remaining condition substring stay consistent.
      const normalizedPrelude = prelude.charCodeAt(0) === $.DOT ? prelude.substring(1) : prelude;
      const containerName = extractContainerName(normalizedPrelude);
      const condition = containerName
        ? normalizedPrelude.substring(containerName.length).replace(/^\s+/, '')
        : normalizedPrelude;
      return { kind: 'container', containerName, condition };
    }
    return { kind: name, containerName: undefined, condition: prelude };
  }
  if (name === 'keyframes' || /^-[a-z]+-keyframes$/.test(name)) return { kind: 'keyframes' };
  if (name === 'font-face' || name === 'property' || name === 'page') {
    return { kind: 'unsupported', warn: 'web-only' };
  }
  return { kind: 'unsupported', warn: 'unknown' };
}

/**
 * Stamp a freshly-constructed AtRuleNode with parse-time native
 * classification. Skipped when `name` or `prelude` is a TemplateValue
 * (dynamic at parse time); the render path's lazy fallback re-classifies
 * once `fillAst` has substituted them to strings. Most at-rules are
 * fully static so the stamp covers the common case.
 */
export function stampAtClass(node: AtRuleNode): void {
  if (typeof node.name !== 'string' || typeof node.prelude !== 'string') return;
  Object.defineProperty(node, NATIVE_AT_CLASS, {
    value: classifyAtRuleNow(node.name, node.prelude),
    enumerable: false,
    configurable: true,
  });
}

/**
 * Render-time fallback when parse-time classification was skipped because
 * the selectors contained interpolation sentinels. Operates on the
 * (filled) selectors string array; never mutates the node.
 */
export function classifyRuleNow(selectors: string[]): NativeRuleClass {
  const direct = detectPseudo(selectors);
  if (direct !== null) return { kind: 'pseudo', pseudo: direct };
  const fanOut = detectIsWhereStates(selectors) || detectMultiPseudo(selectors);
  if (fanOut) return { kind: 'pseudoFanOut', pseudos: fanOut };
  const attrSels = detectAttrSelectors(selectors);
  if (attrSels) return { kind: 'attr', selectors: attrSels };
  return { kind: 'unsupported' };
}

function detectPseudoSelector(sel: string): PseudoState | null {
  // Match `&:<pseudo>`; the only native-supported selector shape in v7.0.
  if (sel.length < 3 || sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.COLON) {
    return null;
  }
  const name = sel.substring(2);
  return KNOWN_PSEUDOS[name] || null;
}

function detectPseudo(selectors: string[]): PseudoState | null {
  if (selectors.length !== 1) return null;
  return detectPseudoSelector(selectors[0]);
}

/**
 * Top-level comma-separated pseudo selectors (`&:focus, &:focus-visible`) are
 * sugar for `&:is(:focus, :focus-visible)`. Fan out when every comma-fragment
 * is a known pseudo state.
 */
function detectMultiPseudo(selectors: string[]): PseudoState[] | null {
  if (selectors.length < 2) return null;
  const states: PseudoState[] = [];
  for (let i = 0; i < selectors.length; i++) {
    const s = detectPseudoSelector(selectors[i]);
    if (s === null) return null;
    states.push(s);
  }
  return states;
}

/**
 * Expand `&:is(:state1, :state2, …)` and `&:where(...)` into the set of
 * individual pseudo-states covered by the argument list. Returns the
 * matched states or `null` if the selector isn't a pseudo-enumeration
 * pattern we can polyfill.
 *
 * Polyfill: CSS Selectors L4 `:is` / `:where` are non-existent on RN ;
 * no selector engine. But when every argument is a known pseudo-state,
 * we can emit N parallel pseudo buckets with the same decls, which is
 * semantically equivalent (union-of-states in the state-predicate sense).
 */
function detectIsWhereStates(selectors: string[]): PseudoState[] | null {
  if (selectors.length !== 1) return null;
  const sel = selectors[0];
  if (sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.COLON) {
    return null;
  }
  const rest = sel.substring(2);
  let fnName: string;
  if (rest.startsWith('is(')) fnName = 'is';
  else if (rest.startsWith('where(')) fnName = 'where';
  else return null;

  const openParen = fnName.length;
  if (sel.charCodeAt(2 + openParen) !== $.OPEN_PAREN) return null;
  const closeParen = sel.lastIndexOf(')');
  if (closeParen === -1) return null;
  const inner = sel.substring(2 + openParen + 1, closeParen);

  const states: PseudoState[] = [];
  const parts = inner.split(',');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (p.charCodeAt(0) !== $.COLON) return null;
    const name = p.substring(1);
    const mapped = KNOWN_PSEUDOS[name];
    if (!mapped) return null;
    states.push(mapped);
  }
  return states.length > 0 ? states : null;
}

/**
 * Parse one or more comma-separated selectors, each consisting of an
 * attribute-selector chain plus an optional trailing pseudo state.
 *
 * Supports:
 * - Single: `&[attr]`, `&[attr=value]`
 * - Compound (AND): `&[a][b]`, `&[a=x][b=y]`
 * - Attr + pseudo: `&[attr]:active`, `&[a][b]:focus`
 * - Comma-grouped (fan-out): `&[a], &[b]`;each emits its own bucket
 * - Mixed: `&[a][b]:active, &[c]`
 *
 * Returns one selector per input string, or `null` if any selector
 * isn't a pure attribute-(plus-optional-pseudo) chain;so the caller
 * can fall through to the "complex selector" warning instead of
 * silently dropping a partially-parseable rule.
 *
 * `=` is the only supported operator. `~=`, `^=`, `$=`, `*=`, `|=`
 * fall through to null.
 */
function detectAttrSelectors(selectors: string[]): AttrSelector[] | null {
  const out: AttrSelector[] = [];
  for (let i = 0; i < selectors.length; i++) {
    const sel = parseAttrChain(selectors[i]);
    if (sel === null) return null;
    out.push(sel);
  }
  return out.length > 0 ? out : null;
}

function parseAttrChain(sel: string): AttrSelector | null {
  if (sel.length < 4 || sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.OPEN_BRACKET) {
    return null;
  }
  const attrs: ConditionalAttr[] = [];
  let i = 1;
  while (i < sel.length && sel.charCodeAt(i) === $.OPEN_BRACKET) {
    const end = findClosingBracket(sel, i);
    if (end === -1) return null;
    const attr = parseAttrInner(sel.substring(i + 1, end));
    if (attr === null) return null;
    attrs.push(attr);
    i = end + 1;
  }
  if (attrs.length === 0) return null;
  if (i === sel.length) return { attrs };
  if (sel.charCodeAt(i) !== $.COLON) return null;
  const pseudoName = sel.substring(i + 1);
  const pseudo = KNOWN_PSEUDOS[pseudoName];
  if (!pseudo) return null;
  return { attrs, pseudo };
}

/**
 * Find the matching `]` for the `[` at `start`. Skips brackets inside
 * single- or double-quoted attribute values so `&[a='[]']` doesn't
 * trip on the embedded `]`.
 */
function findClosingBracket(sel: string, start: number): number {
  let i = start + 1;
  let inSingle = false;
  let inDouble = false;
  while (i < sel.length) {
    const c = sel.charCodeAt(i);
    if (inSingle) {
      if (c === $.SINGLE_QUOTE) inSingle = false;
    } else if (inDouble) {
      if (c === $.DOUBLE_QUOTE) inDouble = false;
    } else if (c === $.SINGLE_QUOTE) {
      inSingle = true;
    } else if (c === $.DOUBLE_QUOTE) {
      inDouble = true;
    } else if (c === $.CLOSE_BRACKET) {
      return i;
    }
    i++;
  }
  return -1;
}

function parseAttrInner(inner: string): ConditionalAttr | null {
  const eqIdx = inner.indexOf('=');
  if (eqIdx === -1) {
    const name = inner.trim();
    return isAttrName(name) ? { name } : null;
  }
  if (eqIdx > 0) {
    const before = inner.charCodeAt(eqIdx - 1);
    if (
      before === $.TILDE ||
      before === $.PIPE ||
      before === $.CARET ||
      before === $.DOLLAR ||
      before === $.ASTERISK
    ) {
      return null;
    }
  }
  const name = inner.substring(0, eqIdx).trim();
  if (!isAttrName(name)) return null;
  let raw = inner.substring(eqIdx + 1).trim();
  // Strip CSS Selectors L4 case-flag suffix (` i` / ` s`).
  if (raw.length >= 2 && raw.charCodeAt(raw.length - 2) === $.SPACE) {
    const flag = raw.charCodeAt(raw.length - 1);
    if (flag === $.LOWER_I || flag === $.LOWER_S || flag === $.UPPER_I || flag === $.UPPER_S) {
      raw = raw.substring(0, raw.length - 2).trim();
    }
  }
  let value = raw;
  if (value.length >= 2) {
    const first = value.charCodeAt(0);
    const last = value.charCodeAt(value.length - 1);
    if (
      (first === $.SINGLE_QUOTE && last === $.SINGLE_QUOTE) ||
      (first === $.DOUBLE_QUOTE && last === $.DOUBLE_QUOTE)
    ) {
      value = value.substring(1, value.length - 1);
    }
  }
  return { name, value };
}

function isAttrName(name: string): boolean {
  if (name.length === 0) return false;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    const ok =
      (c >= $.LOWER_A && c <= $.LOWER_Z) ||
      (c >= $.UPPER_A && c <= $.UPPER_Z) ||
      (c >= $.DIGIT_0 && c <= $.DIGIT_9) ||
      c === $.HYPHEN ||
      c === $.UNDERSCORE ||
      c === $.COLON;
    if (!ok) return false;
  }
  return true;
}

/**
 * Extract an optional container name from an `@container` prelude.
 * `card (min-width: 400px)` → `card`. Bare `(min-width: 400px)` → `undefined`.
 */
function extractContainerName(prelude: string): string | undefined {
  const firstChar = prelude.charCodeAt(0);
  if (firstChar === $.OPEN_PAREN) return undefined;
  let i = 0;
  while (i < prelude.length) {
    const c = prelude.charCodeAt(i);
    if (c === $.SPACE || c === $.TAB || c === $.OPEN_PAREN) break;
    i++;
  }
  return prelude.substring(0, i);
}
