import { emitWeb } from '../parser/emit-web';
import { parseEmitFlat } from '../parser/emit-fast';
import { parse } from '../parser/parser';
import { Stringifier } from '../types';
import {
  ASTERISK,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_PAREN,
  COLON,
  CR,
  DOUBLE_QUOTE,
  LF,
  OPEN_BRACE,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
  SLASH,
  SPACE,
  TAB,
} from './charCodes';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { SEED, phash } from './hash';

const AMP_REGEX = /&/g;

/**
 * Check if a quote at position i is escaped. A quote is escaped when preceded
 * by an ODD number of backslashes (\", \\\", etc.). An even number means the
 * backslashes themselves are escaped and the quote is real (\\", \\\\", etc.).
 */
export function isEscaped(css: string, i: number): boolean {
  let backslashes = 0;
  while (--i >= 0 && css.charCodeAt(i) === BACKSLASH) backslashes++;
  return (backslashes & 1) === 1;
}

/**
 * Unified CSS preprocessor: strips JS-style line comments (//), strips CSS
 * block comments (/* ... * /), and validates brace balance in a single pass.
 * Handles strings, parenthesized expressions (any function call), and block
 * comments with one shared state machine.
 *
 * Fast paths:
 *   - No //, no /*, no } → return unchanged (zero work)
 *   - No //, no /*, has } → brace-only validation (lightweight single pass)
 *   - Otherwise         → full unified pass
 */
export function preprocessCSS(css: string): string {
  const hasLineComments = css.indexOf('//') !== -1;
  const hasBlockComments = css.indexOf('/*') !== -1;
  const hasCloseBrace = css.indexOf('}') !== -1;

  if (!hasLineComments && !hasBlockComments && !hasCloseBrace) return css;

  if (!hasLineComments && !hasBlockComments) return sanitizeBraces(css);

  const len = css.length;
  let out = '';
  let start = 0;
  let i = 0;
  let inString = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  let modified = false;

  while (i < len) {
    const code = css.charCodeAt(i);

    if ((code === DOUBLE_QUOTE || code === SINGLE_QUOTE) && !isEscaped(css, i)) {
      if (inString === 0) {
        inString = code;
      } else if (inString === code) {
        inString = 0;
      }
      i++;
      continue;
    }

    if (inString !== 0) {
      i++;
      continue;
    }

    if (code === OPEN_PAREN) {
      parenDepth++;
      i++;
      continue;
    }

    if (code === CLOSE_PAREN) {
      if (parenDepth > 0) parenDepth--;
      i++;
      continue;
    }

    // Inside parentheses (any function call), skip comment/brace detection
    // so that url(https://...), image-set(), url(.../*.png), etc. are preserved
    if (parenDepth > 0) {
      i++;
      continue;
    }

    if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === ASTERISK) {
      // Emit everything up to the comment, then skip the comment entirely.
      out += css.substring(start, i);
      i += 2;
      while (i + 1 < len && !(css.charCodeAt(i) === ASTERISK && css.charCodeAt(i + 1) === SLASH)) {
        i++;
      }
      i += 2;
      // When the comment is bordered by whitespace on both sides, collapse the
      // pair to a single space; matches stylis output so v6→v7 hash is stable
      // for templates that interleave selectors with annotative comments
      // (`a /* foo */ b`).
      const prevCh = out.length > 0 ? out.charCodeAt(out.length - 1) : 0;
      if (
        (prevCh === SPACE || prevCh === TAB || prevCh === LF || prevCh === CR) &&
        i < len &&
        (css.charCodeAt(i) === SPACE ||
          css.charCodeAt(i) === TAB ||
          css.charCodeAt(i) === LF ||
          css.charCodeAt(i) === CR)
      ) {
        while (
          i < len &&
          (css.charCodeAt(i) === SPACE ||
            css.charCodeAt(i) === TAB ||
            css.charCodeAt(i) === LF ||
            css.charCodeAt(i) === CR)
        ) {
          i++;
        }
      }
      start = i;
      modified = true;
      continue;
    }

    if (code === ASTERISK && i + 1 < len && css.charCodeAt(i + 1) === SLASH) {
      out += css.substring(start, i);
      i += 2;
      start = i;
      modified = true;
      continue;
    }

    if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === SLASH) {
      // URL scheme guard: `https://`, `mailto://`, etc. are NOT line comments.
      // If the char immediately before `//` is `:`, treat the whole sequence
      // as part of a URL and skip the line-comment strip.
      if (i > 0 && css.charCodeAt(i - 1) === COLON) {
        i += 2;
        continue;
      }
      out += css.substring(start, i);
      while (i < len && css.charCodeAt(i) !== LF) {
        i++;
      }
      start = i;
      modified = true;
      continue;
    }

    if (code === OPEN_BRACE) {
      braceDepth++;
    } else if (code === CLOSE_BRACE) {
      braceDepth--;
    }

    i++;
  }

  if (!modified) {
    if (braceDepth === 0) return css;
    return sanitizeBraces(css);
  }

  if (start < len) out += css.substring(start);

  if (braceDepth === 0) return out;
  return sanitizeBraces(out);
}

