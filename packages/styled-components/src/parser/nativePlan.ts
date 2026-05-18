import * as $ from '../utils/charCodes';
import {
  AtRuleNode,
  AttrSelector,
  ConditionalAttr,
  NATIVE_AT_CLASS,
  NATIVE_RULE_CLASS,
  NativeAtClass,
  NativeRuleClass,
  NthOfBranch,
  NthSpec,
  PseudoState,
  RuleNode,
} from './ast';

export type {
  AttrSelector,
  ConditionalAttr,
  NativeAtClass,
  NativeRuleClass,
  NthOfBranch,
  NthSpec,
  PseudoState,
};
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
  // `:not(<simple-selector>)`. Current scope is simple-arg only;
  // complex/compound arguments fall through to the generic
  // complex-selector warn.
  const notCls = detectNot(selectors);
  if (notCls !== null) return notCls;
  // Descendant / child / adjacent-sibling / general-sibling combinator
  // against an interpolated styled component reference. `${Foo} &` /
  // `> &` / `+ &` / `~ &` compile to `.sc-FooId &` / `.sc-FooId > &` /
  // `.sc-FooId + &` / `.sc-FooId ~ &` after
  // `${StyledComponent}.toString()`.
  const combinator = detectCombinator(selectors);
  if (combinator !== null) return combinator;
  // Tree-structural pseudo-classes that match by sibling position.
  // `&:first-child`, `&:last-child`, `&:only-child`,
  // `&:nth-child(an+b)`, `&:nth-last-child(...)`, `&:nth-of-type(...)`,
  // `&:nth-last-of-type(...)`.
  const nth = detectNthChild(selectors);
  if (nth !== null) return nth;
  // `&:has(<simple>)`. Inner restricted to a single class selector
  // (`${Component}`) or a single attribute selector for the v7 scope.
  const has = detectHas(selectors);
  if (has !== null) return has;
  return { kind: 'unsupported' };
}

/**
 * Parse a single simple-selector inner shared by `:has(<simple>)` and
 * `:nth-child(an+b of <simple>)`. Returns null on compound / complex
 * inner forms (with combinators, comma lists, or pseudo-states).
 */
function parseSimpleInner(inner: string): NthOfBranch | null {
  if (inner.length === 0) return null;

  // Component reference: `.sc-<id>` produced by `${Component}.toString()`.
  if (inner.charCodeAt(0) === $.DOT) {
    let i = 1;
    while (i < inner.length) {
      const c = inner.charCodeAt(i);
      const isIdent =
        (c >= 0x30 && c <= 0x39) /* 0-9 */ ||
        (c >= 0x41 && c <= 0x5a) /* A-Z */ ||
        (c >= 0x61 && c <= 0x7a) /* a-z */ ||
        c === 0x2d /* - */ ||
        c === 0x5f; /* _ */
      if (!isIdent) break;
      i++;
    }
    if (i !== inner.length) return null;
    if (i === 1) return null;
    return { kind: 'component', id: inner.substring(1) };
  }

  // Attribute selector: `[attr]`, `[attr=value]`, `[attr='value']`.
  if (inner.charCodeAt(0) === $.OPEN_BRACKET) {
    const end = findClosingBracket(inner, 0);
    if (end !== inner.length - 1) return null;
    const attr = parseAttrInner(inner.substring(1, end));
    if (attr === null) return null;
    return { kind: 'attr', attr };
  }

  return null;
}

/**
 * `&:has(<inner>)`: match when the element has a descendant matching
 * the inner simple selector. v7 scope: a styled-component reference
 * (post-fillAst class selector `.sc-FooId`) or a single attribute
 * selector. Compound / complex inner forms fall through.
 */
function detectHas(selectors: string[]): NativeRuleClass | null {
  if (selectors.length !== 1) return null;
  const sel = selectors[0];
  const prefix = '&:has(';
  if (!sel.startsWith(prefix) || sel.charCodeAt(sel.length - 1) !== $.CLOSE_PAREN) return null;
  const inner = sel.substring(prefix.length, sel.length - 1).trim();
  const parsed = parseSimpleInner(inner);
  if (parsed === null) return null;
  return { kind: 'has', inner: parsed };
}

