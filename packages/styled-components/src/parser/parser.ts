import {
  AT,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  CLOSE_PAREN,
  COLON,
  COMMA,
  CR,
  DIGIT_0,
  DIGIT_9,
  DOUBLE_QUOTE,
  HYPHEN,
  LF,
  NUL,
  OPEN_BRACE,
  OPEN_BRACKET,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
  SPACE,
  TAB,
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
} from './ast';

export interface ParseOptions {
  /**
   * When `true`, skips the stylis-parity comma-space stripping inside
   * declaration values (e.g. `color 0.2s, blue` stays unchanged).
   * The web emitter relies on the default stripping for byte parity with
   * stylis; the native transform pipeline sets this to `true` so the
   * tokenizer sees font-family fallback chains intact.
   */
  keepCommaSpaces?: boolean;
}

/**
 * Parse a preprocessed CSS string into a parser AST.
 *
 * Assumes the input has already passed through `normalize` from
 * src/utils/normalize.ts, which normalizes braces, strips line comments,
 * and handles unbalanced strings. This parser is STRICT; it assumes
 * well-formed input.
 */
export function parse(css: string, options?: ParseOptions): Root {
  const ctx: ParseContext = {
    css,
    len: css.length,
    i: 0,
    keepCommaSpaces: !!options?.keepCommaSpaces,
  };
  return parseBlock(ctx);
}

interface ParseContext {
  css: string;
  len: number;
  i: number;
  keepCommaSpaces: boolean;
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
      if (c === SPACE || c === TAB || c === LF || c === CR || c === SEMICOLON) i++;
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
    if (first === NUL && i + 2 < len && css.charCodeAt(i + 1) === UPPER_J) {
      const interp = readInterpolationSentinel(css, i, len);
      if (interp !== null) {
        out.push({ kind: NodeKind.Interpolation, index: interp.index });
        ctx.i = interp.end;
        continue;
      }
    }

    const start = i;
    let colon = -1;
    let paren = 0;
    let quote = 0;

    while (i < len) {
      const c = css.charCodeAt(i);
      if (quote !== 0) {
        if (c === BACKSLASH) {
          i += 2;
          continue;
        }
        if (c === quote) quote = 0;
      } else if (c === BACKSLASH) {
        // CSS escape (`\:`, `\;`, `\{`, …): consume the escaped char so the
        // boundary scanner doesn't stop on it. Stylis-parity.
        i += 2;
        continue;
      } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
        quote = c;
      } else if (c === OPEN_PAREN) {
        paren++;
      } else if (c === CLOSE_PAREN) {
        if (paren > 0) paren--;
      } else if (paren === 0) {
        if (c === COLON) {
          if (colon === -1) colon = i;
        } else if (c === OPEN_BRACE) {
          const selectorText = trimRange(css, start, i);
          const selectors =
            selectorText.indexOf(',') === -1
              ? [selectorText]
              : splitTopLevelCommas(selectorText, true);
          ctx.i = i + 1;
          const children = parseBlock(ctx);
          out.push({ kind: NodeKind.Rule, selectors, children });
          i = -1;
          break;
        } else if (c === SEMICOLON || c === CLOSE_BRACE) {
          if (colon !== -1) {
            pushDecl(ctx, out, start, colon, i);
          }
          if (c === CLOSE_BRACE) {
            ctx.i = i + 1;
            return out;
          }
          ctx.i = i + 1;
          i = -1;
          break;
        }
      }
      i++;
    }

    if (i === -1) continue;

    // EOF reached. Treat as terminal declaration if we saw a colon.
    if (colon !== -1) {
      pushDecl(ctx, out, start, colon, i);
    }
    ctx.i = i;
    break;
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
  out.push({ kind: NodeKind.Decl, prop, value });
}

