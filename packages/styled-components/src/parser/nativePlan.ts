import { KNOWN_PSEUDOS } from '../native/pseudoBits';
import * as $ from '../utils/charCodes';
import {
  AttrOperator,
  AttrSelector,
  ConditionalAttr,
  NativeAtClass,
  NativeRuleClass,
  NativeSelectorClass,
  NthOfBranch,
  NthSpec,
  PseudoState,
  PseudoTerm,
} from './ast';
import { isKeyframesName } from './atRuleNames';
import { scanQPB, STOP_RBRACKET, STOP_RPAREN } from './parser';

/**
 * Compute the native classification for an AtRule by its `name` + `prelude`.
 * Cached lazily per static AtRuleNode inside `compileNative.ts`.
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
 * Classify a rule's filled selectors string array. Cached lazily per static
 * RuleNode inside `compileNative.ts`. A selector list is classified member by
 * member, so one unsupported member leaves the others usable.
 */
export function classifyRuleNow(selectors: string[]): NativeRuleClass {
  if (selectors.length === 1) return classifySelector(selectors[0]);
  const members: NativeSelectorClass[] = [];
  for (let i = 0; i < selectors.length; i++) members.push(classifySelector(selectors[i]));
  return { kind: 'list', members };
}

function classifySelector(sel: string): NativeSelectorClass {
  const c0 = sel.charCodeAt(0);
  if (c0 === $.DOT) {
    // `${Foo} &` / `${Foo} > &` / `+ &` / `~ &`: `.sc-FooId` after `${StyledComponent}.toString()`.
    return detectCombinator(sel) ?? { kind: 'unsupported' };
  }
  if (c0 !== $.AMPERSAND) return { kind: 'unsupported' };
  const c1 = sel.charCodeAt(1);
  if (c1 === $.OPEN_BRACKET) {
    const attrSel = parseAttrChain(sel);
    return attrSel === null ? { kind: 'unsupported' } : { kind: 'attr', selectors: [attrSel] };
  }
  if (c1 !== $.COLON) return { kind: 'unsupported' };
  const pseudoCls = detectPseudoTerms(sel);
  if (pseudoCls !== null) return pseudoCls;
  const fanOut = detectIsWhereStates(sel);
  if (fanOut) return { kind: 'pseudoFanOut', pseudos: fanOut };
  // Sibling-position pseudo-classes, then `&:has(<simple>)`.
  return detectNthChild(sel) ?? detectHas(sel) ?? { kind: 'unsupported' };
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
    const end = findClosing(inner, 0, STOP_RBRACKET);
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
/** Anchored with no overlapping quantifiers, so matching is linear. Groups: integer | sign, digits, `n`, b sign, b digits. */
const AN_PLUS_B_RE = /^(?:([+-]?\d+)|([+-]?)(\d*)\s*n\s*(?:([+-])\s*(\d+))?)$/;

function parseAnPlusB(raw: string): { a: number; b: number } | null {
  const s = raw.trim().toLowerCase();
  if (s === 'odd') return { a: 2, b: 1 };
  if (s === 'even') return { a: 2, b: 0 };
  const m = AN_PLUS_B_RE.exec(s);
  if (m === null) return null;
  if (m[1] !== undefined) return { a: 0, b: parseInt(m[1], 10) };
  const sign = m[2];
  const a = m[3] === '' ? (sign === '-' ? -1 : 1) : parseInt(sign + m[3], 10);
  return { a, b: m[4] === undefined ? 0 : parseInt(m[4] + m[5], 10) };
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

const NTH_KEYWORDS: ReadonlySet<string> = new Set([
  'first-child',
  'last-child',
  'only-child',
  'first-of-type',
  'last-of-type',
  'only-of-type',
]);
const NTH_FUNCTIONS: ReadonlySet<string> = new Set([
  'nth-child',
  'nth-last-child',
  'nth-of-type',
  'nth-last-of-type',
]);

/**
 * `&:first-child` / `&:last-child` / `&:only-child` / `&:nth-child(...)`
 * / `&:nth-last-child(...)` / `&:nth-of-type(...)` /
 * `&:nth-last-of-type(...)` and optional trailing pseudo-state.
 */
function detectNthChild(sel: string): NativeSelectorClass | null {
  // Caller verified `&:`. The nth pseudo ends at its closing paren, or at the next `:` when it
  // takes no argument; whatever follows is the run of trailing pseudo-classes (`&:first-child:hover:not(:disabled)`).
  let nameEnd = 2;
  while (nameEnd < sel.length) {
    const c = sel.charCodeAt(nameEnd);
    if (c === $.COLON || c === $.OPEN_PAREN) break;
    nameEnd++;
  }
  const name = sel.substring(2, nameEnd);
  const hasParen = sel.charCodeAt(nameEnd) === $.OPEN_PAREN;
  if (!(hasParen ? NTH_FUNCTIONS : NTH_KEYWORDS).has(name)) return null;

  let headEnd = nameEnd;
  if (hasParen) {
    const closeParen = findClosing(sel, nameEnd, STOP_RPAREN);
    if (closeParen === -1) return null;
    headEnd = closeParen + 1;
  }

  let tailTerms: PseudoTerm[] | null = null;
  if (headEnd < sel.length) {
    const tailAttrs: ConditionalAttr[] = [];
    tailTerms = parsePseudoRun(sel, headEnd, tailAttrs);
    // A structural entry has no attribute slot, so a negated attribute after the head stays unsupported.
    if (tailTerms === null || tailAttrs.length > 0 || tailTerms.length === 0) return null;
  }

  const ofType = name.endsWith('type');
  const spec: NthSpec = { a: 0, b: 1, fromEnd: name.indexOf('last') !== -1, ofType };
  if (!hasParen) {
    if (name.startsWith('only')) spec.onlyChild = true;
  } else {
    const parsed = parseNthInner(sel.substring(nameEnd + 1, headEnd - 1), !ofType);
    if (parsed === null) return null;
    spec.a = parsed.a;
    spec.b = parsed.b;
    if (parsed.of !== undefined) spec.of = parsed.of;
  }
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

/** Find the matching closing delimiter for the opener at `start`; quote- and escape-aware. */
function findClosing(s: string, start: number, stopMask: number): number {
  const end = scanQPB(s, start + 1, s.length, stopMask);
  return end < s.length ? end : -1;
}

/**
 * The terms of `&:hover`, `&:not(:hover)`, `&:hover:not(:disabled)`: one or more known pseudo-classes,
 * each optionally wrapped in `:not(...)`. A `:not([attr])` among them (`&:not([x]):hover`,
 * `&:hover:not([x])`) turns the selector into an attribute selector with pseudo-class terms. Null when
 * the selector is anything else; complex arguments (`&:not(:hover, :focus)`, `&:not(.foo .bar)`) are
 * null too.
 */
function detectPseudoTerms(sel: string): NativeSelectorClass | null {
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
      const close = findClosing(sel, i + 4, STOP_RPAREN);
      if (close === -1) return null;
      const inner = sel.substring(i + 5, close).trim();
      i = close + 1;
      if (inner.charCodeAt(0) === $.OPEN_BRACKET) {
        if (findClosing(inner, 0, STOP_RBRACKET) !== inner.length - 1) return null;
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
  // Caller verified leading `.`. Walk the styled-component id (`sc-` + ident chars + digits).
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
  let innerStart: number;
  if (sel.startsWith('is(', 2)) innerStart = 5;
  else if (sel.startsWith('where(', 2)) innerStart = 8;
  else return null;

  const closeParen = findClosing(sel, innerStart - 1, STOP_RPAREN);
  if (closeParen !== sel.length - 1) return null;
  const inner = sel.substring(innerStart, closeParen);

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
  const attrs: ConditionalAttr[] = [];
  let i = 1;
  while (i < sel.length && sel.charCodeAt(i) === $.OPEN_BRACKET) {
    const end = findClosing(sel, i, STOP_RBRACKET);
    if (end === -1) return null;
    const attr = parseAttrInner(sel.substring(i + 1, end));
    if (attr === null) return null;
    attrs.push(attr);
    i = end + 1;
  }
  if (i === sel.length) return { attrs };
  const terms = parsePseudoRun(sel, i, attrs);
  if (terms === null) return null;
  const selector: AttrSelector = { attrs };
  if (terms.length > 0) attachPseudoTerms(selector, terms);
  return selector;
}

const ATTR_OPERATORS: Record<string, AttrOperator | undefined> = {
  '~': '~=',
  '|': '|=',
  '^': '^=',
  $: '$=',
  '*': '*=',
};

function parseAttrInner(inner: string): ConditionalAttr | null {
  const eqIdx = inner.indexOf('=');
  if (eqIdx === -1) {
    const name = inner.trim();
    return isAttrName(name) ? { name } : null;
  }
  // Operator detection. The operator char sits immediately before `=`.
  // `=` alone is the default exact-match.
  let operator: AttrOperator = '=';
  let nameEnd = eqIdx;
  if (eqIdx > 0) {
    const op = ATTR_OPERATORS[inner[eqIdx - 1]];
    if (op !== undefined) {
      nameEnd = eqIdx - 1;
      operator = op;
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
    if (!$.isIdentChar(c) && c !== $.COLON) return false;
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
