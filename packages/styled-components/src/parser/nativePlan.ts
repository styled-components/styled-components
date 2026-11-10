import { KNOWN_PSEUDOS } from '../native/pseudoBits';
import * as $ from '../utils/charCodes';
import {
  AtRuleNode,
  AttrSelector,
  ConditionalAttr,
  NATIVE_AT_CLASS,
  NATIVE_RULE_CLASS,
  NativeAtClass,
  NativeRuleClass,
  NativeSelectorClass,
  NthOfBranch,
  NthSpec,
  PseudoState,
  PseudoTerm,
  RuleNode,
} from './ast';
import { isKeyframesName } from './atRuleNames';

export type {
  AttrSelector,
  ConditionalAttr,
  NativeAtClass,
  NativeRuleClass,
  NativeSelectorClass,
  NthOfBranch,
  NthSpec,
  PseudoState,
};

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
 * cache-miss render. `fillAst` returns static subtrees by
 * reference, so static Rule / AtRule nodes carry the same classification
 * through to `astToNativeStyles`. Dynamic-selector nodes (those whose
 * selectors carry `\0I` interpolation sentinels) skip classification at
 * parse time; the render path falls through to the legacy inline classifier
 * once values are filled in (rare in practice).
 */

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
  if (isKeyframesName(name)) return { kind: 'keyframes' };
  if (name === 'property') return { kind: 'property' };
  if (name === 'font-face' || name === 'page') {
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
 * (filled) selectors string array; never mutates the node. A selector
 * list is classified member by member, so one unsupported member leaves
 * the others usable.
 */
export function classifyRuleNow(selectors: string[]): NativeRuleClass {
  if (selectors.length === 1) return classifySelector(selectors[0]);
  const members: NativeSelectorClass[] = [];
  for (let i = 0; i < selectors.length; i++) members.push(classifySelector(selectors[i]));
  return { kind: 'list', members };
}

function classifySelector(sel: string): NativeSelectorClass {
  const pseudoCls = detectPseudoTerms(sel);
  if (pseudoCls !== null) return pseudoCls;
  const fanOut = detectIsWhereStates(sel);
  if (fanOut) return { kind: 'pseudoFanOut', pseudos: fanOut };
  const attrSel = parseAttrChain(sel);
  if (attrSel !== null) return { kind: 'attr', selectors: [attrSel] };
  // Descendant / child / adjacent-sibling / general-sibling combinator
  // against an interpolated styled component reference. `${Foo} &` /
  // `> &` / `+ &` / `~ &` compile to `.sc-FooId &` / `.sc-FooId > &` /
  // `.sc-FooId + &` / `.sc-FooId ~ &` after
  // `${StyledComponent}.toString()`.
  const combinator = detectCombinator(sel);
  if (combinator !== null) return combinator;
  // Tree-structural pseudo-classes that match by sibling position.
  // `&:first-child`, `&:last-child`, `&:only-child`,
  // `&:nth-child(an+b)`, `&:nth-last-child(...)`, `&:nth-of-type(...)`,
  // `&:nth-last-of-type(...)`.
  const nth = detectNthChild(sel);
  if (nth !== null) return nth;
  // `&:has(<simple>)`. Inner restricted to a single class selector
  // (`${Component}`) or a single attribute selector; anything else is unsupported.
  const has = detectHas(sel);
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
      if (!$.isIdentChar(inner.charCodeAt(i))) break;
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
 * the inner simple selector. Supported inner forms: a styled-component
 * reference (post-fillAst class selector `.sc-FooId`) or a single
 * attribute selector. Compound / complex inner forms fall through.
 */
function detectHas(sel: string): NativeSelectorClass | null {
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
      $.isWS(c) &&
      (inner.charCodeAt(i + 1) === 0x6f /* o */ || inner.charCodeAt(i + 1) === 0x4f) /* O */ &&
      (inner.charCodeAt(i + 2) === 0x66 /* f */ || inner.charCodeAt(i + 2) === 0x46) /* F */ &&
      $.isWS(inner.charCodeAt(i + 3))
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
function detectNthChild(sel: string): NativeSelectorClass | null {
  if (sel.length < 3 || sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.COLON) {
    return null;
  }
  // The nth pseudo ends at its closing paren, or at the next `:` when it takes no argument; whatever
  // follows is the run of trailing pseudo-classes (`&:first-child:hover:not(:disabled)`).
  let headEnd = 2;
  while (headEnd < sel.length) {
    const c = sel.charCodeAt(headEnd);
    if (c === $.COLON || c === $.OPEN_PAREN) break;
    headEnd++;
  }
  if (sel.charCodeAt(headEnd) === $.OPEN_PAREN) {
    const closeParen = findClosingParen(sel, headEnd);
    if (closeParen === -1) return null;
    headEnd = closeParen + 1;
  }
  const head = sel.substring(2, headEnd);
  let tailTerms: PseudoTerm[] | null = null;
  if (headEnd < sel.length) {
    const tailAttrs: ConditionalAttr[] = [];
    tailTerms = parsePseudoRun(sel, headEnd, tailAttrs);
    // A structural entry has no attribute slot, so a negated attribute after the head stays unsupported.
    if (tailTerms === null || tailAttrs.length > 0 || tailTerms.length === 0) return null;
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
  const cls: Extract<NativeSelectorClass, { kind: 'nthChild' }> = { kind: 'nthChild', spec };
  if (tailTerms !== null) attachPseudoTerms(cls, tailTerms);
  return cls;
}

/**
 * Records a run of pseudo-class terms on a gated selector: the first leads (`pseudo`, `pseudoNegate`)
 * and any others go in `and`, the shape the matcher reads off an entry.
 */
function attachPseudoTerms(
  target: { and?: PseudoTerm[]; pseudo?: PseudoState; pseudoNegate?: boolean },
  terms: PseudoTerm[]
): void {
  target.pseudo = terms[0].pseudo;
  if (terms[0].negate) target.pseudoNegate = true;
  if (terms.length > 1) target.and = terms.slice(1);
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
 * The terms of `&:hover`, `&:not(:hover)`, `&:hover:not(:disabled)`: one or more known pseudo-classes,
 * each optionally wrapped in `:not(...)`. A `:not([attr])` among them (`&:not([x]):hover`,
 * `&:hover:not([x])`) turns the selector into an attribute selector with pseudo-class terms. Null when
 * the selector is anything else; complex arguments (`&:not(:hover, :focus)`, `&:not(.foo .bar)`) are
 * null too.
 */
function detectPseudoTerms(sel: string): NativeSelectorClass | null {
  if (sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.COLON) return null;
  const attrs: ConditionalAttr[] = [];
  const terms = parsePseudoRun(sel, 1, attrs);
  if (terms === null) return null;

  if (attrs.length > 0) {
    const selector: AttrSelector = { attrs };
    if (terms.length > 0) attachPseudoTerms(selector, terms);
    return { kind: 'attr', selectors: [selector] };
  }

  const [first, ...rest] = terms;
  const cls: NativeSelectorClass = { kind: 'pseudo', pseudo: first.pseudo };
  if (first.negate) cls.negate = true;
  if (rest.length > 0) cls.and = rest;
  return cls;
}

/**
 * The pseudo-class terms `sel` holds from index `start` (a `:`) to its end: each a known pseudo-class,
 * optionally wrapped in `:not(...)`, or null when anything else is there. A `:not([attr])` term is
 * pushed onto `attrs` as a negated attribute instead of returned. A single scan with `indexOf`, so
 * cost is linear in the selector length.
 */
function parsePseudoRun(sel: string, start: number, attrs: ConditionalAttr[]): PseudoTerm[] | null {
  const terms: PseudoTerm[] = [];
  let i = start;
  while (i < sel.length) {
    if (sel.charCodeAt(i) !== $.COLON) return null;
    const negate = sel.startsWith(':not(', i);
    let name: string;
    if (negate) {
      const close = findClosingParen(sel, i + 4);
      if (close === -1) return null;
      const inner = sel.substring(i + 5, close).trim();
      i = close + 1;
      if (inner.charCodeAt(0) === $.OPEN_BRACKET) {
        if (findClosingBracket(inner, 0) !== inner.length - 1) return null;
        const attr = parseAttrInner(inner.substring(1, inner.length - 1));
        if (attr === null) return null;
        attr.negate = true;
        attrs.push(attr);
        continue;
      }
      if (inner.charCodeAt(0) !== $.COLON) return null;
      name = inner.substring(1);
    } else {
      const next = sel.indexOf(':', i + 1);
      const end = next === -1 ? sel.length : next;
      name = sel.substring(i + 1, end);
      i = end;
    }
    const pseudo = KNOWN_PSEUDOS.get(name);
    if (!pseudo) return null;
    terms.push({ negate, pseudo });
  }
  return terms;
}

/**
 * `${StyledFoo} &` (descendant) or `${StyledFoo} > &` (child). After
 * `${StyledComponent}.toString()` interpolates to
 * `.<styledComponentId>`, the selector string lands here as
 * `.sc-FooId &` / `.sc-FooId > &`. Optional pseudo on `&`
 * (`${Foo} &:hover`) is captured for composite matching.
 *
 * Direct-children limitation: the chain
 * threads through every styled-component intermediary's ParentContext
 * publish, so a non-styled user component between Foo and the
 * matching descendant breaks the match. Both the dynamic and the
 * static impls publish ParentContext, so a static styled intermediary
 * stays visible to the chain as an ancestor.
 */
function detectCombinator(sel: string): NativeSelectorClass | null {
  if (sel.charCodeAt(0) !== $.DOT) return null;
  // Walk the styled-component id (`sc-` + ident chars + digits).
  let i = 1;
  while (i < sel.length) {
    if (!$.isIdentChar(sel.charCodeAt(i))) break;
    i++;
  }
  if (i === 1) return null;
  const ancestorId = sel.substring(1, i);
  // Whitespace mandatory before the combinator or descendant suffix.
  let j = i;
  let sawSpace = false;
  while (j < sel.length && $.isWS(sel.charCodeAt(j))) {
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
    while (j < sel.length && $.isWS(sel.charCodeAt(j))) j++;
  } else if (ch === 0x2b /* + */) {
    combinator = 'adjacent-sibling';
    j++;
    while (j < sel.length && $.isWS(sel.charCodeAt(j))) j++;
  } else if (ch === 0x7e /* ~ */) {
    combinator = 'general-sibling';
    j++;
    while (j < sel.length && $.isWS(sel.charCodeAt(j))) j++;
  }
  // Must end with `&` optionally followed by a `:pseudo`. Compound
  // forms (e.g. `&[attr]`, `&.cls`) are unsupported here.
  if (sel.charCodeAt(j) !== $.AMPERSAND) return null;
  j++;
  let pseudo: PseudoState | undefined;
  if (j < sel.length) {
    if (sel.charCodeAt(j) !== $.COLON) return null;
    const name = sel.substring(j + 1);
    const p = KNOWN_PSEUDOS.get(name);
    if (!p) return null;
    pseudo = p;
  }
  return pseudo === undefined
    ? { kind: 'combinator', combinator, ancestorId }
    : { kind: 'combinator', combinator, ancestorId, pseudo };
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
function detectIsWhereStates(sel: string): PseudoState[] | null {
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
    const mapped = KNOWN_PSEUDOS.get(name);
    if (!mapped) return null;
    states.push(mapped);
  }
  return states.length > 0 ? states : null;
}

/**
 * Parse one selector made of an attribute-selector chain plus optional trailing pseudo-classes.
 *
 * Supports:
 * - Single: `&[attr]`, `&[attr=value]`
 * - Compound (AND): `&[a][b]`, `&[a=x][b=y]`
 * - Attr + pseudo-classes: `&[attr]:active`, `&[a][b]:focus`, `&[attr]:hover:not(:disabled)`
 *
 * Returns `null` if the selector isn't a pure attribute chain with optional pseudo-classes, so the
 * caller can fall through to the "complex selector" warning instead of silently dropping a
 * partially-parseable rule.
 */
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
  const terms = parsePseudoRun(sel, i, attrs);
  if (terms === null) return null;
  const selector: AttrSelector = { attrs };
  if (terms.length > 0) attachPseudoTerms(selector, terms);
  return selector;
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
  if (raw.length >= 2 && $.isWS(raw.charCodeAt(raw.length - 2))) {
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
    if ($.isWS(c) || c === $.OPEN_PAREN) break;
    i++;
  }
  return prelude.substring(0, i);
}
