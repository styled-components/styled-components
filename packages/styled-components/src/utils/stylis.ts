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

/**
 * Strips JS-style line comments (//) from CSS, handling comments anywhere
 * in the line while preserving strings and valid CSS.
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

    // Check for line comment
    if (code === SLASH && css.charCodeAt(i + 1) === SLASH) {
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

  // No comments found after indexOf check means // was in a string
  if (start === 0) return css;
  if (start < len) parts.push(css.substring(start));
  return parts.join('');
}

/**
 * Checks if CSS has unbalanced closing braces that would cause stylis
 * to prematurely close rule blocks.
 * Optimized with early bail and charCodeAt for performance.
 */
function hasUnbalancedBraces(css: string): boolean {
  // Fast path: no closing brace means can't have unbalanced braces
  if (css.indexOf('}') === -1) return false;

  const len = css.length;
  let depth = 0;
  let inString = 0; // 0 = none, char code when in string
  let inComment = false;

  for (let i = 0; i < len; i++) {
    const code = css.charCodeAt(i);

    // Handle CSS comments
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
      continue;
    }
    if (inString !== 0) continue;

    // Track brace depth
    if (code === OPEN_BRACE) {
      depth++;
    } else if (code === CLOSE_BRACE) {
      depth--;
      if (depth < 0) return true;
    }
  }

  return depth !== 0 || inString !== 0;
}

/**
 * Sanitizes CSS by removing declarations with unbalanced braces.
 * This contains invalid syntax to just the affected declaration.
 * Optimized with charCodeAt for performance.
 */
function sanitizeCSS(css: string): string {
  // Fast path: valid CSS passes through unchanged
  if (!hasUnbalancedBraces(css)) {
    return css;
  }

  const len = css.length;
  let result = '';
  let declStart = 0;
  let braceDepth = 0;
  let inString = 0;
  let inComment = false;

  for (let i = 0; i < len; i++) {
    const code = css.charCodeAt(i);

    // Handle CSS comments
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
      continue;
    }
    if (inString !== 0) continue;

    if (code === OPEN_BRACE) {
      braceDepth++;
    } else if (code === CLOSE_BRACE) {
      braceDepth--;

      if (braceDepth < 0) {
        // Extra closing brace - skip to next semicolon or newline
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

  // Add remaining valid content
  if (declStart < len) {
    const remaining = css.substring(declStart);
    if (!hasUnbalancedBraces(remaining)) {
      result += remaining;
    }
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
function recursivelySetNamepace(compiled: stylis.Element[], namespace: String): stylis.Element[] {
  return compiled.map(rule => {
    if (rule.type === 'rule') {
      // add the namespace to the start
      rule.value = `${namespace} ${rule.value}`;
      // add the namespace after each comma for subsequent selectors.
      rule.value = rule.value.replaceAll(',', `,${namespace} `);
      rule.props = (rule.props as string[]).map(prop => {
        return `${namespace} ${prop}`;
      });
    }

    if (Array.isArray(rule.children) && rule.type !== '@keyframes') {
      rule.children = recursivelySetNamepace(rule.children, namespace);
    }
    return rule;
  });
}

export default function createStylisInstance(
  {
    options = EMPTY_OBJECT as object,
    plugins = EMPTY_ARRAY as unknown as stylis.Middleware[],
  }: ICreateStylisInstance = EMPTY_OBJECT as object
) {
  let _componentId: string;
  let _selector: string;
  let _selectorRegexp: RegExp;

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
    _selectorRegexp = new RegExp(`\\${_selector}\\b`, 'g');

    const flatCSS = sanitizeCSS(stripLineComments(css));
    let compiled = stylis.compile(
      prefix || selector ? `${prefix} ${selector} { ${flatCSS} }` : flatCSS
    );

    if (options.namespace) {
      compiled = recursivelySetNamepace(compiled, options.namespace);
    }

    const stack: string[] = [];

    stylis.serialize(
      compiled,
      stylis.middleware(middlewares.concat(stylis.rulesheet(value => stack.push(value))))
    );

    return stack;
  };

  stringifyRules.hash = plugins.length
    ? plugins
        .reduce((acc, plugin) => {
          if (!plugin.name) {
            throwStyledError(15);
          }

          return phash(acc, plugin.name);
        }, SEED)
        .toString()
    : '';

  return stringifyRules;
}
