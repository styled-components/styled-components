import {
  ASTERISK,
  AT,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_PAREN,
  COLON,
  CR,
  DOUBLE_QUOTE,
  FF,
  HYPHEN,
  isIdentChar,
  isSpace,
  LF,
  LOWER_A,
  LOWER_L,
  LOWER_Z,
  NUL,
  OPEN_BRACE,
  OPEN_BRACKET,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
  SLASH,
  UPPER_TO_LOWER,
  urlTokenEnd,
} from '../utils/charCodes';
import { normalize } from '../utils/normalize';
import { warnOnce } from '../utils/warnOnce';
import {
  AtRuleNode,
  InterpolationKind,
  InterpolationNode,
  Node,
  NodeKind,
  Root,
  RuleNode,
  TemplateValue,
} from './ast';

/**
 * A block nested past this depth is skipped with its contents, so input
 * carrying runtime values cannot exhaust the call stack. Authored CSS nests
 * a handful deep.
 */
const MAX_DEPTH = 512;

/**
 * The closer each open block of the running {@link scanQPB} waits for; a scan never
 * reenters. Past its end a write is ignored and a read matches nothing, so deeper
 * blocks never close and the text counts as left open.
 */
const closers = new Uint8Array(MAX_DEPTH);

/** What follows a backslash in a hex escape: 1-6 hex digits and one whitespace (including CRLF). Any other escape is one character (or CRLF). */
const HEX_ESCAPE = /[\da-f]{1,6}(?:\r\n|[ \t\n\r\f])?/iy;

/** A byte that opens a string, block, escape, or comment: `\ " ' ( [ { /`. */
const STRUCT = 1;
/** `:` */
export const STOP_COLON = 2;
/** `;` */
export const STOP_SEMI = 4;
/** `{` */
export const STOP_LBRACE = 8;
/** `}` */
export const STOP_RBRACE = 16;
/** `,` */
export const STOP_COMMA = 32;
/** Space, tab, line feed, carriage return, and form feed. */
export const STOP_WS = 64;
/** `>`, `+`, and `~` */
export const STOP_COMBINATOR = 128;
/** `)` */
export const STOP_RPAREN = 256;
/** `]` */
export const STOP_RBRACKET = 512;

/** The {@link scanQPB} bits of each ASCII byte; a byte past 127 holds none. */
const BYTE_BITS = new Uint16Array(128);
/** Characters for bits `1 << 0` (`STRUCT`) through `1 << 9` (`STOP_RBRACKET`). */
const BIT_CHARS = ['\\"\'([{/', ':', ';', '{', '}', ',', ' \t\n\r\f', '>+~', ')', ']'];
for (let b = 0; b < BIT_CHARS.length; b++) {
  const chars = BIT_CHARS[b];
  for (let i = 0; i < chars.length; i++) BYTE_BITS[chars.charCodeAt(i)] |= 1 << b;
}

/** A pseudo-element at its colon: `::`, or one of the Level 1 and 2 names a browser still reads after one colon. */
export const PSEUDO_ELEMENT = /:(?::|(?:before|after|first-line|first-letter)(?![\w-]))/iy;

/**
 * Scan `s[start..end]` tracking strings, escapes, url tokens, and `(`, `[`, and `{`
 * as blocks only their own closer ends, so `[attr=",b"]` stays whole and the `)` in
 * `[)` closes nothing. Return the first index whose top-level byte holds a bit of
 * `stopMask` (the `STOP_*` flags), or `end` if none match, or `end + 1` if the text is
 * left open there: a string or block still open, a newline ending a string, an unpaired
 * backslash at the end, a `/*` reaching the scan, or blocks nested past {@link MAX_DEPTH}.
 *
 * The state is local; callers that resume scanning past a known top-level boundary
 * (`;` `{` `}` `:` `,`) restart with a fresh state without losing correctness, because
 * those bytes always sit at top level by definition.
 */
