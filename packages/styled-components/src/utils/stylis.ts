import * as stylis from 'stylis';
import { Stringifier } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { SEED, phash } from './hash';

const AMP_REGEX = /&/g;
const COMMENT_REGEX = /^\s*\/\/.*$/gm;

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

    const flatCSS = css.replace(COMMENT_REGEX, '');
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
