import {
  AT,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  CLOSE_PAREN,
  COLON,
  COMMA,
  DOUBLE_QUOTE,
  HYPHEN,
  isWS,
  LF,
  NUL,
  OPEN_BRACE,
  OPEN_BRACKET,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
  urlTokenEnd,
} from '../utils/charCodes';
import { warnOnce } from '../utils/warnOnce';
import {
  AtRuleNode,
  DeclNode,
  KeyframeFrame,
  Node,
  NodeKind,
  Root,
  RuleNode,
  TemplateValue,
} from './ast';
import { isKeyframesName } from './atRuleNames';
import { stampAtClass, stampRuleClass } from './nativePlan';

/**
 * Scan `s[start..end]` tracking quote / paren nesting (and CSS `\X`
 * escape: backslash + next byte are consumed atomically). Return the
 * first index whose top-level byte equals `a`, `b`, `c`, or `d`, or
 * `end` if none match, or `end + 1` if a string or paren is still open
 * there. Pass `-1` for unused stop slots.
 *
 * The state is local; callers that resume scanning past a known top-
 * level boundary (`;` `{` `}` `:` `,`) restart with a fresh state
 * without losing correctness, because those bytes always sit at top
 * level by definition.
 *
 * Shared by every block, prelude, and frame scan. The bracket-aware twin
 * {@link scanQPB} serves the comma splitters and emit-web's combinator
 * stripper; it stays a separate loop because the extra bracket tests slow
 * the declaration scan that runs on every value.
 */
export function scanQP(
  s: string,
  start: number,
  end: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  let i = start;
  let depth = 0;
  let quote = 0;
  let escape = -1;
  while (i < end) {
    const ch = s.charCodeAt(i);
    if (ch === BACKSLASH) {
      escape = i;
      i += 2;
      continue;
    }
    if (quote !== 0) {
      if (ch === quote) quote = 0;
    } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
      quote = ch;
    } else if (ch === OPEN_PAREN) {
      // Measured: calling for every `(` costs the declaration scan up to 10%.
      const urlEnd =
        escape === -1 && (s.charCodeAt(i - 1) | 32) !== 108 ? -1 : urlTokenEnd(s, i, end, escape);
      if (urlEnd === -1) depth++;
      else if (urlEnd === end) return end + 1;
      else i = urlEnd;
    } else if (ch === CLOSE_PAREN) {
      if (depth > 0) depth--;
    } else if (depth === 0 && (ch === a || ch === b || ch === c || ch === d)) {
      return i;
    }
    i++;
  }
  return quote !== 0 || depth !== 0 ? end + 1 : end;
}

/** {@link scanQP} that also keeps `[...]` opaque, so `[attr=",b"]` stays whole; no stop returns `end`. */
export function scanQPB(
  s: string,
  start: number,
  end: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  let i = start;
  let depth = 0;
  let quote = 0;
  while (i < end) {
    const ch = s.charCodeAt(i);
    if (ch === BACKSLASH) {
      i += 2;
      continue;
    }
    if (quote !== 0) {
      if (ch === quote) quote = 0;
    } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
      quote = ch;
    } else if (ch === OPEN_PAREN || ch === OPEN_BRACKET) {
      depth++;
    } else if (ch === CLOSE_PAREN || ch === CLOSE_BRACKET) {
      if (depth > 0) depth--;
    } else if (depth === 0 && (ch === a || ch === b || ch === c || ch === d)) {
      return i;
    }
    i++;
  }
  return end;
}

export interface ParseOptions {
  /**
   * When `true`, skips comma-space stripping inside declaration values (e.g.
   * `color 0.2s, blue` stays unchanged). The web path defaults to stripping so
   * emitted shorthand matches the long-standing minified shape; the native
   * transform pipeline sets this to `true` so the tokenizer sees font-family
   * fallback chains intact.
   * @internal
   */
  keepCommaSpaces?: boolean;
  /**
   * Type-system witness: when `true`, the returned AST may contain
   * {@link TemplateValue} fields produced by `\0I` interpolation
   * sentinels in the input (the post-`interleaveWithSentinels` form
   * from {@link parseSource}). Default `false`: no sentinels expected,
   * AST is `Root<string>`. `templateOrString` returns plain strings when
   * no sentinels are present, so input without them parses the same either
   * way. A statement left open around a sentinel adds a bail marker to the root.
   * @internal
   */
  templates?: boolean;
}