export function scanQPB(s: string, start: number, end: number, stopMask: number): number {
  const topMask = STRUCT | stopMask;
  let i = start;
  let depth = 0;
  let quote = 0;
  let escape = -1;
  while (i < end) {
    if (quote === 0 && depth === 0) {
      // Top level: skip every byte that neither stops the scan nor opens a construct.
      while (i < end) {
        const code = s.charCodeAt(i);
        if (code < 128 && (BYTE_BITS[code] & topMask) !== 0) break;
        i++;
      }
      if (i >= end) break;
    }
    const ch = s.charCodeAt(i);
    if (ch === BACKSLASH) {
      escape = i;
      if (i + 1 < end) {
        HEX_ESCAPE.lastIndex = i + 1;
        if (HEX_ESCAPE.test(s)) {
          i = HEX_ESCAPE.lastIndex > end ? end : HEX_ESCAPE.lastIndex;
          continue;
        }
      }
      i += i + 2 < end && s.charCodeAt(i + 1) === CR && s.charCodeAt(i + 2) === LF ? 3 : 2;
      continue;
    }
    if (quote !== 0) {
      if (ch === quote) quote = 0;
      else if (ch === LF || ch === CR || ch === FF) return end + 1;
    } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
      quote = ch;
    } else if (ch === OPEN_PAREN) {
      // Measured: calling for every `(` costs the declaration scan up to 10%.
      const urlEnd =
        escape === -1 && (s.charCodeAt(i - 1) | UPPER_TO_LOWER) !== LOWER_L
          ? -1
          : urlTokenEnd(s, i, end, escape);
      if (urlEnd === -1) closers[depth++] = CLOSE_PAREN;
      else if (urlEnd === end) return end + 1;
      else i = urlEnd;
    } else if (depth === 0 && (BYTE_BITS[ch] & stopMask) !== 0) {
      return i;
    } else if (ch === OPEN_BRACKET || ch === OPEN_BRACE) {
      // `[` and `{` each sit two codes below their mirror.
      closers[depth++] = ch + 2;
    } else if (depth !== 0 && ch === closers[depth - 1]) {
      depth--;
    } else if (ch === SLASH && i + 1 < end && s.charCodeAt(i + 1) === ASTERISK) {
      return end + 1;
    }
    i++;
  }
  return quote !== 0 || depth !== 0 || i > end ? end + 1 : end;
}

/** The stops of a field: a statement end, or a block edge. */
export const STOP_FIELD = STOP_SEMI | STOP_LBRACE | STOP_RBRACE;

/** What ends a part of a statement: its colon, its end, or its block edges. */
const STOP_STATEMENT = STOP_COLON | STOP_FIELD;

/**
 * False when the text holds a `;`, `{`, or `}` outside a string or block, a comment, or an
 * unclosed string, paren, or bracket, or a top-level byte of `stopMask` such as a
 * selector's `,` (`STOP_COMMA`).
 */
export function staysOneField(text: string, stopMask = 0): boolean {
  return scanQPB(text, 0, text.length, STOP_FIELD | stopMask) === text.length;
}

/**
 * Text this does not match stays one field and holds no `/`, so it holds no comment or
 * server-rendering separator. Measured: on a selector, this test is cheaper than the scan.
 */
