import Stylis from '@emotion/stylis';
import { type Stringifier } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from './empties';
import throwStyledError from './error';
import { phash, SEED } from './hash';
import insertRulePlugin from './stylisPluginInsertRule';

const COMMENT_REGEX = /^\s*\/\/.*$/gm;
const COMPLEX_SELECTOR_PREFIX = [':', '[', '.', '#'];

type StylisInstanceConstructorArgs = {
  options?: Object,
  plugins?: Array<Function>,
};

export default function createStylisInstance({
  options = EMPTY_OBJECT,
  plugins = EMPTY_ARRAY,
}: StylisInstanceConstructorArgs = EMPTY_OBJECT) {
  const stylis = new Stylis(options);

  // Wrap `insertRulePlugin to build a list of rules,
  // and then make our own plugin to return the rules. This
  // makes it easier to hook into the existing SSR architecture

  let parsingRules = [];

  // eslint-disable-next-line consistent-return
  const returnRulesPlugin = context => {
    if (context === -2) {
      const parsedRules = parsingRules;
      parsingRules = [];
      return parsedRules;
    }
  };

  const parseRulesPlugin = insertRulePlugin(rule => {
    parsingRules.push(rule);
  });

  let _componentId: string;
  let _selector: string;
  let _selectorRegexp: RegExp;
  let _consecutiveSelfRefRegExp: RegExp;

  const selfReferenceReplacer = (match, offset, string) => {
    if (
      // do not replace the first occurrence if it is complex (has a modifier)
      (offset === 0 ? !COMPLEX_SELECTOR_PREFIX.includes(string[_selector.length]) : true) &&
      // no consecutive self refs (.b.b); that is a precedence boost and treated differently
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
   * https://github.com/thysultan/stylis.js/tree/v3.5.4#plugins <- more info about the context phase values
   * "2" means this plugin is taking effect at the very end after all other processing is complete
   */
  const selfReferenceReplacementPlugin = (context, _, selectors) => {
    if (context === 2 && selectors.length && selectors[0].lastIndexOf(_selector) > 0) {
      // eslint-disable-next-line no-param-reassign
      selectors[0] = selectors[0].replace(_selectorRegexp, selfReferenceReplacer);
    }
  };

  stylis.use([...plugins, selfReferenceReplacementPlugin, parseRulesPlugin, returnRulesPlugin]);

  function stringifyRules(css, selector, prefix, componentId = '&'): Stringifier {
    const flatCSS = css.replace(COMMENT_REGEX, '');
    const cssStr = selector && prefix ? `${prefix} ${selector} { ${flatCSS} }` : flatCSS;

    // stylis has no concept of state to be passed to plugins
    // but since JS is single-threaded, we can rely on that to ensure
    // these properties stay in sync with the current stylis run
    _componentId = componentId;
    _selector = selector;
    _selectorRegexp = new RegExp(`\\${_selector}\\b`, 'g');
    _consecutiveSelfRefRegExp = new RegExp(`(\\${_selector}\\b){2,}`);

    return stylis(prefix || !selector ? '' : selector, cssStr);
  }

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