/**
 * Parse a CSS string into a parser AST. Comments are expected to be gone
 * already (`normalize` in src/utils/normalize.ts); brace repair happens
 * here, at the root block, so a stray `}` can never close the scope the
 * caller wraps the result in. A block left open at the end of input closes
 * there and keeps its contents; a statement holding a string or paren still
 * open at the end of input is dropped.
 */
export function parse(
  css: string,
  options: ParseOptions & {
    /** @internal */
    templates: true;
  }
): Root<string | TemplateValue>;
export function parse(css: string, options?: ParseOptions): Root<string>;
export function parse(css: string, options?: ParseOptions): Root<string | TemplateValue> {
  const ctx: ParseContext = {
    css,
    depth: 0,
    i: 0,
    keepCommaSpaces: !!options?.keepCommaSpaces,
    len: css.length,
    slotLeftOpen: false,
    templates: !!options?.templates,
  };
  const root = parseBlock(ctx);
  if (ctx.slotLeftOpen) root.push({ kind: NodeKind.Decl, prop: BAIL_FIELD, value: '' });
  return root;
}

/**
 * A field naming a slot past every filled value, so `realize` bails to the
 * string-input compile path.
 */
const BAIL_FIELD: TemplateValue = { chunks: [], slots: [1e9] };

/**
 * A block nested past this depth is skipped with its contents, so input
 * carrying runtime values cannot exhaust the call stack. Authored CSS nests
 * a handful deep.
 */
const MAX_DEPTH = 512;

interface ParseContext {
  css: string;
  /** Block nesting of the block being parsed; 0 is the root block. */
  depth: number;
  i: number;
  keepCommaSpaces: boolean;
  len: number;
  /** A statement holding a sentinel reached the end of input with a string or paren open. */
  slotLeftOpen: boolean;
  /**
   * Runtime gate for sentinel detection. Only `parseSource` (templated
   * tagged-template input) sets this `true`; static-string callers
   * (`toNativeStyles`, `extractBaseDeclPairs`, `parseStringFragment`,
   * any test) leave it `false`. When `false`:
   *
   * - `\0J<n>\0` standalone-sentinel detection in `parseBlock` is
   *   skipped; the bytes pass through as opaque CSS content.
   * - `templateOrString` returns its input unchanged; embedded
   *   `\0I<n>\0` patterns stay as plain string content.
   *
   * Closes the attack surface where untrusted user-supplied
   * interpolation values reach `parse()` via the fallback re-parse path
   * (`buildHashCSS` → `toNativeStyles`) and could be misclassified as
   * sentinels, producing a `TemplateValue` field where the type system
   * promised a `string` and crashing downstream consumers.
   */
  templates: boolean;
}

/**
 * Index just past the text a stray `}` at `i` takes with it: everything up
 * to the next `;` (consumed) or newline (kept).
 */
function skipStrayClose(css: string, i: number, len: number): number {
  while (i < len) {
    const c = css.charCodeAt(i);
    if (c === SEMICOLON) return i + 1;
    if (c === LF) return i;
    i++;
  }
  return i;
}

/** Build a rule node; native builds stamp the bucket classification at parse time. */
function makeRule<F extends string | TemplateValue>(
  selectors: F[],
  children: Node<F>[]
): RuleNode<F> {
  const node: RuleNode<F> = { kind: NodeKind.Rule, selectors, children };
  // Web bundles tree-shake this branch out via `__NATIVE__ === false`.
  if (__NATIVE__) stampRuleClass(node);
  return node;
}

/** Parse the body of a block opened just before `ctx.i`, one level deeper. */
function parseNested(ctx: ParseContext): Node[] {
  if (ctx.depth >= MAX_DEPTH) {
    skipBlock(ctx);
    return [];
  }
  ctx.depth++;
  const out = parseBlock(ctx);
  ctx.depth--;
  return out;
}

