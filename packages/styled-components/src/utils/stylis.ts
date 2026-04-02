import * as stylis from 'stylis';
import { Stringifier } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { SEED, phash } from './hash';

const AMP_REGEX = /&/g;

// Character codes for fast comparison
const DOUBLE_QUOTE = 34; // "
const SINGLE_QUOTE = 39; // '
const SLASH = 47; // /
const ASTERISK = 42; // *
const BACKSLASH = 92; // \
const OPEN_BRACE = 123; // {
const CLOSE_BRACE = 125; // }
const SEMICOLON = 59; // ;
const NEWLINE = 10; // \n
const OPEN_PAREN = 40; // (
const CLOSE_PAREN = 41; // )

/**
 * Strips JS-style line comments (//) from CSS, handling comments anywhere
 * in the line while preserving strings, url() contents, and valid CSS.
 * Optimized with early bail and charCodeAt for performance.
 */
function stripLineComments(css: string): string {
  // Fast path: no // means no line comments
  if (css.indexOf('//') === -1) return css;

  const len = css.length;
  const parts: string[] = [];
  let start = 0;
  let i = 0;
  let inString = 0; // 0 = none, DOUBLE_QUOTE or SINGLE_QUOTE when in string
  let urlDepth = 0; // Track nesting depth inside url()

  while (i < len) {
    const code = css.charCodeAt(i);

    // Track string state
    if (
      (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) &&
      (i === 0 || css.charCodeAt(i - 1) !== BACKSLASH)
    ) {
      if (inString === 0) {
        inString = code;
      } else if (inString === code) {
        inString = 0;
      }
      i++;
      continue;
    }

    // Skip string content
    if (inString !== 0) {
      i++;
      continue;
    }

    // Handle CSS block comments: skip /* ... */ entirely
    if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === ASTERISK) {
      i += 2;
      while (i + 1 < len && !(css.charCodeAt(i) === ASTERISK && css.charCodeAt(i + 1) === SLASH)) {
        i++;
      }
      i += 2; // skip past */
      continue;
    }

    // Track url() context - check for 'url(' (case insensitive via | 32)
    if (
      code === OPEN_PAREN &&
      i >= 3 &&
      (css.charCodeAt(i - 1) | 32) === 108 && // l
      (css.charCodeAt(i - 2) | 32) === 114 && // r
      (css.charCodeAt(i - 3) | 32) === 117 // u
    ) {
      urlDepth = 1;
      i++;
      continue;
    }

    // Track nested parentheses inside url()
    if (urlDepth > 0) {
      if (code === CLOSE_PAREN) urlDepth--;
      else if (code === OPEN_PAREN) urlDepth++;
      i++;
      continue;
    }

    // Strip orphaned */ (no matching /*) — invalid CSS that breaks parsing
    if (code === ASTERISK && i + 1 < len && css.charCodeAt(i + 1) === SLASH) {
      if (i > start) parts.push(css.substring(start, i));
      i += 2;
      start = i;
      continue;
    }

    // Check for line comment (only when not in url())
    if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === SLASH) {
      if (i > start) parts.push(css.substring(start, i));
      // Skip to end of line
      while (i < len && css.charCodeAt(i) !== NEWLINE) {
        i++;
      }
      start = i;
      continue;
    }

    i++;
  }

  // No comments found after indexOf check means // was in a string or url()
  if (start === 0) return css;
  if (start < len) parts.push(css.substring(start));
  return parts.join('');
}

/**
 * Single-pass CSS sanitizer: validates brace balance and removes declarations
 * with unbalanced braces. Returns the input unchanged when CSS is valid.
 */
function sanitizeCSS(css: string): string {
  if (css.indexOf('}') === -1) return css;

  const len = css.length;
  let depth = 0;
  let inString = 0;
  let inComment = false;

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

    if (
      (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) &&
      (i === 0 || css.charCodeAt(i - 1) !== BACKSLASH)
    ) {
      if (inString === 0) {
        inString = code;
      } else if (inString === code) {
        inString = 0;
      }
      continue;
    }
    if (inString !== 0) continue;

    if (code === OPEN_BRACE) {
      depth++;
    } else if (code === CLOSE_BRACE) {
      depth--;
      if (depth < 0) break;
    }
  }

  if (depth === 0 && inString === 0) return css;

  let result = '';
  let declStart = 0;
  let braceDepth = 0;
  inString = 0;
  inComment = false;

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

    if (
      (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) &&
      (i === 0 || css.charCodeAt(i - 1) !== BACKSLASH)
    ) {
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
  for (let i = 0; i < compiled.length; i++) {
    const rule = compiled[i];
    if (rule.type === 'rule') {
      // add the namespace to the start
      rule.value = namespace + ' ' + rule.value;
      // add the namespace after each comma for subsequent selectors.
      rule.value = rule.value.replaceAll(',', ',' + namespace + ' ');
      const props = rule.props as string[];
      const newProps: string[] = [];
      for (let j = 0; j < props.length; j++) {
        newProps[j] = namespace + ' ' + props[j];
      }
      rule.props = newProps;
    }

    if (Array.isArray(rule.children) && rule.type !== '@keyframes') {
      rule.children = recursivelySetNamespace(rule.children, namespace);
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

    const flatCSS = sanitizeCSS(stripLineComments(css));
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
