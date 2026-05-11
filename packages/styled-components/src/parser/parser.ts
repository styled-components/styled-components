import {
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
  NUL,
  OPEN_BRACE,
  OPEN_BRACKET,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
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
import { stampAtClass, stampRuleClass } from './nativePlan';

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
 * Shared by `parseBlock`, `parseAtRule`, `parseKeyframesBody`, and
 * `parseFrameDecls` so the common quote/paren/escape state machine
 * ships once instead of four times.
 */
function scanQP(
  s: string,
  start: number,
  end: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  let i = start;
  let paren = 0;
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
      paren++;
    } else if (ch === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (paren === 0 && (ch === a || ch === b || ch === c || ch === d)) {
      return i;
    }
    i++;
  }
  return end;
}

/**
 * Bracket-aware variant of {@link scanQP}. Shared by `splitTopLevelCommas`,
 * `stripCommaSpaces` (selector-side comma normalization), and emit-web's
 * `stripCombinatorSpaces` so `[attr=",b"]` stays opaque to the outer
 * scan.
 */
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
  let paren = 0;
  let bracket = 0;
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
      paren++;
    } else if (ch === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (ch === OPEN_BRACKET) {
      bracket++;
    } else if (ch === CLOSE_BRACKET) {
      if (bracket > 0) bracket--;
    } else if (paren === 0 && bracket === 0 && (ch === a || ch === b || ch === c || ch === d)) {
      return i;
    }
    i++;
  }
  return end;
}

export interface ParseOptions {
  /**
   * When `true`, skips the stylis-parity comma-space stripping inside
   * declaration values (e.g. `color 0.2s, blue` stays unchanged).
   * The web emitter relies on the default stripping for byte parity with
   * stylis; the native transform pipeline sets this to `true` so the
   * tokenizer sees font-family fallback chains intact.
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
   */
  templates?: boolean;
}

/**
 * Parse a preprocessed CSS string into a parser AST.
 *
 * Assumes the input has already passed through `normalize` from
 * src/utils/normalize.ts, which normalizes braces, strips line comments,
 * and handles unbalanced strings. This parser is STRICT; it assumes
 * well-formed input.
 */
export function parse(
  css: string,
  options: ParseOptions & { templates: true }
): Root<string | TemplateValue>;
export function parse(css: string, options?: ParseOptions): Root<string>;
export function parse(css: string, options?: ParseOptions): Root<string | TemplateValue> {
  const ctx: ParseContext = {
    css,
    len: css.length,
    i: 0,
    keepCommaSpaces: !!options?.keepCommaSpaces,
    templates: !!options?.templates,
  };
  return parseBlock(ctx);
}

interface ParseContext {
  css: string;
  len: number;
  i: number;
  keepCommaSpaces: boolean;
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

/** Single-pass parse of a CSS block body. */
function parseBlock(ctx: ParseContext): Node[] {
  const css = ctx.css;
  const len = ctx.len;
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
      return out;
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
        // EOF reached. Treat as terminal declaration if we saw a colon.
        if (colon !== -1) pushDecl(ctx, out, start, colon, stop);
        ctx.i = stop;
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
        const children = parseBlock(ctx);
        const node: RuleNode = {
          kind: NodeKind.Rule,
          selectors: selectorsToTemplate(ctx, selectors),
          children,
        };
        // Native build only: stamp parse-time classification for the
        // bucket router in `compileNative.ts`. Web bundles tree-shake
        // this branch out via `__NATIVE__ === false` literal replace.
        if (__NATIVE__) stampRuleClass(node);
        out.push(node);
        break;
      }
      // c is SEMICOLON or CLOSE_BRACE
      if (colon !== -1) pushDecl(ctx, out, start, colon, stop);
      if (c === CLOSE_BRACE) {
        ctx.i = stop + 1;
        return out;
      }
      ctx.i = stop + 1;
      break;
    }
  }

  return out;
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
 * Extract, trim, and comma-normalize a declaration value in a single pass.
 * Strips whitespace after top-level commas by default to match stylis output.
 * When the context opts out (native path), the raw value is returned so
 * the native transform's tokenizer can parse comma-separated fallback chains.
 */