/**
 * Parse the `an+b` syntax inside a `:nth-child` family pseudo. Returns
 * null on unrecognized forms (keeps caller bailing to generic
 * "complex selector" treatment). Supports literal integers (`3`),
 * keyword shortcuts (`odd`, `even`), and the full `[+-]?(\d*)n([+-]\d+)?`
 * grammar with whitespace tolerance.
 */
function parseAnPlusB(raw: string): { a: number; b: number } | null {
  const s = raw.trim().toLowerCase();
  if (s.length === 0) return null;
  if (s === 'odd') return { a: 2, b: 1 };
  if (s === 'even') return { a: 2, b: 0 };
  // No `n` → bare integer.
  const nIdx = s.indexOf('n');
  if (nIdx === -1) {
    const n = parseInt(s, 10);
    if (Number.isNaN(n) || String(n) !== s.replace(/^\+/, '')) {
      // Also accept signed integer forms (`+3`, `-3`).
      const m = s.match(/^[+-]?\d+$/);
      if (!m) return null;
    }
    return { a: 0, b: parseInt(s, 10) };
  }
  // `n` present. Split into a-coefficient and b-offset.
  const aRaw = s.substring(0, nIdx).trim();
  const bRaw = s.substring(nIdx + 1).trim();
  let a: number;
  if (aRaw === '' || aRaw === '+') a = 1;
  else if (aRaw === '-') a = -1;
  else {
    const am = aRaw.match(/^[+-]?\d+$/);
    if (!am) return null;
    a = parseInt(aRaw, 10);
  }
  let b: number;
  if (bRaw === '') b = 0;
  else {
    const bm = bRaw.match(/^[+-]\s*\d+$/);
    if (!bm) return null;
    b = parseInt(bRaw.replace(/\s+/g, ''), 10);
  }
  return { a, b };
}

/**
 * Split `:nth-child(an+b of S)` style inner into formula + of-selector.
 * Returns null when no ` of ` keyword is present. The split is
 * bracket-depth-aware so attribute values containing literal ` of `
 * substrings inside `[...]` don't trigger a false split.
 */
function splitNthInner(inner: string): { formula: string; ofRaw: string } | null {
  let depth = 0;
  for (let i = 0; i < inner.length - 3; i++) {
    const c = inner.charCodeAt(i);
    if (c === $.OPEN_BRACKET) {
      depth++;
      continue;
    }
    if (c === $.CLOSE_BRACKET) {
      depth--;
      continue;
    }
    if (depth !== 0) continue;
    if (
      c === 0x20 /* space */ &&
      (inner.charCodeAt(i + 1) === 0x6f /* o */ || inner.charCodeAt(i + 1) === 0x4f) /* O */ &&
      (inner.charCodeAt(i + 2) === 0x66 /* f */ || inner.charCodeAt(i + 2) === 0x46) /* F */ &&
      inner.charCodeAt(i + 3) === 0x20 /* space */
    ) {
      return { formula: inner.substring(0, i), ofRaw: inner.substring(i + 4) };
    }
  }
  return null;
}

/**
 * Parse the contents of `:nth-child(...)` / `:nth-last-child(...)` /
 * `:nth-of-type(...)` / `:nth-last-of-type(...)`. The `acceptOf`
 * argument controls whether ` of S` suffixes are permitted (only the
 * `:nth-child` and `:nth-last-child` forms accept it per spec).
 * Returns null on unrecognized forms; the caller routes a complex
 * inner that contains ` of ` to the generic complex-selector warn.
 */
function parseNthInner(
  raw: string,
  acceptOf: boolean
): { a: number; b: number; of?: NthOfBranch } | null {
  const split = splitNthInner(raw);
  if (split === null) {
    const ab = parseAnPlusB(raw);
    return ab === null ? null : ab;
  }
  if (!acceptOf) return null;
  const ab = parseAnPlusB(split.formula);
  if (ab === null) return null;
  const of = parseSimpleInner(split.ofRaw.trim());
  if (of === null) return null;
  return { a: ab.a, b: ab.b, of };
}

