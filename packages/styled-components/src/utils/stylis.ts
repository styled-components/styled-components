import * as stylis from 'stylis';
import { Stringifier } from '../types';
import {
  ASTERISK,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_PAREN,
  DOUBLE_QUOTE,
  NEWLINE,
  OPEN_BRACE,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
  SLASH,
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
 * Unified CSS preprocessor: strips JS-style line comments (//) and validates
 * brace balance in a single pass. Handles strings, parenthesized expressions
 * (any function call), and block comments with one shared state machine.
 *
 * Fast paths:
 *   - No // and no } → return unchanged (zero work)
 *   - No // but has } → brace-only validation (lightweight single pass)
 *   - Has // → full unified pass (strip comments + count braces simultaneously)
 */
export function preprocessCSS(css: string): string {
  const hasLineComments = css.indexOf('//') !== -1;
  const hasCloseBrace = css.indexOf('}') !== -1;

  if (!hasLineComments && !hasCloseBrace) return css;

  if (!hasLineComments) return sanitizeBraces(css);

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

    if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === ASTERISK) {
      i += 2;
      while (i + 1 < len && !(css.charCodeAt(i) === ASTERISK && css.charCodeAt(i + 1) === SLASH)) {
        i++;
      }
      i += 2;
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
    // so that url(https://...), image-set(), etc. are preserved
    if (parenDepth > 0) {
      i++;
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
      out += css.substring(start, i);
      while (i < len && css.charCodeAt(i) !== NEWLINE) {
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
      inComment = true;
      i++;
      continue;
    }
    if (inComment) {
      if (code === ASTERISK && css.charCodeAt(i + 1) === SLASH) {
        inComment = false;
        i++;
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
          if (skipCode === SEMICOLON || skipCode === NEWLINE) break;
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

export type ICreateStylisInstance = {
  options?: { namespace?: string | undefined; prefix?: boolean | undefined } | undefined;
  plugins?: stylis.Middleware[] | undefined;
};

/**
 * Takes an element and recurses through it's rules added the namespace to the start of each selector.
 * Takes into account media queries by recursing through child rules if they are present.
 */
function recursivelySetNamespace(compiled: stylis.Element[], namespace: string): stylis.Element[] {
  // Stylis AST can share `props` arrays between a top-level rule and a nested
  // copy of the same rule inside @media, so we must allocate a replacement
  // array rather than mutating in place. Hoist the concat operands to save
  // a per-rule/per-prop string alloc.
  const prefix = namespace + ' ';
  const commaReplace = ',' + prefix;
  for (let i = 0; i < compiled.length; i++) {
    const rule = compiled[i];
    if (rule.type === 'rule') {
      rule.value = (prefix + rule.value).replaceAll(',', commaReplace);
      const props = rule.props as string[];
      const newProps: string[] = [];
      for (let j = 0; j < props.length; j++) {
        newProps[j] = prefix + props[j];
      }
      rule.props = newProps;
    }

    if (Array.isArray(rule.children) && rule.type !== '@keyframes') {
      recursivelySetNamespace(rule.children, namespace);
    }
  }
  return compiled;
}

export default function createStylisInstance(
  {
    options = EMPTY_OBJECT as object,
    plugins = EMPTY_ARRAY as unknown as stylis.Middleware[],
  }: ICreateStylisInstance = EMPTY_OBJECT as object
) {
  let _componentId: string;
  let _selector: string;
  let _selectorRegexp: RegExp | undefined;

  const selfReferenceReplacer = (match: string, offset: number, string: string) => {
    if (
      /**
       * We only want to refer to the static class directly if the selector is part of a
       * self-reference selector `& + & { color: red; }`
       */
      string.startsWith(_selector) &&
      string.endsWith(_selector) &&
      string.replaceAll(_selector, '').length > 0
    ) {
      return `.${_componentId}`;
    }

    return match;
  };

  /**
   * When writing a style like
   *
   * & + & {
   *   color: red;
   * }
   *
   * The second ampersand should be a reference to the static component class. stylis
   * has no knowledge of static class so we have to intelligently replace the base selector.
   *
   * https://github.com/thysultan/stylis.js/tree/v4.0.2#abstract-syntax-structure
   */
  const selfReferenceReplacementPlugin: stylis.Middleware = element => {
    if (element.type === stylis.RULESET && element.value.includes('&')) {
      // Lazy RegExp creation: only allocate when self-reference pattern is actually used
      if (!_selectorRegexp) {
        _selectorRegexp = new RegExp(`\\${_selector}\\b`, 'g');
      }

      (element.props as string[])[0] = element.props[0]
        // catch any hanging references that stylis missed
        .replace(AMP_REGEX, _selector)
        .replace(_selectorRegexp, selfReferenceReplacer);
    }
  };

  const middlewares = plugins.slice();

  middlewares.push(selfReferenceReplacementPlugin);

  /**
   * Enables automatic vendor-prefixing for styles.
   */
  if (options.prefix) {
    middlewares.push(stylis.prefixer);
  }

  middlewares.push(stylis.stringify);

  // Pre-build the middleware chain once to avoid allocating closures,
  // arrays, and middleware wrappers on every stringifyRules call.
  // Safe because JS is single-threaded and _stack is consumed before next call.
  let _stack: string[] = [];
  const _middleware = stylis.middleware(
    middlewares.concat(stylis.rulesheet(value => _stack.push(value)))
  );

  const stringifyRules: Stringifier = (
    css: string,
    selector = '',
    /**
     * This "prefix" referes to a _selector_ prefix.
     */
    prefix = '',
    componentId = '&'
  ) => {
    // stylis has no concept of state to be passed to plugins
    // but since JS is single-threaded, we can rely on that to ensure
    // these properties stay in sync with the current stylis run
    _componentId = componentId;
    _selector = selector;
    _selectorRegexp = undefined; // Reset for lazy creation per call

    const flatCSS = preprocessCSS(css);
    let compiled = stylis.compile(
      prefix || selector ? prefix + ' ' + selector + ' { ' + flatCSS + ' }' : flatCSS
    );

    if (options.namespace) {
      compiled = recursivelySetNamespace(compiled, options.namespace);
    }

    _stack = [];
    stylis.serialize(compiled, _middleware);

    return _stack;
  };

  // Hash includes plugins + options so different stylis configs produce
  // different class names and cache keys.
  const o = options as ICreateStylisInstance['options'];
  let h = SEED;
  for (let i = 0; i < plugins.length; i++) {
    if (!plugins[i].name) throwStyledError(15);
    h = phash(h, plugins[i].name);
  }
  if (o?.namespace) h = phash(h, o.namespace);
  if (o?.prefix) h = phash(h, 'p');
  stringifyRules.hash = h !== SEED ? h.toString() : '';

  return stringifyRules;
}