function normalizeValue(ctx: ParseContext, start: number, end: number): string {
  const css = ctx.css;
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
  if (start >= end) return '';

  const slice = css.substring(start, end);
  if (ctx.keepCommaSpaces || slice.indexOf(',') === -1) return slice;

  return stripCommaSpaces(slice);
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

function trimRange(css: string, start: number, end: number): string {
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

function isKeyframesName(name: string): boolean {
  if (name === 'keyframes') return true;
  // vendor prefixes: -webkit-keyframes, -moz-keyframes, -o-keyframes
  return /^-[a-z]+-keyframes$/.test(name);
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

  if (j >= len) {
    ctx.i = j;
    const node: AtRuleNode = {
      kind: NodeKind.AtRule,
      name: nameField,
      prelude: preludeField,
      children: null,
    };
    if (__NATIVE__) stampAtClass(node);
    return node;
  }

  const delim = css.charCodeAt(j);
  if (delim !== OPEN_BRACE) {
    ctx.i = delim === SEMICOLON ? j + 1 : j;
    const node: AtRuleNode = {
      kind: NodeKind.AtRule,
      name: nameField,
      prelude: preludeField,
      children: null,
    };
    if (__NATIVE__) stampAtClass(node);
    return node;
  }

  ctx.i = j + 1;

  if (isKeyframesName(name)) {
    const frames = parseKeyframesBody(ctx);
    return { kind: NodeKind.Keyframes, name: nameField, prelude: preludeField, frames };
  }

  const children = parseBlock(ctx);
  const node: AtRuleNode = {
    kind: NodeKind.AtRule,
    name: nameField,
    prelude: preludeField,
    children,
  };
  if (__NATIVE__) stampAtClass(node);
  return node;
}

function parseKeyframesBody(ctx: ParseContext): KeyframeFrame[] {
  const css = ctx.css;
  const len = ctx.len;
  const frames: KeyframeFrame[] = [];

  while (ctx.i < len) {
    // Skip whitespace
    while (ctx.i < len) {
      const c = css.charCodeAt(ctx.i);
      if (isWS(c)) ctx.i++;
      else break;
    }
    if (ctx.i >= len) break;

    const c = css.charCodeAt(ctx.i);
    if (c === CLOSE_BRACE) {
      ctx.i++;
      return frames;
    }

    // Scan for `{`
    const start = ctx.i;
    const j = scanQP(css, ctx.i, len, OPEN_BRACE, CLOSE_BRACE, -1, -1);

    if (j >= len || css.charCodeAt(j) !== OPEN_BRACE) {
      ctx.i = j + 1;
      continue;
    }

    const stopsText = trimRange(css, start, j);
    const stopsRaw =
      stopsText.indexOf(',') === -1 ? [stopsText] : splitTopLevelCommas(stopsText, true);
    ctx.i = j + 1;

    const children = parseFrameDecls(ctx);
    frames.push({ stops: selectorsToTemplate(ctx, stopsRaw), children });
  }

  return frames;
}

function parseFrameDecls(ctx: ParseContext): DeclNode[] {
  const css = ctx.css;
  const len = ctx.len;
  const decls: DeclNode[] = [];

  while (ctx.i < len) {
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

    if (css.charCodeAt(i) === CLOSE_BRACE) {
      ctx.i = i + 1;
      return decls;
    }

    const start = i;
    let colon = -1;
    // `while (true)` (not `while (i < len)`) so that a COLON found at the
    // very last position can still reach the EOF branch on the next scan.
    while (true) {
      const stop = scanQP(css, i, len, COLON, SEMICOLON, CLOSE_BRACE, -1);
      if (stop >= len) {
        if (colon !== -1) pushFrameDecl(ctx, decls, start, colon, stop);
        ctx.i = stop;
        return decls;
      }
      const c = css.charCodeAt(stop);
      if (c === COLON) {
        if (colon === -1) colon = stop;
        i = stop + 1;
        continue;
      }
      // c is SEMICOLON or CLOSE_BRACE
      if (colon !== -1) pushFrameDecl(ctx, decls, start, colon, stop);
      if (c === CLOSE_BRACE) {
        ctx.i = stop + 1;
        return decls;
      }
      ctx.i = stop + 1;
      break;
    }
  }

  return decls;
}

function pushFrameDecl(
  ctx: ParseContext,
  decls: DeclNode[],
  start: number,
  colon: number,
  end: number
): void {
  const prop = trimRange(ctx.css, start, colon);
  if (!prop) return;
  const value = normalizeValue(ctx, colon + 1, end);
  if (!value && !isCustomProperty(prop)) return;
  decls.push({
    kind: NodeKind.Decl,
    prop: templateOrString(ctx, prop),
    value: templateOrString(ctx, value),
  });
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