export const NEEDS_FIELD_SCAN = /[\\"'([{};/]/;

/**
 * Parse a CSS string into a parser AST. Comments are expected to be gone
 * already (`normalize` in src/utils/normalize.ts); brace repair happens
 * here, at the root block, so a stray `}` can never close the scope the
 * caller wraps the result in. A block left open at the end of input closes
 * there and keeps its contents; a statement holding a string, paren, or
 * bracket still open at the end of input is dropped.
 *
 * When `slotKinds` is passed (the kind of each template interpolation slot,
 * written into the text as `\0<n>\0` sentinels), the parser reads slots into
 * {@link TemplateValue} fields and block-level {@link InterpolationNode}s,
 * setting `InterpolationKind.Standalone` on each slot read as a whole
 * statement. Absent, `\0` is opaque text: untrusted input (a value read on
 * its own, a raw CSS string) cannot fabricate a slot, and the AST is
 * `Root<string>`.
 */
export function parse(css: string, slotKinds: number[]): Root<string | TemplateValue>;
export function parse(css: string): Root<string>;
export function parse(css: string, slotKinds?: number[]): Root<string | TemplateValue> {
  const ctx: ParseContext = {
    css,
    depth: 0,
    dyns: 0,
    i: 0,
    kinds: slotKinds || null,
    len: css.length,
  };
  return parseBlock(ctx);
}

interface ParseContext {
  css: string;
  /** Block nesting of the block being parsed; 0 is the root block. */
  depth: number;
  /**
   * How many nodes read a slot so far. A node is dynamic when this moved while it was built,
   * so a dynamic node marks every ancestor and a dropped node can take its count back.
   */
  dyns: number;
  i: number;
  /** The kind of each slot, or `null` when `\0` is opaque text. */
  kinds: number[] | null;
  len: number;
}

/**
 * Index just past the text a stray `}` at `i` takes with it: everything up
 * to the next `;` outside a string (consumed) or newline (kept).
 */
function skipStrayClose(css: string, i: number, len: number): number {
  let quote = 0;
  while (i < len) {
    const c = css.charCodeAt(i);
    if (c === LF) return i;
    if (c === BACKSLASH) i++;
    else if (quote !== 0) {
      if (c === quote) quote = 0;
    } else if (c === SEMICOLON) return i + 1;
    else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) quote = c;
    i++;
  }
  return i;
}

/** Parse the body of a block opened just before `ctx.i`, one level deeper. */
function parseNested(ctx: ParseContext): Node[] {
  if (ctx.depth >= MAX_DEPTH) {
    let open = 1;
    while (open > 0) {
      const j = scanQPB(ctx.css, ctx.i, ctx.len, STOP_LBRACE | STOP_RBRACE);
      if (j >= ctx.len) {
        ctx.i = ctx.len;
        break;
      }
      ctx.i = j + 1;
      open += ctx.css.charCodeAt(j) === OPEN_BRACE ? 1 : -1;
    }
    return [];
  }
  ctx.depth++;
  const out = parseBlock(ctx);
  ctx.depth--;
  return out;
}

/**
 * Single-pass parse of a CSS block body. At the root block (`ctx.depth`
 * 0) a `}` is stray: its statement and the text up to the next `;` or
 * newline are dropped and parsing resumes, so the scope the caller wraps
 * the result in cannot be closed from inside.
 */
