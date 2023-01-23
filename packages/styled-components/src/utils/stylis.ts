import { compile, Element, Middleware, middleware, prefixer, RULESET, stringify } from 'stylis';
import { Stringifier } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { phash, SEED } from './hash';

const COMMENT_REGEX = /^\s*\/\/.*$/gm;
const COMPLEX_SELECTOR_PREFIX = [':', '[', '.', '#'];

export type ICreateStylisInstance = {
  options?: { namespace?: string; prefix?: boolean };
  plugins?: Middleware[];
};

/**
 * Serialize stylis output as an array of css strings. It is important that rules are
 * separated when using CSSOM injection.
 */
function serialize(children: Element[], callback: Middleware): string[] {
  return children.map((c, i) => callback(c, i, children, callback)).filter(Boolean) as string[];
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
      rule.value = rule.value.replaceAll(',', `,${namespace} `);
      rule.props = rule.props.map(prop => {
        return `${namespace} ${prop}`;
      });
    }

    if (Array.isArray(rule.children)) {
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
  let _consecutiveSelfRefRegExp: RegExp;

  const selfReferenceReplacer: Parameters<String['replace']>[1] = (match, offset, string) => {
    if (
      // do not replace the first occurrence if it is complex (has a modifier)
      (offset === 0 ? !COMPLEX_SELECTOR_PREFIX.includes(string[_selector.length]) : true) && // no consecutive self refs (.b.b); that is a precedence boost and treated differently
      !string.match(_consecutiveSelfRefRegExp)
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
      const props = element.props as string[];
      props[0] = props[0].replace(_selectorRegexp, selfReferenceReplacer);
    }
  };

  const stringifyRules: Stringifier = (
    css: string,
    selector = '',
    /**
     * This "prefix" referes to a _selector_ prefix.
     */
    prefix = '',
    componentId = '&'
  ) => {
    let flatCSS = css.replace(COMMENT_REGEX, '');

    // stylis has no concept of state to be passed to plugins
    // but since JS is single-threaded, we can rely on that to ensure
    // these properties stay in sync with the current stylis run
    _componentId = componentId;
    _selector = selector;
    _selectorRegexp = new RegExp(`\\${_selector}\\b`, 'g');
    _consecutiveSelfRefRegExp = new RegExp(`(\\${_selector}\\b){2,}`);

    const middlewares = plugins.slice();

    /**
     * Enables automatic vendor-prefixing for styles.
     */
    if (options.prefix || options.prefix === undefined) {
      middlewares.unshift(prefixer);
    }

    middlewares.push(selfReferenceReplacementPlugin, stringify);
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