/**
 * Move `ctx.i` just past the `}` closing the block whose body starts at
 * `ctx.i`, or to the end of input when the block is left open.
 */
function skipBlock(ctx: ParseContext): void {
  const css = ctx.css;
  const len = ctx.len;
  let open = 1;
  let i = ctx.i;
  while (open > 0) {
    const j = scanQP(css, i, len, OPEN_BRACE, CLOSE_BRACE, -1, -1);
    if (j >= len) {
      i = len;
      break;
    }
    i = j + 1;
    open += css.charCodeAt(j) === OPEN_BRACE ? 1 : -1;
  }
  ctx.i = i;
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
    while (isWS(first) || first === SEMICOLON) first = css.charCodeAt(++i);
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

    // Block-level interpolation sentinel: `\0J<index>\0`. Emitted by
    // `parseSource` when the surrounding template strings put `${expr}` at
    // a statement boundary (after `;` / `{` / `}` or at the start of input).
    // The interpolation's value is filled in at render time as a sibling of
    // Decl/Rule/AtRule. Embedded sentinels (`\0I<index>\0`) ride through in
    // value or selector strings and are resolved at fill time without a node.
    // Gated on `ctx.templates`: untrusted CSS input (rawCSS + filled-value
    // re-parse) must not be allowed to fabricate Interpolation nodes.
    if (ctx.templates && first === NUL) {
      BLOCK_SENTINEL_RE.lastIndex = i;
      const sentinel = BLOCK_SENTINEL_RE.exec(css);
      if (sentinel !== null) {
        out.push({ kind: NodeKind.Interpolation, index: +sentinel[1] });
        ctx.i = BLOCK_SENTINEL_RE.lastIndex;
        continue;
      }
    }

    const start = i;
    let colon = -1;
    // `while (true)` (not `while (i < len)`) so that a COLON found at the
    // very last position can still reach the EOF branch on the next scan.
    while (true) {
      const stop = scanQP(css, i, len, COLON, OPEN_BRACE, SEMICOLON, CLOSE_BRACE);
      if (stop >= len) {
        // EOF reached. Treat as terminal declaration if we saw a colon; a
        // string or paren still open (`stop > len`) drops the statement instead.
        if (stop > len) {
          dropOpenStatement(ctx, start);
        } else if (colon !== -1) {
          pushDecl(ctx, out, start, colon, stop);
        }
        ctx.i = len;
        return out;
      }
      const c = css.charCodeAt(stop);
      if (c === COLON) {
        if (colon === -1) colon = stop;
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
        const children = parseNested(ctx);
        out.push(makeRule(selectorsToTemplate(ctx, selectors), children));
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
 * selector, an at-rule for an `@` prefix, with `@keyframes` reading each
 * root rule as a frame.
 */
export function wrapAst(ast: Root<string>, wrapSelector: string): Root<string> {
  if (wrapSelector.charCodeAt(0) !== AT) {
    return [makeRule(splitTopLevelCommas(wrapSelector, true), ast)];
  }
  const space = wrapSelector.indexOf(' ');
  const name = wrapSelector.substring(1, space === -1 ? wrapSelector.length : space);
  const prelude = space === -1 ? '' : trimRange(wrapSelector, space + 1, wrapSelector.length);
  if (!isKeyframesName(name)) {
    const node: AtRuleNode<string> = { kind: NodeKind.AtRule, name, prelude, children: ast };
    if (__NATIVE__) stampAtClass(node);
    return [node];
  }
  return [{ kind: NodeKind.Keyframes, name, prelude, frames: rulesToFrames(ast) }];
}

/**
 * Read a parsed keyframes body as frames: each rule's selectors are the
 * frame's stops and its declaration children the frame body. Anything
 * else the block parser admits (a bare declaration, a nested rule, a block
 * interpolation) has no meaning in a keyframes body and is dropped.
 */
function rulesToFrames<F>(nodes: Node<F>[]): KeyframeFrame<F>[] {
  const frames: KeyframeFrame<F>[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind !== NodeKind.Rule) continue;
    frames.push({
      stops: node.selectors,
      children: node.children.filter((child): child is DeclNode<F> => child.kind === NodeKind.Decl),
    });
  }
  return frames;
}

function pushDecl(ctx: ParseContext, out: Node[], start: number, colon: number, end: number): void {
  const prop = trimRange(ctx.css, start, colon);
  if (!prop) return;
  const value = normalizeValue(ctx, colon + 1, end);
  // Empty value is invalid for regular properties (drop), but valid for
  // custom properties; `--my-prop: ;` is a legitimate CSS declaration
  // (CSS Custom Properties L1) used by scroll-driven animations and other
  // techniques that rely on the empty value as a "guaranteed-invalid" sentinel.
  if (!value && !isCustomProperty(prop)) return;
  out.push({
    kind: NodeKind.Decl,
    prop: templateOrString(ctx, prop),
    value: templateOrString(ctx, value),
  });
}

/** Apply {@link templateOrString} to each entry; allocate fresh array only if any entry converts. */
function selectorsToTemplate(
  ctx: ParseContext,
  selectors: string[]
): Array<string | TemplateValue> {
  return ctx.templates ? selectors.map(s => templateOrString(ctx, s)) : selectors;
}

// Embedded-sentinel splitter: matches the `\0I<digits>\0` pattern that
// `interleaveWithSentinels` in source.ts emits for embedded slots. Other
// `\0`-prefixed sequences (e.g. createTheme `\0sc:` tokens) don't match
// and ride through as opaque chunk text. `lastIndex` is reset at every
// call site since the regex is shared across `templateOrString` invocations.
const SENTINEL_RE = /\0I(\d+)\0/g;

/** The `\0J<digits>\0` standalone sentinel `interleaveWithSentinels` emits, read at `lastIndex` only. */
const BLOCK_SENTINEL_RE = /\0J(\d+)\0/y;

/**
 * Convert an embedded-sentinel-bearing CSS field (`color: \0I0\0;`-style)
 * into a structural {@link TemplateValue} splice: chunks between sentinels
 * + parallel slot indices. Strings without `\0I` sentinels return as-is
 * (the fast path; most fields don't carry interpolations).
 *
 * Other `\0`-prefixed sequences (notably the createTheme.native.ts
 * `\0sc:` token namespace) ride through opaquely; they're preserved in
 * chunks and never become slot references.
 */
function templateOrString(ctx: ParseContext, s: string): string | TemplateValue {
  if (!ctx.templates || s.indexOf('\0') === -1) return s;
  const chunks: string[] = [];
  const slots: number[] = [];
  let last = 0;
  SENTINEL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SENTINEL_RE.exec(s)) !== null) {
    chunks.push(s.substring(last, m.index));
    slots.push(+m[1]);
    last = m.index + m[0].length;
  }
  if (slots.length === 0) return s;
  chunks.push(s.substring(last));
  return { chunks, slots };
}