/**
 * Removes declarations with unbalanced braces from CSS.
 * Only called when preprocessCSS detects brace imbalance.
 */
function sanitizeBraces(css: string): string {
  const len = css.length;
  let result = '';
  let declStart = 0;
  let braceDepth = 0;
  let inString = 0;
  let inComment = false;
  let imbalanced = false;

  for (let i = 0; i < len; i++) {
    const code = css.charCodeAt(i);

    if (inString === 0 && !inComment && code === SLASH && css.charCodeAt(i + 1) === ASTERISK) {
      // Emit everything collected since last declStart up to the comment.
      result += css.substring(declStart, i);
      inComment = true;
      i++;
      continue;
    }
    if (inComment) {
      if (code === ASTERISK && css.charCodeAt(i + 1) === SLASH) {
        inComment = false;
        i++;
        declStart = i + 1; // start collecting from AFTER the */
      }
      continue;
    }

    if ((code === DOUBLE_QUOTE || code === SINGLE_QUOTE) && !isEscaped(css, i)) {
      if (inString === 0) {
        inString = code;
      } else if (inString === code) {
        inString = 0;
      }
      continue;
    }
    if (inString !== 0) continue;

    if (code === OPEN_BRACE) {
      braceDepth++;
    } else if (code === CLOSE_BRACE) {
      braceDepth--;

      if (braceDepth < 0) {
        imbalanced = true;
        let skipEnd = i + 1;
        while (skipEnd < len) {
          const skipCode = css.charCodeAt(skipEnd);
          if (skipCode === SEMICOLON || skipCode === LF) break;
          skipEnd++;
        }
        if (skipEnd < len && css.charCodeAt(skipEnd) === SEMICOLON) skipEnd++;

        braceDepth = 0;
        i = skipEnd - 1;
        declStart = skipEnd;
        continue;
      }

      if (braceDepth === 0) {
        result += css.substring(declStart, i + 1);
        declStart = i + 1;
      }
    } else if (code === SEMICOLON && braceDepth === 0) {
      result += css.substring(declStart, i + 1);
      declStart = i + 1;
    }
  }

  if (!imbalanced && braceDepth === 0 && inString === 0) return css;

  if (declStart < len && braceDepth === 0 && inString === 0) {
    result += css.substring(declStart);
  }

  return result;
}

/**
 * Declaration-transform hook. Return `undefined` to pass through unchanged.
 * Return `{ prop, value }` to override. The transform runs on every emitted
 * declaration; keep it monomorphic and cheap.
 */
export type DeclTransform = (
  prop: string,
  value: string
) => { prop: string; value: string } | undefined | void;

/**
 * Minimal plugin-shape recognised by createStylisInstance. Plugins are opt-in
 * markers carrying optional transforms. Shipping transforms inside the plugin
 * object lets bundlers tree-shake the implementation out of builds that don't
 * import the plugin. Unknown plugin shapes emit a one-time dev warning in
 * StyleSheetManager and are otherwise ignored.
 *
 *   - `rw`   rewrites each fully-resolved selector (post namespace + `&` resolution)
 *   - `decl` rewrites each emitted declaration (prop / value pair)
 */