/**
 * `&:first-child` / `&:last-child` / `&:only-child` / `&:nth-child(...)`
 * / `&:nth-last-child(...)` / `&:nth-of-type(...)` /
 * `&:nth-last-of-type(...)` and optional trailing pseudo-state.
 */
function detectNthChild(selectors: string[]): NativeRuleClass | null {
  if (selectors.length !== 1) return null;
  const sel = selectors[0];
  if (sel.length < 3 || sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.COLON) {
    return null;
  }
  // Split into nth-pseudo head and optional trailing `:pseudo` tail
  // (`&:first-child:hover`). Find the second colon AFTER any
  // parenthesized argument list closes.
  let head = sel.substring(2);
  let tailPseudo: PseudoState | undefined;
  const openParen = head.indexOf('(');
  if (openParen !== -1) {
    const closeParen = findClosingParen(head, openParen);
    if (closeParen === -1) return null;
    const tail = head.substring(closeParen + 1);
    if (tail.length > 0) {
      if (tail.charCodeAt(0) !== $.COLON) return null;
      const p = KNOWN_PSEUDOS[tail.substring(1)];
      if (!p) return null;
      tailPseudo = p;
    }
    head = head.substring(0, closeParen + 1);
  } else {
    // Parameterless nth pseudos: look for a trailing `:pseudo`.
    const secondColon = head.indexOf(':');
    if (secondColon !== -1) {
      const tail = head.substring(secondColon);
      const p = KNOWN_PSEUDOS[tail.substring(1)];
      if (!p) return null;
      tailPseudo = p;
      head = head.substring(0, secondColon);
    }
  }

  let spec: NthSpec | null = null;
  if (head === 'first-child') spec = { a: 0, b: 1, fromEnd: false, ofType: false };
  else if (head === 'last-child') spec = { a: 0, b: 1, fromEnd: true, ofType: false };
  else if (head === 'only-child')
    spec = { a: 0, b: 1, fromEnd: false, ofType: false, onlyChild: true };
  else if (head === 'first-of-type') spec = { a: 0, b: 1, fromEnd: false, ofType: true };
  else if (head === 'last-of-type') spec = { a: 0, b: 1, fromEnd: true, ofType: true };
  else if (head === 'only-of-type')
    spec = { a: 0, b: 1, fromEnd: false, ofType: true, onlyChild: true };
  else if (head.startsWith('nth-child(') && head.endsWith(')')) {
    const inner = head.substring('nth-child('.length, head.length - 1);
    const parsed = parseNthInner(inner, true);
    if (parsed === null) return null;
    spec = { a: parsed.a, b: parsed.b, fromEnd: false, ofType: false };
    if (parsed.of !== undefined) spec.of = parsed.of;
  } else if (head.startsWith('nth-last-child(') && head.endsWith(')')) {
    const inner = head.substring('nth-last-child('.length, head.length - 1);
    const parsed = parseNthInner(inner, true);
    if (parsed === null) return null;
    spec = { a: parsed.a, b: parsed.b, fromEnd: true, ofType: false };
    if (parsed.of !== undefined) spec.of = parsed.of;
  } else if (head.startsWith('nth-of-type(') && head.endsWith(')')) {
    const inner = head.substring('nth-of-type('.length, head.length - 1);
    const parsed = parseNthInner(inner, false);
    if (parsed === null) return null;
    spec = { a: parsed.a, b: parsed.b, fromEnd: false, ofType: true };
  } else if (head.startsWith('nth-last-of-type(') && head.endsWith(')')) {
    const inner = head.substring('nth-last-of-type('.length, head.length - 1);
    const parsed = parseNthInner(inner, false);
    if (parsed === null) return null;
    spec = { a: parsed.a, b: parsed.b, fromEnd: true, ofType: true };
  }

  if (spec === null) return null;
  return tailPseudo === undefined
    ? { kind: 'nthChild', spec }
    : { kind: 'nthChild', spec, pseudo: tailPseudo };
}