/** A CSS custom property starts with `--` (two leading hyphens). */
export function isCustomProperty(prop: string): boolean {
  return prop.length > 2 && prop.charCodeAt(0) === HYPHEN && prop.charCodeAt(1) === HYPHEN;
}

/**
 * Extract, trim, and comma-normalize a declaration value.
 * Strips whitespace after top-level commas by default for the web emit path.
 * When the context opts out (native path), the raw value is returned so
 * the native transform's tokenizer can parse comma-separated fallback chains.
 */
function normalizeValue(ctx: ParseContext, start: number, end: number): string {
  const slice = trimRange(ctx.css, start, end);
  return ctx.keepCommaSpaces ? slice : stripCommaSpaces(slice);
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
    const comma = scanQPB(s, i, len, COMMA, -1, -1, -1);
    if (comma >= len) break;
    // Look ahead: only commit a segment if there's whitespace to strip.
    let j = comma + 1;
    while (isWS(s.charCodeAt(j))) j++;
    if (j > comma + 1) {
      out += s.substring(segStart, comma + 1);
      segStart = j;
    }
    i = j;
  }

  return out + s.substring(segStart);
}

/** `css.substring(start, end)` with CSS whitespace trimmed from both ends. */
export function trimRange(css: string, start: number, end: number): string {
  while (start < end && isWS(css.charCodeAt(start))) start++;
  while (end > start && isWS(css.charCodeAt(end - 1))) end--;
  return start < end ? css.substring(start, end) : '';
}