/** A CSS custom property starts with `--` (two leading hyphens). */
function isCustomProperty(prop: string): boolean {
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
    if (c === SPACE || c === TAB || c === LF || c === CR) start++;
    else break;
  }
  while (end > start) {
    const c = css.charCodeAt(end - 1);
    if (c === SPACE || c === TAB || c === LF || c === CR) end--;
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
 * already tight (`a,b,c`) — common in compact author CSS — pay only the
 * single charCode walk and return unchanged. Exported for the emitter's
 * at-rule prelude handling.
 */
export function stripCommaSpaces(s: string): string {
  if (s.indexOf(',') === -1) return s;
  const len = s.length;
  let out = '';
  let segStart = 0;
  let paren = 0;
  let bracket = 0;
  let quote = 0;

  for (let i = 0; i < len; i++) {
    const c = s.charCodeAt(i);
    if (quote !== 0) {
      if (c === BACKSLASH) {
        i++;
        continue;
      }
      if (c === quote) quote = 0;
    } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      quote = c;
    } else if (c === OPEN_PAREN) {
      paren++;
    } else if (c === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (c === OPEN_BRACKET) {
      bracket++;
    } else if (c === CLOSE_BRACKET) {
      if (bracket > 0) bracket--;
    } else if (c === COMMA && paren === 0 && bracket === 0) {
      // Look ahead: only commit a segment if there's whitespace to strip.
      let j = i + 1;
      while (j < len) {
        const n = s.charCodeAt(j);
        if (n === SPACE || n === TAB || n === LF || n === CR) j++;
        else break;
      }
      if (j > i + 1) {
        out += s.substring(segStart, i + 1);
        segStart = j;
        i = j - 1;
      }
    }
  }

  // No top-level commas with trailing whitespace → return original string.
  if (segStart === 0) return s;
  if (segStart < len) out += s.substring(segStart, len);
  return out;
}

function trimRange(css: string, start: number, end: number): string {
  while (start < end) {
    const c = css.charCodeAt(start);
    if (c === SPACE || c === TAB || c === LF || c === CR) start++;
    else break;
  }
  while (end > start) {
    const c = css.charCodeAt(end - 1);
    if (c === SPACE || c === TAB || c === LF || c === CR) end--;
    else break;
  }
  return start < end ? css.substring(start, end) : '';
}

function isNameStop(code: number): boolean {
  return (
    code === SPACE ||
    code === TAB ||
    code === LF ||
    code === CR ||
    code === OPEN_BRACE ||
    code === SEMICOLON
  );
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
    if (c === SPACE || c === TAB || c === LF || c === CR) j++;
    else break;
  }

  // Scan prelude until `{`, `;`, `}`, or EOF
  const preludeStart = j;
  let paren = 0;
  let quote = 0;
  while (j < len) {
    const c = css.charCodeAt(j);
    if (quote !== 0) {
      if (c === BACKSLASH) {
        j += 2;
        continue;
      }
      if (c === quote) quote = 0;
    } else if (c === BACKSLASH) {
      j += 2;
      continue;
    } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      quote = c;
    } else if (c === OPEN_PAREN) {
      paren++;
    } else if (c === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (paren === 0) {
      if (c === OPEN_BRACE || c === SEMICOLON || c === CLOSE_BRACE) break;
    }
    j++;
  }

  const prelude = trimRange(css, preludeStart, j);

  if (j >= len) {
    ctx.i = j;
    return { kind: NodeKind.AtRule, name, prelude, children: null };
  }

  const delim = css.charCodeAt(j);
  if (delim !== OPEN_BRACE) {
    ctx.i = delim === SEMICOLON ? j + 1 : j;
    return { kind: NodeKind.AtRule, name, prelude, children: null };
  }

  ctx.i = j + 1;

  if (isKeyframesName(name)) {
    const frames = parseKeyframesBody(ctx);
    return { kind: NodeKind.Keyframes, name, prelude, frames };
  }

  const children = parseBlock(ctx);
  return { kind: NodeKind.AtRule, name, prelude, children };
}

