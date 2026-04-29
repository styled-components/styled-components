import { emitWeb } from '../parser/emit-web';
import { parse } from '../parser/parser';
import { compileWebFilled } from '../parser/compile';
import type { Compiler } from '../types';
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

/** Strip JS-style line comments + CSS block comments and validate brace balance in one pass. */
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

function sanitizeBraces(css: string): string {
  const len = css.length;
  // Optimistic: stay in pure-scan mode (no result allocation) until the first
  // event that demands rewriting (a comment to strip, or a brace imbalance).
  // Balanced comment-free input — the dominant production case from
  // `preprocessCSS:48` — hits the early-return at the bottom and pays only
  // one O(n) charCode walk with zero substring or concat work.
  let result = '';
  let resultActive = false;
  let declStart = 0;
  let braceDepth = 0;
  let inString = 0;
  let inComment = false;
  let imbalanced = false;

  for (let i = 0; i < len; i++) {
    const code = css.charCodeAt(i);

    if (inString === 0 && !inComment && code === SLASH && css.charCodeAt(i + 1) === ASTERISK) {
      if (resultActive) {
        result += css.substring(declStart, i);
      } else {
        // First comment: capture everything up to it in one substring rather
        // than `css.substring(0, declStart) + css.substring(declStart, i)`.
        result = css.substring(0, i);
        resultActive = true;
      }
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
        if (!resultActive) {
          result = css.substring(0, declStart);
          resultActive = true;
        }
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
        if (resultActive) result += css.substring(declStart, i + 1);
        declStart = i + 1;
      }
    } else if (code === SEMICOLON && braceDepth === 0) {
      if (resultActive) result += css.substring(declStart, i + 1);
      declStart = i + 1;
    }
  }

  if (!imbalanced && braceDepth === 0 && inString === 0) return css;

  // Imbalance OR braceDepth ended non-zero OR unclosed string. If we never
  // activated the result builder (e.g. a stray opening brace with no matching
  // close), backfill the good prefix now so we drop the unclosed tail.
  if (!resultActive) result = css.substring(0, declStart);

  if (declStart < len && braceDepth === 0 && inString === 0) {
    result += css.substring(declStart);
  }

  return result;
}

/** Declaration transform: return `{prop, value}` to override or undefined to pass. Keep monomorphic. */
export type DeclTransform = (
  prop: string,
  value: string
) => { prop: string; value: string } | undefined | void;

/**
 * Plugin shape: opt-in markers with optional `rw` (selector rewrite,
 * post namespace + `&` resolution) and `decl` (declaration rewrite) hooks.
 * Shipping transforms inside the plugin object lets bundlers tree-shake
 * implementations out of builds that don't import them.
 */
export interface SCPlugin {
  /** Contributes to the compiler hash so plugin sets get distinct caches. Throws #15 if missing. */
  name: string;
  rw?: ((selector: string) => string) | undefined;
  decl?: DeclTransform | undefined;
}

export type ICreateCompiler = {
  options?: { namespace?: string | undefined } | undefined;
  plugins?: SCPlugin[] | undefined;
};

export default function createCompiler(
  {
    options = EMPTY_OBJECT as object,
    plugins = EMPTY_ARRAY as unknown as SCPlugin[],
  }: ICreateCompiler = EMPTY_OBJECT as object
) {
  // Multiple plugins compose left-to-right.
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

  // Byte-identical to v6 stylis output for hash + SSR rehydration stability.
  const compileString = (css: string, selector = '', prefix = '', componentId = '&'): string[] => {
    const flatCSS = preprocessCSS(css);
    const wrapSelector = prefix || selector ? (prefix ? prefix + ' ' : '') + selector : '';
    const wrappedCSS = wrapSelector ? wrapSelector + '{' + flatCSS + '}' : flatCSS;
    const ast = parse(wrappedCSS);
    if (ast.length === 0) return [];
    return emitWeb(ast, '', {
      selfRefSelector: selector,
      componentId,
      namespace: options.namespace,
      rw: postProcessSelector,
      decl: postProcessDecl,
    });
  };

  // Hash includes plugins + options so different configs produce
  // different class names and cache keys.
  const o = options as ICreateCompiler['options'];
  let h = SEED;
  for (let i = 0; i < plugins.length; i++) {
    const name = plugins[i]?.name;
    if (!name) throw throwStyledError(15);
    h = phash(h, name);
  }
  if (o?.namespace) h = phash(h, o.namespace);

  const compiler: Compiler = {
    hash: h !== SEED ? h.toString() : '',
    compile: compileString,
    emit: (source, filled, parentSelector, componentId, fragments) =>
      compileWebFilled(
        source,
        filled,
        parentSelector,
        {
          selfRefSelector: parentSelector,
          componentId,
          namespace: options.namespace,
          rw: postProcessSelector,
          decl: postProcessDecl,
        },
        fragments
      ),
  };

  return compiler;
}
