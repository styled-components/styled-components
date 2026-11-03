import {
  ASTERISK,
  AT,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  CLOSE_PAREN,
  COLON,
  COMMA,
  DIGIT_0,
  DIGIT_9,
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
  SLASH,
  UPPER_J,
} from '../utils/charCodes';
import {
  AtRuleNode,
  DeclNode,
  KeyframeFrame,
  KeyframesNode,
  Node,
  NodeKind,
  Root,
  RuleNode,
  TemplateValue,
} from './ast';
import { isKeyframesName } from './atRuleNames';
import { stampAtClass, stampRuleClass } from './nativePlan';

/**
 * Index just past a `/* ... *\/` comment that starts at `i` inside a function
 * call. The comment's text stays in the output, but nothing inside it may
 * reach quote tracking (`calc(100% /* don't *\/ - 10px)`). The region also
 * ends at the call's `)`, which is left for the caller, because an unquoted
 * `url(x/*.png)` has no closing `*\/`; a `)` that closes a `(` opened inside
 * the comment (`/* (a) don't *\/`) is comment text.
 */
export function skipParenComment(s: string, i: number, end: number): number {
  let j = i + 2;
  let depth = 0;
  while (j < end) {
    const c = s.charCodeAt(j);
    if (c === OPEN_PAREN) depth++;
    else if (c === CLOSE_PAREN) {
      if (depth === 0) return j;
      depth--;
    } else if (c === ASTERISK && s.charCodeAt(j + 1) === SLASH) return j + 2;
    j++;
  }
  return j;
}

/**
 * Scan `s[start..end]` tracking quote / paren nesting (and CSS `\X`
 * escape: backslash + next byte are consumed atomically). Return the
 * first index whose top-level byte equals `a`, `b`, `c`, or `d`, or
 * `end` if none match. Pass `-1` for unused stop slots.
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
  while (i < end) {
    const ch = s.charCodeAt(i);
    if (quote !== 0) {
      if (ch === BACKSLASH) {
        i += 2;
        continue;
      }
      if (ch === quote) quote = 0;
    } else if (ch === BACKSLASH) {
      i += 2;
      continue;
    } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
      quote = ch;
    } else if (ch === OPEN_PAREN) {
      depth++;
    } else if (ch === CLOSE_PAREN) {
      if (depth > 0) depth--;
    } else if (depth !== 0) {
      if (ch === SLASH && s.charCodeAt(i + 1) === ASTERISK) {
        i = skipParenComment(s, i, end);
        continue;
      }
    } else if (ch === a || ch === b || ch === c || ch === d) {
      return i;
    }
    i++;
  }
  // `end + 1` reports a string still open at the end of the range.
  return quote !== 0 ? end + 1 : end;
}

/** {@link scanQP} that also keeps `[...]` opaque, so `[attr=",b"]` stays whole. */
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
    if (quote !== 0) {
      if (ch === BACKSLASH) {
        i += 2;
        continue;
      }
      if (ch === quote) quote = 0;
    } else if (ch === BACKSLASH) {
      i += 2;
      continue;
    } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
      quote = ch;
    } else if (ch === OPEN_PAREN || ch === OPEN_BRACKET) {
      depth++;
    } else if (ch === CLOSE_PAREN || ch === CLOSE_BRACKET) {
      if (depth > 0) depth--;
    } else if (depth !== 0) {
      if (ch === SLASH && s.charCodeAt(i + 1) === ASTERISK) {
        i = skipParenComment(s, i, end);
        continue;
      }
    } else if (ch === a || ch === b || ch === c || ch === d) {
      return i;
    }
    i++;
  }
  // `end + 1` reports a string still open at the end of the range.
  return quote !== 0 ? end + 1 : end;
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
   * AST is `Root<string>`. Runtime parser behavior is identical;
   * `templateOrString` returns plain strings when no sentinels are
   * present, so the runtime contract is consistent with either type.
   * @internal
   */
  templates?: boolean;
}

/**
 * Parse a CSS string into a parser AST. Comments are expected to be gone
 * already (`normalize` in src/utils/normalize.ts); brace repair happens
 * here, at the root block, so a stray `}` or an unclosed block or string
 * can never close the scope the caller wraps the result in.
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
    templates: !!options?.templates,
    unterminated: false,
  };
  const out = parseBlock(ctx);
  // The statement holding the unterminated block or string is the last one.
  if (ctx.unterminated) out.pop();
  return out;
}

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
  /**
   * Set when the input ended inside a block or a string. The statement
   * holding that block is dropped on the way back to the root, matching
   * what a stray `}` does to its own statement.
   */
  unterminated: boolean;
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
 * `ctx.i`; reaching the end of input first marks the input unterminated.
 */