function parseKeyframesBody(ctx: ParseContext): KeyframeFrame[] {
  const css = ctx.css;
  const len = ctx.len;
  const frames: KeyframeFrame[] = [];

  while (ctx.i < len) {
    // Skip whitespace
    while (ctx.i < len) {
      const c = css.charCodeAt(ctx.i);
      if (c === SPACE || c === TAB || c === LF || c === CR) ctx.i++;
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
    let j = ctx.i;
    let paren = 0;
    let quote = 0;
    while (j < len) {
      const ch = css.charCodeAt(j);
      if (quote !== 0) {
        if (ch === BACKSLASH) {
          j += 2;
          continue;
        }
        if (ch === quote) quote = 0;
      } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
        quote = ch;
      } else if (ch === OPEN_PAREN) {
        paren++;
      } else if (ch === CLOSE_PAREN) {
        if (paren > 0) paren--;
      } else if (paren === 0) {
        if (ch === OPEN_BRACE || ch === CLOSE_BRACE) break;
      }
      j++;
    }

    if (j >= len || css.charCodeAt(j) !== OPEN_BRACE) {
      ctx.i = j + 1;
      continue;
    }

    const stopsText = trimRange(css, start, j);
    const stops =
      stopsText.indexOf(',') === -1 ? [stopsText] : splitTopLevelCommas(stopsText, true);
    ctx.i = j + 1;

    const children = parseFrameDecls(ctx);
    frames.push({ stops, children });
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
      if (c === SPACE || c === TAB || c === LF || c === CR || c === SEMICOLON) i++;
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
    let paren = 0;
    let quote = 0;
    while (i < len) {
      const c = css.charCodeAt(i);
      if (quote !== 0) {
        if (c === BACKSLASH) {
          i += 2;
          continue;
        }
        if (c === quote) quote = 0;
      } else if (c === BACKSLASH) {
        i += 2;
        continue;
      } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
        quote = c;
      } else if (c === OPEN_PAREN) {
        paren++;
      } else if (c === CLOSE_PAREN) {
        if (paren > 0) paren--;
      } else if (paren === 0) {
        if (c === COLON && colon === -1) {
          colon = i;
        } else if (c === SEMICOLON || c === CLOSE_BRACE) {
          if (colon !== -1) {
            const prop = trimRange(css, start, colon);
            if (prop) {
              const value = normalizeValue(ctx, colon + 1, i);
              if (value || isCustomProperty(prop)) {
                decls.push({ kind: NodeKind.Decl, prop, value });
              }
            }
          }
          if (c === CLOSE_BRACE) {
            ctx.i = i + 1;
            return decls;
          }
          ctx.i = i + 1;
          break;
        }
      }
      i++;
    }

    if (i >= len) {
      if (colon !== -1) {
        const prop = trimRange(css, start, colon);
        if (prop) {
          const value = normalizeValue(ctx, colon + 1, i);
          if (value || isCustomProperty(prop)) {
            decls.push({ kind: NodeKind.Decl, prop, value });
          }
        }
      }
      ctx.i = i;
      break;
    }
  }

  return decls;
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
  let paren = 0;
  let bracket = 0;
  let quote = 0;

  for (let i = 0; i < len; i++) {
    const c = raw.charCodeAt(i);
    if (quote !== 0) {
      if (c === BACKSLASH) {
        i++;
        continue;
      }
      if (c === quote) quote = 0;
      continue;
    }
    if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      quote = c;
    } else if (c === OPEN_PAREN) {
      paren++;
    } else if (c === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (c === OPEN_BRACKET) {
      bracket++;
    } else if (c === CLOSE_BRACKET) {
      if (bracket > 0) bracket--;
    } else if (c === COMMA && paren === 0 && bracket === 0) {
      if (trim) {
        const part = trimRange(raw, start, i);
        if (part) out.push(part);
      } else {
        out.push(raw.substring(start, i));
      }
      start = i + 1;
    }
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
