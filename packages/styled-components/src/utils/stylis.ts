import { compile, Element, Middleware, middleware, prefixer, RULESET, stringify } from 'stylis';
import { Stringifier } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { phash, SEED } from './hash';

const AMP_REGEX = /&/g;
const COMMENT_REGEX = /^\s*\/\/.*$/gm;
const SPLIT_RULE_REGEX = /[^}]+\}+(?!\})/g;

export type ICreateStylisInstance = {
  options?: { namespace?: string; prefix?: boolean };
  plugins?: Middleware[];
};

/**
 * Serialize stylis output as an array of css strings. It is important that rules are
 * separated when using CSSOM injection.
 */
function serialize(children: Element[], callback: Middleware): string[] {
  const ret: string[] = [];

  for (let i = 0, result; i < children.length; i += 1) {
    result = callback(children[i], i, children, callback);

    // split up conjoined rules
    if (result) ret.push.apply(ret, result.match(SPLIT_RULE_REGEX)!);
  }

  return ret;
}

/**
 * Takes an element and recurses through it's rules added the namespace to the start of each selector.
 * Takes into account media queries by recursing through child rules if they are present.
 */
function recursivelySetNamepace(compiled: Element[], namespace: String): Element[] {
  return compiled.map(rule => {
    if (rule.type === 'rule') {
      // add the namespace to the start
      rule.value = `${namespace} ${rule.value}`;
      // add the namespace after each comma for subsequent selectors.
      // @ts-expect-error we target modern browsers but intentionally transpile to ES5 for speed
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
    plugins = EMPTY_ARRAY as unknown as Middleware[],
  }: ICreateStylisInstance = EMPTY_OBJECT as object
) {
  let _componentId: string;
  let _selector: string;
  let _selectorRegexp: RegExp;

  const selfReferenceReplacer: Parameters<String['replace']>[1] = (match, offset, string) => {
    if (
      /**
       * We only want to refer to the static class directly in the following scenarios:
       *
       * 1. The selector is alone on the line `& { color: red; }`
       * 2. The selector is part of a self-reference selector `& + & { color: red; }`
       */
      string === _selector ||
      (string.startsWith(_selector) &&
        string.endsWith(_selector) &&
        string.replaceAll(_selector, '').length > 0)
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
  const selfReferenceReplacementPlugin: Middleware = element => {
    if (element.type === RULESET && element.value.includes('&')) {
      (element.props as string[])[0] = element.props[0]
        // catch any hanging references that stylis missed
        .replace(AMP_REGEX, _selector)
        .replace(_selectorRegexp, selfReferenceReplacer);
    }
  };

  const middlewares = plugins.slice();

  /**
   * Enables automatic vendor-prefixing for styles.
   */
  if (options.prefix) {
    middlewares.unshift(prefixer);
  }

  middlewares.push(selfReferenceReplacementPlugin, stringify);

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
    let compiled = compile(prefix || selector ? `${prefix} ${selector} { ${flatCSS} }` : flatCSS);

    if (options.namespace) {
      compiled = recursivelySetNamepace(compiled, options.namespace);
    }

    return serialize(compiled, middleware(middlewares));
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