function skipBlock(ctx: ParseContext): void {
  const css = ctx.css;
  const len = ctx.len;
  let open = 1;
  let i = ctx.i;
  while (open > 0) {
    const j = scanQP(css, i, len, OPEN_BRACE, CLOSE_BRACE, -1, -1);
    if (j >= len) {
      ctx.unterminated = true;
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
    while (i < len) {
      const c = css.charCodeAt(i);
      if (isWS(c) || c === SEMICOLON) i++;
      else break;
    }
    if (i >= len) {
      ctx.i = i;
      break;
    }

    const first = css.charCodeAt(i);

    if (first === CLOSE_BRACE) {
      ctx.i = i + 1;
      if (!root) return out;
      ctx.i = skipStrayClose(css, ctx.i, len);
      continue;
    }

    if (first === AT) {
      ctx.i = i;
      out.push(parseAtRule(ctx));
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
    if (ctx.templates && first === NUL && i + 2 < len && css.charCodeAt(i + 1) === UPPER_J) {
      const interp = readInterpolationSentinel(css, i, len);
      if (interp !== null) {
        out.push({ kind: NodeKind.Interpolation, index: interp.index });
        ctx.i = interp.end;
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
        // string still open (`stop > len`) drops the statement instead.
        if (colon !== -1 && stop === len) pushDecl(ctx, out, start, colon, stop);
        ctx.i = len;
        if (!root) ctx.unterminated = true;
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
    const selectors =
      wrapSelector.indexOf(',') === -1 ? [wrapSelector] : splitTopLevelCommas(wrapSelector, true);
    return [makeRule(selectors, ast)];
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
  if (!ctx.templates) return selectors;
  let out: Array<string | TemplateValue> | null = null;
  for (let i = 0; i < selectors.length; i++) {
    const v = templateOrString(ctx, selectors[i]);
    if (v !== selectors[i]) {
      if (out === null) out = selectors.slice();
      out[i] = v;
    }
  }
  return out ?? selectors;
}

// Embedded-sentinel splitter: matches the `\0I<digits>\0` pattern that
// `interleaveWithSentinels` in source.ts emits for embedded slots. Other
// `\0`-prefixed sequences (e.g. createTheme `\0sc:` tokens) don't match
// and ride through as opaque chunk text. `lastIndex` is reset at every
// call site since the regex is shared across `templateOrString` invocations.
const SENTINEL_RE = /\0I(\d+)\0/g;

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
    while (j < len) {
      const n = s.charCodeAt(j);
      if (isWS(n)) j++;
      else break;
    }
    if (j > comma + 1) {
      out += s.substring(segStart, comma + 1);
      segStart = j;
    }
    i = j;
  }

  // No top-level commas with trailing whitespace → return original string.
  if (segStart === 0) return s;
  if (segStart < len) out += s.substring(segStart, len);
  return out;
}

/** `css.substring(start, end)` with CSS whitespace trimmed from both ends. */
export function trimRange(css: string, start: number, end: number): string {
  while (start < end) {
    const c = css.charCodeAt(start);
    if (isWS(c)) start++;
    else break;
  }
  while (end > start) {
    const c = css.charCodeAt(end - 1);
    if (isWS(c)) end--;
    else break;
  }
  return start < end ? css.substring(start, end) : '';
}

function isNameStop(code: number): boolean {
  return isWS(code) || code === OPEN_BRACE || code === SEMICOLON;
}

function parseAtRule(ctx: ParseContext): AtRuleNode | KeyframesNode {
  const css = ctx.css;
  const len = ctx.len;
  let j = ctx.i + 1;

  // Read the at-rule name up to whitespace, `{`, or `;`.
  while (j < len) {
    const c = css.charCodeAt(j);
    if (isNameStop(c)) break;
    j++;
  }
  const name = css.substring(ctx.i + 1, j);

  // Skip whitespace before prelude
  while (j < len) {
    const c = css.charCodeAt(j);
    if (isWS(c)) j++;
    else break;
  }

  // Scan prelude until `{`, `;`, `}`, or EOF
  const preludeStart = j;
  j = scanQP(css, j, len, OPEN_BRACE, SEMICOLON, CLOSE_BRACE, -1);

  const prelude = trimRange(css, preludeStart, j);
  const nameField = templateOrString(ctx, name);
  const preludeField = templateOrString(ctx, prelude);
  // A `;` ends a bodiless at-rule and is consumed; `}` or EOF ends it and
  // is left for the enclosing block. A string still open at EOF drops the
  // statement.
  const delim = j < len ? css.charCodeAt(j) : -1;
  const hasBody = delim === OPEN_BRACE;
  ctx.i = hasBody || delim === SEMICOLON ? j + 1 : Math.min(j, len);
  if (j > len) ctx.unterminated = true;

  const children = hasBody ? parseNested(ctx) : null;

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
  if (raw.indexOf(',') === -1) {
    if (!trim) return [raw];
    const single = trimRange(raw, 0, raw.length);
    return single ? [single] : [];
  }
  const out: string[] = [];
  const len = raw.length;
  let start = 0;
  let i = 0;
  while (i < len) {
    const comma = scanQPB(raw, i, len, COMMA, -1, -1, -1);
    if (comma >= len) break;
    if (trim) {
      const part = trimRange(raw, start, comma);
      if (part) out.push(part);
    } else {
      out.push(raw.substring(start, comma));
    }
    start = comma + 1;
    i = start;
  }
  if (trim) {
    const tail = trimRange(raw, start, len);
    if (tail) out.push(tail);
  } else {
    out.push(raw.substring(start, len));
  }
  return out;
}

/**
 * Read a `\0J<digits>\0` interpolation sentinel starting at `i` (which must
 * already be the leading NUL). Returns the parsed index and the position
 * just past the trailing NUL, or `null` if the sentinel is malformed.
 */
function readInterpolationSentinel(
  css: string,
  i: number,
  len: number
): { index: number; end: number } | null {
  // Caller already verified css[i] === NUL and css[i+1] is the marker letter.
  let j = i + 2;
  let index = 0;
  let digits = 0;
  while (j < len) {
    const c = css.charCodeAt(j);
    if (c >= DIGIT_0 && c <= DIGIT_9) {
      index = index * 10 + (c - DIGIT_0);
      digits++;
      j++;
      continue;
    }
    break;
  }
  if (digits === 0 || j >= len || css.charCodeAt(j) !== NUL) return null;
  return { index, end: j + 1 };
}