function parseBlock(ctx: ParseContext): Node[] {
  const css = ctx.css;
  const len = ctx.len;
  const root = ctx.depth === 0;
  const out: Node[] = [];

  while (ctx.i < len) {
    // Skip leading whitespace and stray semicolons
    let i = ctx.i;
    let first = css.charCodeAt(i);
    while (isSpace(first) || first === SEMICOLON) first = css.charCodeAt(++i);
    ctx.i = i;
    if (i >= len) break;

    if (first === CLOSE_BRACE) {
      ctx.i = i + 1;
      if (!root) return out;
      ctx.i = skipStrayClose(css, ctx.i, len);
      continue;
    }

    if (first === AT) {
      const atRule = parseAtRule(ctx);
      if (atRule !== null) out.push(atRule);
      continue;
    }

    // A slot opening the statement (`\0<n>\0`) is a block-level interpolation unless the text
    // after it can only continue it. Untrusted input holds no slots (`ctx.kinds === null`).
    const kinds = ctx.kinds;
    if (first === NUL && kinds !== null) {
      i = takeSlots(ctx, kinds, out, i);
      if (i === -1) continue;
    }

    const start = i;
    let colon = -1;
    let stopMask = STOP_STATEMENT;
    // `while (true)` (not `while (i < len)`) so that a COLON found at the
    // very last position can still reach the EOF branch on the next scan.
    while (true) {
      const stop = scanQPB(css, i, len, stopMask);
      if (stop >= len) {
        // EOF reached. Treat as terminal declaration if we saw a colon; a string,
        // paren, or bracket still open (`stop > len`) drops the statement instead.
        if (stop > len) {
          if (__DEV__) warnOpenStatement(ctx, start);
        } else if (colon !== -1) {
          pushDecl(ctx, out, start, colon, stop);
        }
        ctx.i = len;
        return out;
      }
      const c = css.charCodeAt(stop);
      if (c === COLON) {
        if (colon === -1) {
          colon = stop;
          // Custom property values may contain balanced `{...}` blocks; once the
          // property name is confirmed as `--*`, let `scanQPB` consume `{...}` as
          // an embedded block instead of treating `{` as a nested rule opener.
          if (css.charCodeAt(start) === HYPHEN && css.charCodeAt(start + 1) === HYPHEN) {
            const rawProp = trimRange(css, start, colon);
            if (
              isCustomProperty(
                ctx.kinds !== null && rawProp.indexOf('\0') !== -1
                  ? rawProp.replace(SENTINEL_RE, 'x')
                  : rawProp
              )
            ) {
              stopMask = STOP_SEMI | STOP_RBRACE;
            }
          }
        }
        i = stop + 1;
        continue;
      }
      if (c === OPEN_BRACE) {
        const selectorText = trimRange(css, start, stop);
        const selectors =
          selectorText.indexOf(',') === -1
            ? [selectorText]
            : splitTopLevelCommas(selectorText, true);
        ctx.i = stop + 1;
        const dyns = ctx.dyns;
        const children = parseNested(ctx);
        const fields =
          ctx.kinds !== null ? selectors.map(s => templateOrString(ctx, s)) : selectors;
        const rule: RuleNode = { kind: NodeKind.Rule, selectors: fields, children };
        if (ctx.dyns !== dyns) rule.dyn = true;
        out.push(rule);
        break;
      }
      // c is SEMICOLON or CLOSE_BRACE
      if (c === CLOSE_BRACE && root) {
        ctx.i = skipStrayClose(css, stop + 1, len);
        break;
      }
      if (colon !== -1) pushDecl(ctx, out, start, colon, stop);
      ctx.i = stop + 1;
      if (c === CLOSE_BRACE) return out;
      break;
    }
  }

  return out;
}

/**
 * Wrap a root AST in the block `Compiler.compile` promises: a rule for a
 * selector, an at-rule for an `@` prefix. An `@keyframes` wrapper reads each
 * root rule as a frame.
 */
export function wrapAst(ast: Root<string>, wrapSelector: string): Root<string> {
  if (wrapSelector.charCodeAt(0) !== AT) {
    return [
      { kind: NodeKind.Rule, selectors: splitTopLevelCommas(wrapSelector, true), children: ast },
    ];
  }
  const space = wrapSelector.indexOf(' ');
  const name = wrapSelector.substring(1, space === -1 ? wrapSelector.length : space);
  const prelude = space === -1 ? '' : trimRange(wrapSelector, space + 1);
  return [{ kind: NodeKind.AtRule, name, prelude, children: ast }];
}

function pushDecl(ctx: ParseContext, out: Node[], start: number, colon: number, end: number): void {
  const prop = trimRange(ctx.css, start, colon);
  if (!prop) return;
  const custom = isCustomProperty(prop);
  const mayBeCustom =
    custom ||
    (ctx.kinds !== null &&
      (prop.charCodeAt(0) === NUL || (prop.charCodeAt(0) === HYPHEN && prop.indexOf('\0') !== -1)));
  const rawValue = trimRange(ctx.css, colon + 1, end);
  // Web strips whitespace after top-level commas on standard properties; custom properties and
  // native keep the value whole (native drops `stripCommaSpaces` from its bundle).
  const value = __NATIVE__ || mayBeCustom ? rawValue : stripCommaSpaces(rawValue);
  // Empty values are invalid for standard properties, but valid for custom properties (`--x: ;`).
  if (!value && !mayBeCustom) return;
  const dyns = ctx.dyns;
  const propField = templateOrString(ctx, prop);
  const valueField = templateOrString(ctx, value);
  // Match static DeclNode property order (kind, prop, value, then dyn) for V8 hidden-class sharing.
  out.push(
    ctx.dyns === dyns
      ? { kind: NodeKind.Decl, prop: propField, value: valueField }
      : { kind: NodeKind.Decl, prop: propField, value: valueField, dyn: true }
  );
}