function findClosingParen(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === $.OPEN_PAREN) depth++;
    else if (c === $.CLOSE_PAREN) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * `&:not(<simple-selector>)`: fire the bucket when the inner selector
 * does NOT match. Supports a single pseudo-state (`&:not(:hover)`), a
 * single attribute selector (`&:not([disabled])`), and the compound
 * trailing-pseudo form `&:not([attr]):pseudo`. Complex / multi-arg
 * forms (`&:not(:hover, :focus)`, `&:not(.foo .bar)`) fall through.
 */
function detectNot(selectors: string[]): NativeRuleClass | null {
  if (selectors.length !== 1) return null;
  const sel = selectors[0];
  const prefix = '&:not(';
  if (!sel.startsWith(prefix)) return null;
  const innerStart = prefix.length;
  const innerEnd = findClosingParen(sel, innerStart - 1);
  if (innerEnd === -1) return null;
  const inner = sel.substring(innerStart, innerEnd).trim();
  if (inner.length === 0) return null;

  let tailPseudo: PseudoState | undefined;
  if (innerEnd + 1 < sel.length) {
    if (sel.charCodeAt(innerEnd + 1) !== $.COLON) return null;
    const p = KNOWN_PSEUDOS[sel.substring(innerEnd + 2)];
    if (!p) return null;
    tailPseudo = p;
  }

  // Pseudo-state inversion: `&:not(:hover)`.
  if (inner.charCodeAt(0) === $.COLON) {
    if (tailPseudo !== undefined) return null;
    const name = inner.substring(1);
    const pseudo = KNOWN_PSEUDOS[name];
    if (!pseudo) return null;
    return { kind: 'pseudo', pseudo, negate: true };
  }

  // Attribute selector inversion: `&:not([disabled])`, `&:not([a='b'])`,
  // `&:not([disabled]):hover`.
  if (inner.charCodeAt(0) === $.OPEN_BRACKET) {
    const end = findClosingBracket(inner, 0);
    if (end !== inner.length - 1) return null;
    const attr = parseAttrInner(inner.substring(1, end));
    if (attr === null) return null;
    const selector: AttrSelector = { attrs: [attr] };
    if (tailPseudo !== undefined) selector.pseudo = tailPseudo;
    return { kind: 'attr', selectors: [selector], negate: true };
  }

  return null;
}

function detectPseudoSelector(sel: string): PseudoState | null {
  // Match `&:<pseudo>`; the only native-supported selector shape in v7.0.
  if (sel.length < 3 || sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.COLON) {
    return null;
  }
  const name = sel.substring(2);
  return KNOWN_PSEUDOS[name] || null;
}

/**
 * `${StyledFoo} &` (descendant) or `${StyledFoo} > &` (child). After
 * `${StyledComponent}.toString()` interpolates to
 * `.<styledComponentId>`, the selector string lands here as
 * `.sc-FooId &` / `.sc-FooId > &`. Optional pseudo on `&`
 * (`${Foo} &:hover`) is captured for composite matching.
 *
 * Direct-children limitation (per
 * `~/.claude/plans/v7-three-context-consolidation.md`): the chain
 * threads through every styled-component intermediary's ParentContext
 * publish, so a non-styled user component between Foo and the
 * matching descendant breaks the match. Both the dynamic and the
 * static impls publish ParentContext, so a static styled intermediary
 * stays visible to the chain as an ancestor.
 */