export interface SCPlugin {
  /**
   * Required. Contributes to the compiler's hash so identical plugin sets share
   * class-name caches across `StyleSheetManager` instances. Unnamed plugins
   * throw at runtime; see error #15.
   */
  name: string;
  rw?: ((selector: string) => string) | undefined;
  decl?: DeclTransform | undefined;
}

export type ICreateStylisInstance = {
  options?: { namespace?: string | undefined } | undefined;
  plugins?: SCPlugin[] | undefined;
};

/**
 * In-house CSS compiler: wraps the input under the given selector, parses to
 * an AST (or the flat decl fast path), and emits web CSS rule strings.
 * Byte-identical to the output the stylis-backed path produced in v6, so
 * cached class-name hashes and server-rendered markup rehydrate cleanly
 * against v7.
 *
 * selector / prefix / componentId interpretation:
 *   - If both `prefix` and `selector` are empty, CSS is root-level (e.g., @keyframes defs)
 *     and is emitted without any selector wrapping.
 *   - Otherwise the CSS is wrapped under `${prefix} ${selector}` with the usual `&` rules.
 */
function compileWithInternalParser(
  flatCSS: string,
  selector: string,
  prefix: string,
  componentId: string,
  namespace: string | undefined,
  postProcessSelector: ((s: string) => string) | undefined,
  postProcessDecl: DeclTransform | undefined
): string[] {
  const wrapSelector = prefix || selector ? (prefix ? prefix + ' ' : '') + selector : '';
  if (
    wrapSelector &&
    !namespace &&
    !postProcessSelector &&
    !postProcessDecl &&
    flatCSS.indexOf('{') === -1 &&
    flatCSS.indexOf('@') === -1
  ) {
    const fast = parseEmitFlat(flatCSS, wrapSelector);
    if (fast !== null) {
      return fast;
    }
  }
  const wrappedCSS = wrapSelector ? wrapSelector + '{' + flatCSS + '}' : flatCSS;

  const ast = parse(wrappedCSS);
  if (ast.length === 0) return [];

  return emitWeb(ast, '', {
    selfRefSelector: selector,
    componentId,
    namespace,
    rw: postProcessSelector,
    decl: postProcessDecl,
  });
}

export default function createStylisInstance(
  {
    options = EMPTY_OBJECT as object,
    plugins = EMPTY_ARRAY as unknown as SCPlugin[],
  }: ICreateStylisInstance = EMPTY_OBJECT as object
) {
  // Plugins contribute their `rw` / `decl` transformers (if any). Functions
  // ship with the plugin module, so users who don't import a plugin never
  // pull its transform code into their bundle. Multiple plugins compose
  // left-to-right.
  let postProcessSelector: ((s: string) => string) | undefined;
  let postProcessDecl: DeclTransform | undefined;
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    if (!plugin) continue;
    const rw = plugin.rw;
    if (rw) {
      postProcessSelector = postProcessSelector
        ? (
            prev => (s: string) =>
              rw(prev!(s))
          )(postProcessSelector)
        : rw;
    }
    const decl = plugin.decl;
    if (decl) {
      postProcessDecl = postProcessDecl
        ? (prev => (p: string, v: string) => {
            const first = prev!(p, v);
            return decl(first ? first.prop : p, first ? first.value : v) || first;
          })(postProcessDecl)
        : decl;
    }
  }

  const stringifyRules: Stringifier = (
    css: string,
    selector = '',
    prefix = '',
    componentId = '&'
  ) => {
    const flatCSS = preprocessCSS(css);
    return compileWithInternalParser(
      flatCSS,
      selector,
      prefix,
      componentId,
      options.namespace,
      postProcessSelector,
      postProcessDecl
    );
  };

  // Hash includes plugins + options so different configs produce
  // different class names and cache keys.
  const o = options as ICreateStylisInstance['options'];
  let h = SEED;
  for (let i = 0; i < plugins.length; i++) {
    const name = plugins[i]?.name;
    if (!name) throw throwStyledError(15);
    h = phash(h, name);
  }
  if (o?.namespace) h = phash(h, o.namespace);
  stringifyRules.hash = h !== SEED ? h.toString() : '';

  return stringifyRules;
}