/**
 * The `\0<digits>\0` slot sentinel `parseSource` writes. Other `\0`-prefixed
 * sequences (e.g. createTheme `\0sc:` tokens) don't match and ride through as opaque text.
 * `lastIndex` is reset at every call site since the regex is shared.
 */
export const SENTINEL_RE = /\0(\d+)\0/g;

/** One slot sentinel, read at `lastIndex` only. */
const SLOT_RE = /\0(\d+)\0/y;

/**
 * Characters after a slot that keep it in the same statement: indices 0..6 (`{&:>+~,`) join
 * whether spaced or adjacent; indices 7..10 (`*.#[`) join only when adjacent to the slot.
 */
const JOINS = '{&:>+~,*.#[';
const SPACED_JOIN_COUNT = 7;

/**
 * Read the slots opening the statement at `from`. Each but the last is a whole statement. The
 * last is one too unless the text after it can only continue it (`${Child}.x {`, `${Child} {`);
 * then it starts the statement the caller reads on, so the slot lands in a selector. A slot past
 * the template's own (an authored `\0999\0`) is text. Returns where the caller reads on from, or
 * -1 when the slots took the whole statement and `ctx.i` is set.
 */
function takeSlots(ctx: ParseContext, kinds: number[], out: Node[], from: number): number {
  const css = ctx.css;
  let at = from;
  let last = -1;
  let lastIndex = 0;
  let end = from;
  let next = from;
  for (;;) {
    SLOT_RE.lastIndex = at;
    const match = SLOT_RE.exec(css);
    if (match === null) break;
    const index = +match[1];
    if (index >= kinds.length) break;

    if (last !== -1) pushSlot(ctx, kinds, out, lastIndex, false);
    last = at;
    lastIndex = index;
    end = SLOT_RE.lastIndex;
    next = end;
    while (isSpace(css.charCodeAt(next))) next++;
    if (css.charCodeAt(next) !== NUL) break;
    at = next;
  }
  if (last === -1) return from;

  const join = next < ctx.len ? JOINS.indexOf(css[next]) : -1;
  if (join !== -1 && (next === end || join < SPACED_JOIN_COUNT)) return last;
  pushSlot(ctx, kinds, out, lastIndex, css.charCodeAt(next) === SEMICOLON);
  ctx.i = end;
  return -1;
}

function pushSlot(
  ctx: ParseContext,
  kinds: number[],
  out: Node[],
  index: number,
  ended: boolean
): void {
  kinds[index] |= InterpolationKind.Standalone;
  const node: InterpolationNode = { kind: NodeKind.Interpolation, index, dyn: true };
  // A `;` follows the slot, so it cannot start the rule after it.
  if (ended) node.ended = true;
  ctx.dyns++;
  out.push(node);
}

/**
 * Convert a sentinel-bearing CSS field (`color: \0<n>\0;`-style) into a structural
 * {@link TemplateValue} splice: chunks between sentinels + parallel slot indices. Strings
 * without sentinels return as-is (the fast path; most fields don't carry interpolations).
 * A sentinel naming a slot the template lacks stays text.
 */
function templateOrString(ctx: ParseContext, s: string): string | TemplateValue {
  const kinds = ctx.kinds;
  if (kinds === null || s.indexOf('\0') === -1) return s;
  const chunks: string[] = [];
  const slots: number[] = [];
  let last = 0;
  SENTINEL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SENTINEL_RE.exec(s)) !== null) {
    const slot = +m[1];
    if (slot >= kinds.length) continue;
    chunks.push(s.substring(last, m.index));
    slots.push(slot);
    last = m.index + m[0].length;
  }
  if (slots.length === 0) return s;
  chunks.push(s.substring(last));
  ctx.dyns++;
  return { chunks, slots };
}