/**
 * Leave out a statement whose string or paren is still open at the end of input.
 * A value interpolated into it may close it (`translate(${x}${z ? ', 1px)' : ')'}`),
 * which only the resolved text can show, so that case is decided after resolving.
 */
function dropOpenStatement(ctx: ParseContext, start: number): void {
  if (ctx.templates && ctx.css.indexOf('\0', start) !== -1) {
    ctx.slotLeftOpen = true;
    return;
  }

  if (__DEV__) {
    const text = ctx.css.slice(start, start + 80).trim();
    warnOnce(
      'unclosed-statement',
      `\`${text}\` holds a \`(\` or a quote that never closes, so it and everything after it in the template are dropped. Close the \`(\` or the quote.`,
      text
    );
  }
}

/**
 * Parse the at-rule at `ctx.i`, or return `null` for one that is not a valid
 * rule: a prelude holding a string or paren still open at the end of input, or, at the
 * root block, a stray `}` (which joins the prelude there instead of ending it).
 */
function parseAtRule(ctx: ParseContext): Node | null {
  const css = ctx.css;
  const len = ctx.len;
  const root = ctx.depth === 0;
  let j = ctx.i + 1;

  // Read the at-rule name up to whitespace, `{`, or `;`.
  while (j < len) {
    const c = css.charCodeAt(j);
    if (isWS(c) || c === OPEN_BRACE || c === SEMICOLON) break;
    j++;
  }
  const name = css.substring(ctx.i + 1, j);

  // Skip whitespace before prelude
  while (isWS(css.charCodeAt(j))) j++;

  // Scan prelude until `{`, `;`, `}` (nested blocks only), or EOF
  const preludeStart = j;
  let strayClose = false;
  j = scanQP(css, j, len, OPEN_BRACE, SEMICOLON, CLOSE_BRACE, -1);
  while (root && j < len && css.charCodeAt(j) === CLOSE_BRACE) {
    strayClose = true;
    j = scanQP(css, j + 1, len, OPEN_BRACE, SEMICOLON, CLOSE_BRACE, -1);
  }

  if (j > len) {
    dropOpenStatement(ctx, preludeStart);
    ctx.i = len;
    return null;
  }

  const prelude = trimRange(css, preludeStart, j);
  const nameField = templateOrString(ctx, name);
  const preludeField = templateOrString(ctx, prelude);
  // A `;` ends a bodiless at-rule and is consumed; a nested `}` or EOF ends
  // it and is left for the enclosing block.
  const delim = css.charCodeAt(j);
  const hasBody = delim === OPEN_BRACE;
  ctx.i = hasBody || delim === SEMICOLON ? j + 1 : j;

  const children = hasBody ? parseNested(ctx) : null;
  if (strayClose) return null;

  if (children !== null && isKeyframesName(name)) {
    return {
      kind: NodeKind.Keyframes,
      name: nameField,
      prelude: preludeField,
      frames: rulesToFrames(children),
    };
  }

  const node: AtRuleNode = {
    kind: NodeKind.AtRule,
    name: nameField,
    prelude: preludeField,
    children,
  };
  if (__NATIVE__) stampAtClass(node);
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
 *     the contract for selector cross-product and the `rscPlugin` selector
 *     rewriter where downstream callers expect raw segments.
 */
export function splitTopLevelCommas(raw: string, trim = false): string[] {
  const out: string[] = [];
  const len = raw.length;
  let start = 0;
  while (start <= len) {
    const end = scanQPB(raw, start, len, COMMA, -1, -1, -1);
    const part = trim ? trimRange(raw, start, end) : raw.substring(start, end);
    if (part || !trim) out.push(part);
    start = end + 1;
  }
  return out;
}
