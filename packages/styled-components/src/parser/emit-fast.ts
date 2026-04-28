import {
  AT,
  BACKSLASH,
  CLOSE_BRACE,
  COLON,
  CR,
  DOUBLE_QUOTE,
  LF,
  OPEN_BRACE,
  OPEN_PAREN,
  CLOSE_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
  SPACE,
  TAB,
  COMMA,
  HYPHEN,
  OPEN_BRACKET,
  CLOSE_BRACKET,
} from '../utils/charCodes';

/**
 * Fast parse+emit for flat decl-only CSS. Returns null if the input
 * contains `{` or `@`, signalling the caller to fall back to the full parser.
 */
export function parseEmitFlat(css: string, selector: string): string[] | null {
  const len = css.length;
  let output = '';
  let hasContent = false;
  let i = 0;

  while (i < len) {
    // Skip whitespace and stray semicolons
    while (i < len) {
      const c = css.charCodeAt(i);
      if (c === SPACE || c === TAB || c === LF || c === CR || c === SEMICOLON) i++;
      else break;
    }
    if (i >= len) break;

    // Bail immediately if we see a brace or at-rule; not flat CSS.
    const firstChar = css.charCodeAt(i);
    if (firstChar === OPEN_BRACE || firstChar === AT || firstChar === CLOSE_BRACE) {
      return null;
    }

    // Scan for `:` (colon) then `;` or EOF. Track paren/quote depth.
    // If we encounter `{` mid-scan, bail; this is a selector, not a decl.
    const propStart = i;
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
      } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
        quote = c;
      } else if (c === OPEN_PAREN) {
        paren++;
      } else if (c === CLOSE_PAREN) {
        if (paren > 0) paren--;
      } else if (paren === 0) {
        if (c === COLON) {
          colon = i;
          i++;
          break;
        } else if (c === OPEN_BRACE) {
          // Nested rule; bail to full parser.
          return null;
        } else if (c === SEMICOLON || c === CLOSE_BRACE) {
          // Malformed or unexpected terminator; skip this run.
          i++;
          colon = -2;
          break;
        }
      }
      i++;
    }

    if (colon === -2) continue;
    if (colon === -1) break; // EOF without colon

    // Trim prop
    let propEnd = colon;
    while (propEnd > propStart) {
      const c = css.charCodeAt(propEnd - 1);
      if (c === SPACE || c === TAB || c === LF || c === CR) propEnd--;
      else break;
    }

    // Scan value, tracking whether it contains a comma (for normalization).
    // If `{` appears at paren depth 0, bail; prop:value{...} is a block
    // like `@font-face { ... }` inside a selector, which needs the AST.
    const valueStart = i;
    let hasComma = false;
    paren = 0;
    quote = 0;

    while (i < len) {
      const c = css.charCodeAt(i);
      if (quote !== 0) {
        if (c === BACKSLASH) {
          i += 2;
          continue;
        }
        if (c === quote) quote = 0;
      } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
        quote = c;
      } else if (c === OPEN_PAREN) {
        paren++;
      } else if (c === CLOSE_PAREN) {
        if (paren > 0) paren--;
      } else if (paren === 0) {
        if (c === COMMA) hasComma = true;
        else if (c === SEMICOLON) break;
        else if (c === OPEN_BRACE) return null; // unexpected block
      }
      i++;
    }

    const valueEnd = i;
    // Trim value
    let vs = valueStart;
    while (vs < valueEnd) {
      const c = css.charCodeAt(vs);
      if (c === SPACE || c === TAB || c === LF || c === CR) vs++;
      else break;
    }
    let ve = valueEnd;
    while (ve > vs) {
      const c = css.charCodeAt(ve - 1);
      if (c === SPACE || c === TAB || c === LF || c === CR) ve--;
      else break;
    }

    // Custom Properties L1: `--x: ` with only whitespace is a valid
    // guaranteed-invalid value; must emit `--x:;` (see #4374, emit-web parity).
    const isCustomProp =
      propEnd - propStart >= 2 &&
      css.charCodeAt(propStart) === HYPHEN &&
      css.charCodeAt(propStart + 1) === HYPHEN;

    if (propEnd > propStart && (ve > vs || isCustomProp)) {
      if (hasContent) output += ';';
      output += css.substring(propStart, propEnd);
      output += ':';
      if (ve > vs) {
        if (hasComma) {
          output += stripCommasInline(css, vs, ve);
        } else {
          output += css.substring(vs, ve);
        }
      }
      hasContent = true;
    }

    if (i < len) i++; // skip the terminating semicolon
  }

  if (!hasContent) return [];
  return [selector + '{' + output + ';}'];
}

/** Emit comma-space-stripped CSS over a range without allocating an intermediate substring. */
function stripCommasInline(css: string, start: number, end: number): string {
  let out = '';
  let paren = 0;
  let bracket = 0;
  let quote = 0;
  let segStart = start;

  for (let i = start; i < end; i++) {
    const c = css.charCodeAt(i);
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
      // Emit up to and including the comma
      out += css.substring(segStart, i + 1);
      // Skip any whitespace after
      let j = i + 1;
      while (j < end) {
        const n = css.charCodeAt(j);
        if (n === SPACE || n === TAB || n === LF || n === CR) j++;
        else break;
      }
      segStart = j;
      i = j - 1;
    }
  }

  if (segStart < end) out += css.substring(segStart, end);
  return out;
}