const DASHED_IDENT =
  /^--[\w\x80-\uffff-]*(?:\\(?:[\da-f]{1,6}(?:\r\n|[ \t\n\r\f])|[^\r\n\f])[\w\x80-\uffff-]*)*$/i;

/** A CSS custom property name is a `<dashed-ident>` (excluding `--`). */
export function isCustomProperty(prop: string): boolean {
  return (
    prop.length > 2 &&
    prop.charCodeAt(0) === HYPHEN &&
    prop.charCodeAt(1) === HYPHEN &&
    DASHED_IDENT.test(prop)
  );
}

/**
 * Strip whitespace after top-level commas (outside parens/brackets/strings).
 * Optimistic: defer the substring + concat work until we actually find
 * whitespace to strip after a top-level comma. Inputs whose commas are
 * already tight (`a,b,c`);common in compact author CSS;pay only the
 * single charCode walk and return unchanged. Exported for the emitter's
 * at-rule prelude handling.
 */
export function stripCommaSpaces(s: string): string {
  if (s.indexOf(',') === -1) return s;
  const len = s.length;
  let out = '';
  let segStart = 0;
  let i = 0;
  while (i < len) {
    const comma = scanQPB(s, i, len, STOP_COMMA);
    if (comma >= len) break;
    // Look ahead: only commit a segment if there's whitespace to strip.
    let j = comma + 1;
    while (isSpace(s.charCodeAt(j))) j++;
    if (j > comma + 1) {
      out += s.substring(segStart, comma + 1);
      segStart = j;
    }
    i = j;
  }

  return out + s.substring(segStart);
}

/**
 * `css.substring(start, end)` with CSS whitespace trimmed from both ends. An
 * escaped space stays: without it the text would end in a bare backslash.
 */
export function trimRange(css: string, start = 0, end = css.length): string {
  while (start < end && isSpace(css.charCodeAt(start))) start++;
  while (end > start && isSpace(css.charCodeAt(end - 1))) {
    if (end - 2 >= start && css.charCodeAt(end - 2) === BACKSLASH) {
      let bs = end - 2;
      while (bs > start && css.charCodeAt(bs - 1) === BACKSLASH) bs--;
      if (((end - 1 - bs) & 1) === 1) break;
    }
    end--;
  }
  return start < end ? css.substring(start, end) : '';
}

/**
 * A runtime value up to the end of its whole statements, comments gone: it stops before a `}`
 * the value did not open, a `{` it never closes, or a statement left open, so it can hold
 * declarations and whole rules and nothing that reaches past itself.
 */
export function wholeStatements(value: string): string {
  const text = normalize(value);
  const len = text.length;
  let depth = 0;
  let i = 0;
  let whole = 0;
  while (true) {
    const stop = scanQPB(text, i, len, STOP_FIELD);
    if (stop === len && depth === 0) return text;
    if (stop >= len) break;

    i = stop + 1;
    const code = text.charCodeAt(stop);
    if (code === OPEN_BRACE) {
      depth++;
    } else if (code === CLOSE_BRACE && depth-- === 0) {
      break;
    } else if (depth === 0) {
      whole = i;
    }
  }

  if (__DEV__) {
    const dropped = text.slice(whole, whole + 80).trim();
    warnOnce(
      'value-left-open',
      `An interpolated value holds an unmatched brace or leaves a string, paren, or bracket open, so "${dropped}" was dropped. Write a value as \`property: value;\` declarations or whole \`selector { ... }\` rules.`,
      dropped
    );
  }

  return text.slice(0, whole);
}

/** Name a statement left out for a string, paren, or bracket still open at the end of input. */
function warnOpenStatement(ctx: ParseContext, start: number): void {
  const text = ctx.css
    .slice(start, start + 80)
    .trim()
    .replace(SENTINEL_RE, '${...}');
  warnOnce(
    'unclosed-statement',
    `\`${text}\` holds a \`(\`, a \`[\`, or a quote that never closes, so it and everything after it in that text are dropped. Close it, and keep a string on one line.`,
    text
  );
}