function detectCombinator(selectors: string[]): NativeRuleClass | null {
  if (selectors.length !== 1) return null;
  const sel = selectors[0];
  if (sel.charCodeAt(0) !== $.DOT) return null;
  // Walk the styled-component id (`sc-` + ident chars + digits).
  let i = 1;
  while (i < sel.length) {
    const c = sel.charCodeAt(i);
    const isIdent =
      (c >= 0x30 && c <= 0x39) /* 0-9 */ ||
      (c >= 0x41 && c <= 0x5a) /* A-Z */ ||
      (c >= 0x61 && c <= 0x7a) /* a-z */ ||
      c === 0x2d /* - */ ||
      c === 0x5f; /* _ */
    if (!isIdent) break;
    i++;
  }
  if (i === 1) return null;
  const ancestorId = sel.substring(1, i);
  // Whitespace mandatory before the combinator or descendant suffix.
  let j = i;
  let sawSpace = false;
  while (j < sel.length && sel.charCodeAt(j) === 0x20) {
    sawSpace = true;
    j++;
  }
  if (!sawSpace) return null;
  // Optional combinator char: `>` (child), `+` (adjacent sibling),
  // `~` (general sibling). Absent → descendant.
  let combinator: 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling' = 'descendant';
  const ch = sel.charCodeAt(j);
  if (ch === 0x3e /* > */) {
    combinator = 'child';
    j++;
    while (j < sel.length && sel.charCodeAt(j) === 0x20) j++;
  } else if (ch === 0x2b /* + */) {
    combinator = 'adjacent-sibling';
    j++;
    while (j < sel.length && sel.charCodeAt(j) === 0x20) j++;
  } else if (ch === 0x7e /* ~ */) {
    combinator = 'general-sibling';
    j++;
    while (j < sel.length && sel.charCodeAt(j) === 0x20) j++;
  }
  // Must end with `&` optionally followed by a `:pseudo`. Compound
  // forms (e.g. `&[attr]`, `&.cls`) are out of Phase 3 scope.
  if (sel.charCodeAt(j) !== $.AMPERSAND) return null;
  j++;
  let pseudo: PseudoState | undefined;
  if (j < sel.length) {
    if (sel.charCodeAt(j) !== $.COLON) return null;
    const name = sel.substring(j + 1);
    const p = KNOWN_PSEUDOS[name];
    if (!p) return null;
    pseudo = p;
  }
  return pseudo === undefined
    ? { kind: 'combinator', combinator, ancestorId }
    : { kind: 'combinator', combinator, ancestorId, pseudo };
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
  // Operator detection. The operator char sits immediately before `=`.
  // `=` alone is the default exact-match.
  let operator: '=' | '~=' | '|=' | '^=' | '$=' | '*=' = '=';
  let nameEnd = eqIdx;
  if (eqIdx > 0) {
    const before = inner.charCodeAt(eqIdx - 1);
    if (before === $.TILDE) {
      operator = '~=';
      nameEnd = eqIdx - 1;
    } else if (before === $.PIPE) {
      operator = '|=';
      nameEnd = eqIdx - 1;
    } else if (before === $.CARET) {
      operator = '^=';
      nameEnd = eqIdx - 1;
    } else if (before === $.DOLLAR) {
      operator = '$=';
      nameEnd = eqIdx - 1;
    } else if (before === $.ASTERISK) {
      operator = '*=';
      nameEnd = eqIdx - 1;
    }
  }
  const name = inner.substring(0, nameEnd).trim();
  if (!isAttrName(name)) return null;
  let raw = inner.substring(eqIdx + 1).trim();
  // Case-sensitivity flag suffix (` i` / ` s`). `i` makes the
  // comparison ASCII case-insensitive; `s` is the (default) sensitive
  // form and is dropped.
  let caseFlag: 'i' | undefined;
  if (raw.length >= 2 && raw.charCodeAt(raw.length - 2) === $.SPACE) {
    const flag = raw.charCodeAt(raw.length - 1);
    if (flag === $.LOWER_I || flag === $.UPPER_I) {
      caseFlag = 'i';
      raw = raw.substring(0, raw.length - 2).trim();
    } else if (flag === $.LOWER_S || flag === $.UPPER_S) {
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
  const out: ConditionalAttr = { name, value };
  if (operator !== '=') out.operator = operator;
  if (caseFlag !== undefined) out.caseFlag = caseFlag;
  return out;
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