/** A name that starts an identifier; `\0` opens a slot, whose value is unknown here. */
const AT_NAME_RE = /^(?:-?(?:[a-z_\u0080-￿\0]|\\[^\n\r\f])|--)/i;

/**
 * Parse the at-rule at `ctx.i`, or return `null` for one that is not a valid
 * rule: a name that cannot start an identifier, a prelude holding a string, paren,
 * or bracket still open at the end of input, or, at the root block, a stray `}`
 * (which joins the prelude there instead of ending it).
 */
function parseAtRule(ctx: ParseContext): Node | null {
  const css = ctx.css;
  const len = ctx.len;
  const root = ctx.depth === 0;
  const nameStart = ctx.i + 1;
  let j = nameStart;

  // Read the at-rule name while it stays a CSS identifier or template slot.
  while (j < len) {
    const c = css.charCodeAt(j);
    if (c === BACKSLASH) {
      if (j + 1 >= len) break;
      const next = css.charCodeAt(j + 1);
      if (next === LF || next === CR || next === FF) break;
      j += 2;
      continue;
    }
    if (isIdentChar(c) || c >= 0x80 || c === NUL) {
      j++;
      continue;
    }
    break;
  }
  const name = css.substring(nameStart, j);

  // Skip whitespace before prelude
  while (isSpace(css.charCodeAt(j))) j++;

  // Scan until `{`, `;`, `}` (nested blocks only), or EOF. The scan starts at the name so
  // `@url(` stays an at-keyword rather than a url token, and the prelude begins after `name`.
  const preludeStart = j;
  // An ASCII letter starts every common name; the regex judges the rest.
  const lead = name.charCodeAt(0) | UPPER_TO_LOWER;
  let invalid = (lead < LOWER_A || lead > LOWER_Z) && !AT_NAME_RE.test(name);
  j = scanQPB(css, nameStart, len, STOP_FIELD);
  while (root && j < len && css.charCodeAt(j) === CLOSE_BRACE) {
    invalid = true;
    j = scanQPB(css, j + 1, len, STOP_FIELD);
  }

  if (j > len) {
    if (__DEV__) warnOpenStatement(ctx, preludeStart);
    ctx.i = len;
    return null;
  }

  const dyns = ctx.dyns;
  const prelude = trimRange(css, preludeStart, j);
  const nameField = templateOrString(ctx, name);
  const preludeField = templateOrString(ctx, prelude);
  // A `;` ends a bodiless at-rule and is consumed; a nested `}` or EOF ends
  // it and is left for the enclosing block.
  const delim = css.charCodeAt(j);
  const hasBody = delim === OPEN_BRACE;
  ctx.i = hasBody || delim === SEMICOLON ? j + 1 : j;

  const children = hasBody ? parseNested(ctx) : null;
  if (invalid) {
    // A dropped at-rule makes nothing above it dynamic.
    ctx.dyns = dyns;
    return null;
  }

  const node: AtRuleNode = {
    kind: NodeKind.AtRule,
    name: nameField,
    prelude: preludeField,
    children,
  };
  if (ctx.dyns !== dyns) node.dyn = true;
  return node;
}

/**
 * Split a comma-separated list at the top level only, preserving commas
 * inside `:is()`, `:where()`, `:has()`, `[attr="a,b"]`, quoted strings,
 * and any other paren/bracket-bounded context. Used in two modes:
 *
 *   - parser-side (`trim=true`): each part is trimmed and empty parts are
 *     dropped; matches the contract for selectors and keyframe stops.
 *   - emit-side (`trim=false`): substrings preserved verbatim; matches
 *     the contract for selector cross-product and selector-rewriting plugins
 *     where downstream callers expect raw segments.
 */
export function splitTopLevelCommas(raw: string, trim = false): string[] {
  const out: string[] = [];
  const len = raw.length;
  let start = 0;
  while (start <= len) {
    const stop = scanQPB(raw, start, len, STOP_COMMA);
    const end = stop > len ? len : stop;
    const part = trim ? trimRange(raw, start, end) : raw.substring(start, end);
    if (part || !trim) out.push(part);
    start = end + 1;
  }
  return out;
}
