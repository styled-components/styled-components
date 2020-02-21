import { isElement, isValidElementType } from 'react-is';
import React, {
  useState,
  useContext,
  useMemo,
  useEffect,
  createElement,
  useDebugValue,
  useRef,
} from 'react';
import shallowequal from 'shallowequal';
import Stylis from '@emotion/stylis';
import unitless from '@emotion/unitless';
import validAttr from '@emotion/is-prop-valid';
import hoist from 'hoist-non-react-statics';

function _extends() {
  _extends =
    Object.assign ||
    function(target) {
      for (let i = 1; i < arguments.length; i++) {
        const source = arguments[i];

        for (const key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

  return _extends.apply(this, arguments);
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  const target = {};
  const sourceKeys = Object.keys(source);
  let key; let i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

//
const interleave = function(strings, interpolations) {
  const result = [strings[0]];

  for (let i = 0, len = interpolations.length; i < len; i += 1) {
    result.push(interpolations[i], strings[i + 1]);
  }

  return result;
};

//
const isPlainObject = function(x) {
  return typeof x === 'object' && x.constructor === Object;
};

//
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

//
function isFunction(test) {
  return typeof test === 'function';
}

//
function getComponentName(target) {
  return (
    (process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) || // $FlowFixMe
    target.displayName || // $FlowFixMe
    target.name ||
    'Component'
  );
}

//
function isStatelessFunction(test) {
  return typeof test === 'function' && !(test.prototype && test.prototype.isReactComponent);
}

//
function isStyledComponent(target) {
  return target && typeof target.styledComponentId === 'string';
}

//
const SC_ATTR =
  (typeof process !== 'undefined' && (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR)) ||
  'data-styled';
const SC_ATTR_ACTIVE = 'active';
const SC_ATTR_VERSION = 'data-styled-version';
const SC_VERSION = '5.0.0';
const IS_BROWSER = typeof window !== 'undefined' && 'HTMLElement' in window;
const DISABLE_SPEEDY =
  (typeof SC_DISABLE_SPEEDY === 'boolean' && SC_DISABLE_SPEEDY) ||
  (typeof process !== 'undefined' &&
    (process.env.REACT_APP_SC_DISABLE_SPEEDY || process.env.SC_DISABLE_SPEEDY)) ||
  process.env.NODE_ENV !== 'production'; // Shared empty execution context when generating static styles

const STATIC_EXECUTION_CONTEXT = {};

//

/* eslint-disable camelcase, no-undef */
const getNonce = function getNonce() {
  return typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null;
};

//
const ELEMENT_TYPE = 1;
/* Node.ELEMENT_TYPE */

/** Find last style element if any inside target */

const findLastStyleTag = function findLastStyleTag(target) {
  const {childNodes} = target;

  for (let i = childNodes.length; i >= 0; i--) {
    const child = childNodes[i];

    if (child && child.nodeType === ELEMENT_TYPE && child.hasAttribute(SC_ATTR)) {
      return child;
    }
  }

  return undefined;
};
/** Create a style element inside `target` or <head> after the last */

const makeStyleTag = function makeStyleTag(target) {
  const {head} = document;
  const parent = target || head;
  const style = document.createElement('style');
  const prevStyle = findLastStyleTag(parent);
  const nextSibling = prevStyle !== undefined ? prevStyle.nextSibling : null;
  style.setAttribute(SC_ATTR, SC_ATTR_ACTIVE);
  style.setAttribute(SC_ATTR_VERSION, SC_VERSION);
  const nonce = getNonce();
  if (nonce) style.setAttribute('nonce', nonce);
  parent.insertBefore(style, nextSibling);
  return style;
};
/** Get the CSSStyleSheet instance for a given style element */

const getSheet = function getSheet(tag) {
  if (tag.sheet) {
    return tag.sheet;
  } // Avoid Firefox quirk where the style element might not have a sheet property

  const _document = document;
    const {styleSheets} = _document;

  for (let i = 0, l = styleSheets.length; i < l; i++) {
    const sheet = styleSheets[i];

    if (sheet.ownerNode === tag) {
      return sheet;
    }
  }

  throw new TypeError('CSSStyleSheet could not be found on HTMLStyleElement');
};

//
/** Create a CSSStyleSheet-like tag depending on the environment */

const makeTag = function makeTag(_ref) {
  const {isServer} = _ref;
    const {useCSSOMInjection} = _ref;
    const {target} = _ref;

  if (isServer) {
    return new VirtualTag(target);
  } else if (useCSSOMInjection) {
    return new CSSOMTag(target);
  } else {
    return new TextTag(target);
  }
};
var CSSOMTag =
  /* #__PURE__ */
  (function() {
    function CSSOMTag(target) {
      const element = (this.element = makeStyleTag(target)); // Avoid Edge bug where empty style elements don't create sheets

      element.appendChild(document.createTextNode(''));
      this.sheet = getSheet(element);
      this.length = 0;
    }

    const _proto = CSSOMTag.prototype;

    _proto.insertRule = function insertRule(index, rule) {
      try {
        this.sheet.insertRule(rule, index);
        this.length++;
        return true;
      } catch (_error) {
        return false;
      }
    };

    _proto.deleteRule = function deleteRule(index) {
      this.sheet.deleteRule(index);
      this.length--;
    };

    _proto.getRule = function getRule(index) {
      const rule = this.sheet.cssRules[index]; // Avoid IE11 quirk where cssText is inaccessible on some invalid rules

      if (rule !== undefined && typeof rule.cssText === 'string') {
        return rule.cssText;
      } else {
        return '';
      }
    };

    return CSSOMTag;
  })();
/** A Tag that emulates the CSSStyleSheet API but uses text nodes */

var TextTag =
  /* #__PURE__ */
  (function() {
    function TextTag(target) {
      const element = (this.element = makeStyleTag(target));
      this.nodes = element.childNodes;
      this.length = 0;
    }

    const _proto2 = TextTag.prototype;

    _proto2.insertRule = function insertRule(index, rule) {
      if (index <= this.length && index >= 0) {
        const node = document.createTextNode(rule);
        const refNode = this.nodes[index];
        this.element.insertBefore(node, refNode || null);
        this.length++;
        return true;
      } else {
        return false;
      }
    };

    _proto2.deleteRule = function deleteRule(index) {
      this.element.removeChild(this.nodes[index]);
      this.length--;
    };

    _proto2.getRule = function getRule(index) {
      if (index < this.length) {
        return this.nodes[index].textContent;
      } else {
        return '';
      }
    };

    return TextTag;
  })();
/** A completely virtual (server-side) Tag that doesn't manipulate the DOM */

var VirtualTag =
  /* #__PURE__ */
  (function() {
    function VirtualTag(_target) {
      this.rules = [];
      this.length = 0;
    }

    const _proto3 = VirtualTag.prototype;

    _proto3.insertRule = function insertRule(index, rule) {
      if (index <= this.length) {
        this.rules.splice(index, 0, rule);
        this.length++;
        return true;
      } else {
        return false;
      }
    };

    _proto3.deleteRule = function deleteRule(index) {
      this.rules.splice(index, 1);
      this.length--;
    };

    _proto3.getRule = function getRule(index) {
      if (index < this.length) {
        return this.rules[index];
      } else {
        return '';
      }
    };

    return VirtualTag;
  })();

//

/* eslint-disable no-use-before-define */

/** Create a GroupedTag with an underlying Tag implementation */
const makeGroupedTag = function makeGroupedTag(tag) {
  return new DefaultGroupedTag(tag);
};
const BASE_SIZE = 1 << 8;

var DefaultGroupedTag =
  /* #__PURE__ */
  (function() {
    function DefaultGroupedTag(tag) {
      this.groupSizes = new Uint32Array(BASE_SIZE);
      this.length = BASE_SIZE;
      this.tag = tag;
    }

    const _proto = DefaultGroupedTag.prototype;

    _proto.indexOfGroup = function indexOfGroup(group) {
      let index = 0;

      for (let i = 0; i < group; i++) {
        index += this.groupSizes[i];
      }

      return index;
    };

    _proto.insertRules = function insertRules(group, rules) {
      if (group >= this.groupSizes.length) {
        const oldBuffer = this.groupSizes;
        const oldSize = oldBuffer.length;
        const newSize = BASE_SIZE << ((group / BASE_SIZE) | 0);
        this.groupSizes = new Uint32Array(newSize);
        this.groupSizes.set(oldBuffer);
        this.length = newSize;

        for (let i = oldSize; i < newSize; i++) {
          this.groupSizes[i] = 0;
        }
      }

      let ruleIndex = this.indexOfGroup(group + 1);

      for (let _i = 0, l = rules.length; _i < l; _i++) {
        if (this.tag.insertRule(ruleIndex, rules[_i])) {
          this.groupSizes[group]++;
          ruleIndex++;
        }
      }
    };

    _proto.clearGroup = function clearGroup(group) {
      if (group < this.length) {
        const length = this.groupSizes[group];
        const startIndex = this.indexOfGroup(group);
        const endIndex = startIndex + length;
        this.groupSizes[group] = 0;

        for (let i = startIndex; i < endIndex; i++) {
          this.tag.deleteRule(startIndex);
        }
      }
    };

    _proto.getGroup = function getGroup(group) {
      let css = '';

      if (group >= this.length || this.groupSizes[group] === 0) {
        return css;
      }

      const length = this.groupSizes[group];
      const startIndex = this.indexOfGroup(group);
      const endIndex = startIndex + length;

      for (let i = startIndex; i < endIndex; i++) {
        css += `${this.tag.getRule(i)  }\n`;
      }

      return css;
    };

    return DefaultGroupedTag;
  })();

//
const groupIDRegister = new Map();
const reverseRegister = new Map();
let nextFreeGroup = 1;
const getGroupForId = function getGroupForId(id) {
  if (groupIDRegister.has(id)) {
    return groupIDRegister.get(id);
  }

  const group = nextFreeGroup++;
  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
  return group;
};
const getIdForGroup = function getIdForGroup(group) {
  return reverseRegister.get(group);
};
const setGroupForId = function setGroupForId(id, group) {
  if (group >= nextFreeGroup) {
    nextFreeGroup = group + 1;
  }

  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
};

//
const SELECTOR = `style[${  SC_ATTR  }][${  SC_ATTR_VERSION  }="${  SC_VERSION  }"]`;
const RULE_RE = /(?:\s*)?(.*?){((?:{[^}]*}|(?!{).*?)*)}/g;
const MARKER_RE = new RegExp(`^${  SC_ATTR  }\\.g(\\d+)\\[id="([\\w\\d-]+)"\\]`);
const outputSheet = function outputSheet(sheet) {
  const tag = sheet.getTag();
  const {length} = tag;
  let css = '';

  for (let group = 0; group < length; group++) {
    const id = getIdForGroup(group);
    if (id === undefined) continue;
    const names = sheet.names.get(id);
    const rules = tag.getGroup(group);
    if (names === undefined || rules.length === 0) continue;
    const selector = `${SC_ATTR  }.g${  group  }[id="${  id  }"]`;
    var content = '';

    if (names !== undefined) {
      names.forEach(function(name) {
        if (name.length > 0) {
          content += `${name  },`;
        }
      });
    } // NOTE: It's easier to collect rules and have the marker
    // after the actual rules to simplify the rehydration

    css += `${  rules  }${selector  }{content:"${  content  }"}\n`;
  }

  return css;
};

const rehydrateNamesFromContent = function rehydrateNamesFromContent(sheet, id, content) {
  const names = content.split(',');
  let name;

  for (let i = 0, l = names.length; i < l; i++) {
    // eslint-disable-next-line
    if ((name = names[i])) {
      sheet.registerName(id, name);
    }
  }
};

const rehydrateSheetFromTag = function rehydrateSheetFromTag(sheet, style) {
  const rawHTML = style.innerHTML;
  const rules = [];
  let parts; // parts = [match, selector, content]
  // eslint-disable-next-line no-cond-assign

  while ((parts = RULE_RE.exec(rawHTML))) {
    const marker = parts[1].match(MARKER_RE);

    if (marker) {
      const group = parseInt(marker[1], 10) | 0;
      const id = marker[2];

      if (group !== 0) {
        // Rehydrate componentId to group index mapping
        setGroupForId(id, group); // Rehydrate names and rules
        // looks like: data-styled.g11[id="idA"]{content:"nameA,"}

        rehydrateNamesFromContent(sheet, id, parts[2].split('"')[1]);
        sheet.getTag().insertRules(group, rules);
      }

      rules.length = 0;
    } else {
      rules.push(parts[0].trim());
    }
  }
};

const rehydrateSheet = function rehydrateSheet(sheet) {
  const nodes = document.querySelectorAll(SELECTOR);

  for (let i = 0, l = nodes.length; i < l; i++) {
    const node = nodes[i];

    if (node && node.getAttribute(SC_ATTR) !== SC_ATTR_ACTIVE) {
      rehydrateSheetFromTag(sheet, node);

      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  }
};

let SHOULD_REHYDRATE = IS_BROWSER;
const defaultOptions = {
  isServer: !IS_BROWSER,
  useCSSOMInjection: !DISABLE_SPEEDY,
};
/** Contains the main stylesheet logic for stringification and caching */

const StyleSheet =
  /* #__PURE__ */
  (function() {
    /** Register a group ID to give it an index */
    StyleSheet.registerId = function registerId(id) {
      return getGroupForId(id);
    };

    function StyleSheet(options, globalStyles, names) {
      if (options === void 0) {
        options = defaultOptions;
      }

      if (globalStyles === void 0) {
        globalStyles = {};
      }

      this.options = _extends({}, defaultOptions, options);
      this.gs = globalStyles;
      this.names = new Map(names); // We rehydrate only once and use the sheet that is created first

      if (!this.options.isServer && IS_BROWSER && SHOULD_REHYDRATE) {
        SHOULD_REHYDRATE = false;
        rehydrateSheet(this);
      }
    }

    const _proto = StyleSheet.prototype;

    _proto.reconstructWithOptions = function reconstructWithOptions(options) {
      return new StyleSheet(_extends({}, this.options, options), this.gs, this.names);
    };

    _proto.allocateGSInstance = function allocateGSInstance(id) {
      return (this.gs[id] = (this.gs[id] || 0) + 1);
    };
    /** Lazily initialises a GroupedTag for when it's actually needed */

    _proto.getTag = function getTag() {
      return this.tag || (this.tag = makeGroupedTag(makeTag(this.options)));
    };
    /** Check whether a name is known for caching */

    _proto.hasNameForId = function hasNameForId(id, name) {
      return this.names.has(id) && this.names.get(id).has(name);
    };
    /** Mark a group's name as known for caching */

    _proto.registerName = function registerName(id, name) {
      getGroupForId(id);

      if (!this.names.has(id)) {
        const groupNames = new Set();
        groupNames.add(name);
        this.names.set(id, groupNames);
      } else {
        this.names.get(id).add(name);
      }
    };
    /** Insert new rules which also marks the name as known */

    _proto.insertRules = function insertRules(id, name, rules) {
      this.registerName(id, name);
      this.getTag().insertRules(getGroupForId(id), rules);
    };
    /** Clears all cached names for a given group ID */

    _proto.clearNames = function clearNames(id) {
      if (this.names.has(id)) {
        this.names.get(id).clear();
      }
    };
    /** Clears all rules for a given group ID */

    _proto.clearRules = function clearRules(id) {
      this.getTag().clearGroup(getGroupForId(id));
      this.clearNames(id);
    };
    /** Clears the entire tag which deletes all rules but not its names */

    _proto.clearTag = function clearTag() {
      // NOTE: This does not clear the names, since it's only used during SSR
      // so that we can continuously output only new rules
      this.tag = undefined;
    };
    /** Outputs the current sheet as a CSS string with markers for SSR */

    _proto.toString = function toString() {
      return outputSheet(this);
    };

    return StyleSheet;
  })();

//

const errorMap = {
  '1': 'Cannot create styled-component for component: %s.\n\n',
  '2':
    "Can't collect styles once you've consumed a `ServerStyleSheet`'s styles! `ServerStyleSheet` is a one off instance for each server-side render cycle.\n\n- Are you trying to reuse it across renders?\n- Are you accidentally calling collectStyles twice?\n\n",
  '3':
    'Streaming SSR is only supported in a Node.js environment; Please do not try to call this method in the browser.\n\n',
  '4':
    'The `StyleSheetManager` expects a valid target or sheet prop!\n\n- Does this error occur on the client and is your target falsy?\n- Does this error occur on the server and is the sheet falsy?\n\n',
  '5':
    'The clone method cannot be used on the client!\n\n- Are you running in a client-like environment on the server?\n- Are you trying to run SSR on the client?\n\n',
  '6':
    "Trying to insert a new style tag, but the given Node is unmounted!\n\n- Are you using a custom target that isn't mounted?\n- Does your document not have a valid head element?\n- Have you accidentally removed a style tag manually?\n\n",
  '7':
    'ThemeProvider: Please return an object from your "theme" prop function, e.g.\n\n```js\ntheme={() => ({})}\n```\n\n',
  '8': 'ThemeProvider: Please make your "theme" prop an object.\n\n',
  '9': 'Missing document `<head>`\n\n',
  '10':
    'Cannot find a StyleSheet instance. Usually this happens if there are multiple copies of styled-components loaded at once. Check out this issue for how to troubleshoot and fix the common cases where this situation can happen: https://github.com/styled-components/styled-components/issues/1941#issuecomment-417862021\n\n',
  '11':
    '_This error was replaced with a dev-time warning, it will be deleted for v4 final._ [createGlobalStyle] received children which will not be rendered. Please use the component without passing children elements.\n\n',
  '12':
    'It seems you are interpolating a keyframe declaration (%s) into an untagged string. This was supported in styled-components v3, but is not longer supported in v4 as keyframes are now injected on-demand. Please wrap your string in the css\\`\\` helper which ensures the styles are injected correctly. See https://www.styled-components.com/docs/api#css\n\n',
  '13':
    '%s is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.\n\n',
  '14': 'ThemeProvider: "theme" prop is required.\n\n',
  '15':
    "A stylis plugin has been supplied that is not named. We need a name for each plugin to be able to prevent styling collisions between different stylis configurations within the same app. Before you pass your plugin to `<StyleSheetManager stylisPlugins={[]}>`, please make sure each plugin is uniquely-named, e.g.\n\n```js\nObject.defineProperty(importedPlugin, 'name', { value: 'some-unique-name' });\n```\n",
};

//
const ERRORS = process.env.NODE_ENV !== 'production' ? errorMap : {};
/**
 * super basic version of sprintf
 */

function format() {
  let a = arguments.length <= 0 ? undefined : arguments[0];
  const b = [];

  for (let c = 1, len = arguments.length; c < len; c += 1) {
    b.push(c < 0 || arguments.length <= c ? undefined : arguments[c]);
  }

  b.forEach(function(d) {
    a = a.replace(/%[a-z]/, d);
  });
  return a;
}
/**
 * Create an error file out of errors.md for development and a simple web link to the full errors
 * in production mode.
 */

function throwStyledComponentsError(code) {
  for (
    var _len = arguments.length, interpolations = new Array(_len > 1 ? _len - 1 : 0), _key = 1;
    _key < _len;
    _key++
  ) {
    interpolations[_key - 1] = arguments[_key];
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `An error occurred. See https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/utils/errors.md#${ 
        code 
        } for more information.${ 
        interpolations.length > 0 ? ` Additional arguments: ${  interpolations.join(', ')}` : ''}`
    );
  } else {
    throw new Error(format.apply(void 0, [ERRORS[code]].concat(interpolations)).trim());
  }
}

//

/* eslint-disable */
var SEED = 5381 | 0; // When we have separate strings it's useful to run a progressive
// version of djb2 where we pretend that we're still looping over
// the same string

var phash = function phash(h, x) {
  for (var i = 0, l = x.length; i < l; i++) {
    h = (h << 5) + h + x.charCodeAt(i);
  }

  return h;
}; // This is a djb2 hashing function

var hash = function hash(x) {
  return phash(SEED, x) >>> 0;
};

/**
 * MIT License
 *
 * Copyright (c) 2016 Sultan Tarimo
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function insertRulePlugin(insertRule) {
  var delimiter = '/*|*/';
  var needle = delimiter + '}';

  function toSheet(block) {
    if (block) {
      try {
        insertRule(block + '}');
      } catch (e) {}
    }
  }

  return function ruleSheet(
    context,
    content,
    selectors,
    parents,
    line,
    column,
    length,
    ns,
    depth,
    at
  ) {
    switch (context) {
      // property
      case 1:
        // @import
        if (depth === 0 && content.charCodeAt(0) === 64) return insertRule(content + ';'), '';
        break;
      // selector

      case 2:
        if (ns === 0) return content + delimiter;
        break;
      // at-rule

      case 3:
        switch (ns) {
          // @font-face, @page
          case 102:
          case 112:
            return insertRule(selectors[0] + content), '';

          default:
            return content + (at === 0 ? delimiter : '');
        }

      case -2:
        content.split(needle).forEach(toSheet);
    }
  };
}

var COMMENT_REGEX = /^\s*\/\/.*$/gm;
function createStylisInstance(_temp) {
  var _ref = _temp === void 0 ? EMPTY_OBJECT : _temp,
    _ref$options = _ref.options,
    options = _ref$options === void 0 ? EMPTY_OBJECT : _ref$options,
    _ref$plugins = _ref.plugins,
    plugins = _ref$plugins === void 0 ? EMPTY_ARRAY : _ref$plugins;

  var stylis = new Stylis(options); // Wrap `insertRulePlugin to build a list of rules,
  // and then make our own plugin to return the rules. This
  // makes it easier to hook into the existing SSR architecture

  var parsingRules = []; // eslint-disable-next-line consistent-return

  var returnRulesPlugin = function returnRulesPlugin(context) {
    if (context === -2) {
      var parsedRules = parsingRules;
      parsingRules = [];
      return parsedRules;
    }
  };

  var parseRulesPlugin = insertRulePlugin(function(rule) {
    parsingRules.push(rule);
  });

  var _componentId;

  var _selector;

  var _selectorRegexp;

  var selfReferenceReplacer = function selfReferenceReplacer(match, offset, string) {
    if (
      // the first self-ref is always untouched
      offset > 0 && // there should be at least two self-refs to do a replacement (.b > .b)
      string.slice(0, offset).indexOf(_selector) !== -1 && // no consecutive self refs (.b.b); that is a precedence boost and treated differently
      string.slice(offset - _selector.length, offset) !== _selector
    ) {
      return '.' + _componentId;
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
   * https://github.com/thysultan/stylis.js#plugins <- more info about the context phase values
   * "2" means this plugin is taking effect at the very end after all other processing is complete
   */

  var selfReferenceReplacementPlugin = function selfReferenceReplacementPlugin(
    context,
    _,
    selectors
  ) {
    if (context === 2 && selectors.length && selectors[0].lastIndexOf(_selector) > 0) {
      // eslint-disable-next-line no-param-reassign
      selectors[0] = selectors[0].replace(_selectorRegexp, selfReferenceReplacer);
    }
  };

  stylis.use(
    [].concat(plugins, [selfReferenceReplacementPlugin, parseRulesPlugin, returnRulesPlugin])
  );

  function stringifyRules(css, selector, prefix, componentId) {
    if (componentId === void 0) {
      componentId = '&';
    }

    var flatCSS = css.replace(COMMENT_REGEX, '');
    var cssStr = selector && prefix ? prefix + ' ' + selector + ' { ' + flatCSS + ' }' : flatCSS; // stylis has no concept of state to be passed to plugins
    // but since JS is single=threaded, we can rely on that to ensure
    // these properties stay in sync with the current stylis run

    _componentId = componentId;
    _selector = selector;
    _selectorRegexp = new RegExp('\\' + _selector + '\\b', 'g');
    return stylis(prefix || !selector ? '' : selector, cssStr);
  }

  stringifyRules.hash = plugins
    .reduce(function(acc, plugin) {
      if (!plugin.name) {
        throwStyledComponentsError(15);
      }

      return phash(acc, plugin.name);
    }, SEED)
    .toString();
  return stringifyRules;
}

//
var StyleSheetContext = React.createContext();
var StyleSheetConsumer = StyleSheetContext.Consumer;
var StylisContext = React.createContext();
var StylisConsumer = StylisContext.Consumer;
var masterSheet = new StyleSheet();
var masterStylis = createStylisInstance();
function useStyleSheet() {
  return useContext(StyleSheetContext) || masterSheet;
}
function useStylis() {
  return useContext(StylisContext) || masterStylis;
}
function StyleSheetManager(props) {
  var _useState = useState(props.stylisPlugins),
    plugins = _useState[0],
    setPlugins = _useState[1];

  var contextStyleSheet = useStyleSheet();
  var styleSheet = useMemo(
    function() {
      var sheet = contextStyleSheet;

      if (props.sheet) {
        // eslint-disable-next-line prefer-destructuring
        sheet = props.sheet;
      } else if (props.target) {
        sheet = sheet.reconstructWithOptions({
          target: props.target,
        });
      }

      if (props.disableCSSOMInjection) {
        sheet = sheet.reconstructWithOptions({
          useCSSOMInjection: false,
        });
      }

      return sheet;
    },
    [props.disableCSSOMInjection, props.sheet, props.target]
  );
  var stylis = useMemo(
    function() {
      return createStylisInstance({
        options: {
          prefix: !props.disableVendorPrefixes,
        },
        plugins: plugins,
      });
    },
    [props.disableVendorPrefixes, plugins]
  );
  useEffect(
    function() {
      if (!shallowequal(plugins, props.stylisPlugins)) setPlugins(props.stylisPlugins);
    },
    [props.stylisPlugins]
  );
  return React.createElement(
    StyleSheetContext.Provider,
    {
      value: styleSheet,
    },
    React.createElement(
      StylisContext.Provider,
      {
        value: stylis,
      },
      process.env.NODE_ENV !== 'production' ? React.Children.only(props.children) : props.children
    )
  );
}

//

var Keyframes =
  /*#__PURE__*/
  (function() {
    function Keyframes(name, stringifyArgs) {
      var _this = this;

      this.inject = function(styleSheet) {
        if (!styleSheet.hasNameForId(_this.id, _this.name)) {
          styleSheet.insertRules(
            _this.id,
            _this.name,
            masterStylis.apply(void 0, _this.stringifyArgs)
          );
        }
      };

      this.toString = function() {
        return throwStyledComponentsError(12, String(_this.name));
      };

      this.name = name;
      this.id = 'sc-keyframes-' + name;
      this.stringifyArgs = stringifyArgs;
    }

    var _proto = Keyframes.prototype;

    _proto.getName = function getName() {
      return this.name;
    };

    return Keyframes;
  })();

//

/**
 * inlined version of
 * https://github.com/facebook/fbjs/blob/master/packages/fbjs/src/core/hyphenateStyleName.js
 */
var uppercasePattern = /([A-Z])/g;
var msPattern = /^ms-/;
/**
 * Hyphenates a camelcased CSS property name, for example:
 *
 *   > hyphenateStyleName('backgroundColor')
 *   < "background-color"
 *   > hyphenateStyleName('MozTransition')
 *   < "-moz-transition"
 *   > hyphenateStyleName('msTransition')
 *   < "-ms-transition"
 *
 * As Modernizr suggests (http://modernizr.com/docs/#prefixed), an `ms` prefix
 * is converted to `-ms-`.
 *
 * @param {string} string
 * @return {string}
 */

function hyphenateStyleName(string) {
  return string
    .replace(uppercasePattern, '-$1')
    .toLowerCase()
    .replace(msPattern, '-ms-');
}

//

function addUnitIfNeeded(name, value) {
  // https://github.com/amilajack/eslint-plugin-flowtype-errors/issues/133
  // $FlowFixMe
  if (value == null || typeof value === 'boolean' || value === '') {
    return '';
  }

  if (typeof value === 'number' && value !== 0 && !(name in unitless)) {
    return value + 'px'; // Presumes implicit 'px' suffix for unitless numbers
  }

  return String(value).trim();
}

//
/**
 * It's falsish not falsy because 0 is allowed.
 */

var isFalsish = function isFalsish(chunk) {
  return chunk === undefined || chunk === null || chunk === false || chunk === '';
};

var objToCssArray = function objToCssArray(obj, prevKey) {
  var rules = [];
  var keys = Object.keys(obj);
  keys.forEach(function(key) {
    if (!isFalsish(obj[key])) {
      if (isPlainObject(obj[key])) {
        rules.push.apply(rules, objToCssArray(obj[key], key));
        return rules;
      } else if (isFunction(obj[key])) {
        rules.push(hyphenateStyleName(key) + ':', obj[key], ';');
        return rules;
      }

      rules.push(hyphenateStyleName(key) + ': ' + addUnitIfNeeded(key, obj[key]) + ';');
    }

    return rules;
  });
  return prevKey ? [prevKey + ' {'].concat(rules, ['}']) : rules;
};
function flatten(chunk, executionContext, styleSheet) {
  if (Array.isArray(chunk)) {
    var ruleSet = [];

    for (var i = 0, len = chunk.length, result; i < len; i += 1) {
      result = flatten(chunk[i], executionContext, styleSheet);
      if (result === '') continue;
      else if (Array.isArray(result)) ruleSet.push.apply(ruleSet, result);
      else ruleSet.push(result);
    }

    return ruleSet;
  }

  if (isFalsish(chunk)) {
    return '';
  }
  /* Handle other components */

  if (isStyledComponent(chunk)) {
    return '.' + chunk.styledComponentId;
  }
  /* Either execute or defer the function */

  if (isFunction(chunk)) {
    if (isStatelessFunction(chunk) && executionContext) {
      var _result = chunk(executionContext);

      if (process.env.NODE_ENV !== 'production' && isElement(_result)) {
        // eslint-disable-next-line no-console
        console.warn(
          getComponentName(chunk) +
            ' is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.'
        );
      }

      return flatten(_result, executionContext, styleSheet);
    } else return chunk;
  }

  if (chunk instanceof Keyframes) {
    if (styleSheet) {
      chunk.inject(styleSheet);
      return chunk.getName();
    } else return chunk;
  }
  /* Handle objects */

  return isPlainObject(chunk) ? objToCssArray(chunk) : chunk.toString();
}

//
function css(styles) {
  for (
    var _len = arguments.length, interpolations = new Array(_len > 1 ? _len - 1 : 0), _key = 1;
    _key < _len;
    _key++
  ) {
    interpolations[_key - 1] = arguments[_key];
  }

  if (isFunction(styles) || isPlainObject(styles)) {
    // $FlowFixMe
    return flatten(interleave(EMPTY_ARRAY, [styles].concat(interpolations)));
  }

  if (interpolations.length === 0 && styles.length === 1 && typeof styles[0] === 'string') {
    // $FlowFixMe
    return styles;
  } // $FlowFixMe

  return flatten(interleave(styles, interpolations));
}

function constructWithOptions(componentConstructor, tag, options) {
  if (options === void 0) {
    options = EMPTY_OBJECT;
  }

  if (!isValidElementType(tag)) {
    return throwStyledComponentsError(1, String(tag));
  }
  /* This is callable directly as a template function */
  // $FlowFixMe: Not typed to avoid destructuring arguments

  var templateFunction = function templateFunction() {
    return componentConstructor(tag, options, css.apply(void 0, arguments));
  };
  /* If config methods are called, wrap up a new template function and merge options */

  templateFunction.withConfig = function(config) {
    return constructWithOptions(componentConstructor, tag, _extends({}, options, config));
  };
  /* Modify/inject new props at runtime */

  templateFunction.attrs = function(attrs) {
    return constructWithOptions(
      componentConstructor,
      tag,
      _extends({}, options, {
        attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
      })
    );
  };

  return templateFunction;
}

/* eslint-disable */

/**
  mixin-deep; https://github.com/jonschlinkert/mixin-deep
  Inlined such that it will be consistently transpiled to an IE-compatible syntax.

  The MIT License (MIT)

  Copyright (c) 2014-present, Jon Schlinkert.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/
var isObject = function isObject(val) {
  return (
    typeof val === 'function' || (typeof val === 'object' && val !== null && !Array.isArray(val))
  );
};

var isValidKey = function isValidKey(key) {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
};

function mixin(target, val, key) {
  var obj = target[key];

  if (isObject(val) && isObject(obj)) {
    mixinDeep(obj, val);
  } else {
    target[key] = val;
  }
}

function mixinDeep(target) {
  for (
    var _len = arguments.length, rest = new Array(_len > 1 ? _len - 1 : 0), _key = 1;
    _key < _len;
    _key++
  ) {
    rest[_key - 1] = arguments[_key];
  }

  for (var _i = 0, _rest = rest; _i < _rest.length; _i++) {
    var obj = _rest[_i];

    if (isObject(obj)) {
      for (var key in obj) {
        if (isValidKey(key)) {
          mixin(target, obj[key], key);
        }
      }
    }
  }

  return target;
}

//

/* eslint-disable no-bitwise */
var AD_REPLACER_R = /(a)(d)/gi;
/* This is the "capacity" of our alphabet i.e. 2x26 for all letters plus their capitalised
 * counterparts */

var charsLength = 52;
/* start at 75 for 'a' until 'z' (25) and then start at 65 for capitalised letters */

var getAlphabeticChar = function getAlphabeticChar(code) {
  return String.fromCharCode(code + (code > 25 ? 39 : 97));
};
/* input a number, usually a hash and convert it to base-52 */

function generateAlphabeticName(code) {
  var name = '';
  var x;
  /* get a char and divide by alphabet-length */

  for (x = Math.abs(code); x > charsLength; x = (x / charsLength) | 0) {
    name = getAlphabeticChar(x % charsLength) + name;
  }

  return (getAlphabeticChar(x % charsLength) + name).replace(AD_REPLACER_R, '$1-$2');
}

//
function isStaticRules(rules) {
  for (var i = 0; i < rules.length; i += 1) {
    var rule = rules[i];

    if (isFunction(rule) && !isStyledComponent(rule)) {
      // functions are allowed to be static if they're just being
      // used to get the classname of a nested styled component
      return false;
    }
  }

  return true;
}

//
/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */

var ComponentStyle =
  /*#__PURE__*/
  (function() {
    function ComponentStyle(rules, componentId) {
      this.rules = rules;
      this.staticRulesId = '';
      this.isStatic = process.env.NODE_ENV === 'production' && isStaticRules(rules);
      this.componentId = componentId;
      this.baseHash = hash(componentId); // NOTE: This registers the componentId, which ensures a consistent order
      // for this component's styles compared to others

      StyleSheet.registerId(componentId);
    }
    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a .hash1234 {}
     * Returns the hash to be injected on render()
     * */

    var _proto = ComponentStyle.prototype;

    _proto.generateAndInjectStyles = function generateAndInjectStyles(
      executionContext,
      styleSheet,
      stylis
    ) {
      var componentId = this.componentId; // force dynamic classnames if user-supplied stylis plugins are in use

      if (this.isStatic && !stylis.hash) {
        if (this.staticRulesId && styleSheet.hasNameForId(componentId, this.staticRulesId)) {
          return this.staticRulesId;
        }

        var cssStatic = flatten(this.rules, executionContext, styleSheet).join('');
        var name = generateAlphabeticName(phash(this.baseHash, cssStatic.length) >>> 0);

        if (!styleSheet.hasNameForId(componentId, name)) {
          var cssStaticFormatted = stylis(cssStatic, '.' + name, undefined, componentId);
          styleSheet.insertRules(componentId, name, cssStaticFormatted);
        }

        this.staticRulesId = name;
        return name;
      } else {
        var length = this.rules.length;
        var dynamicHash = phash(this.baseHash, stylis.hash);
        var css = '';

        for (var i = 0; i < length; i++) {
          var partRule = this.rules[i];

          if (typeof partRule === 'string') {
            css += partRule;
            if (process.env.NODE_ENV !== 'production')
              dynamicHash = phash(dynamicHash, partRule + i);
          } else {
            var partChunk = flatten(partRule, executionContext, styleSheet);
            var partString = Array.isArray(partChunk) ? partChunk.join('') : partChunk;
            dynamicHash = phash(dynamicHash, partString + i);
            css += partString;
          }
        }

        var _name = generateAlphabeticName(dynamicHash >>> 0);

        if (!styleSheet.hasNameForId(componentId, _name)) {
          var cssFormatted = stylis(css, '.' + _name, undefined, componentId);
          styleSheet.insertRules(componentId, _name, cssFormatted);
        }

        return _name;
      }
    };

    return ComponentStyle;
  })();

//
var LIMIT = 200;
var createWarnTooManyClasses = function(displayName, componentId) {
  var generatedClasses = {};
  var warningSeen = false;
  return function(className) {
    if (!warningSeen) {
      generatedClasses[className] = true;

      if (Object.keys(generatedClasses).length >= LIMIT) {
        // Unable to find latestRule in test environment.

        /* eslint-disable no-console, prefer-template */
        var parsedIdString = componentId ? ' with the id of "' + componentId + '"' : '';
        console.warn(
          'Over ' +
            LIMIT +
            ' classes were generated for component ' +
            displayName +
            parsedIdString +
            '.\n' +
            'Consider using the attrs method, together with a style object for frequently changed styles.\n' +
            'Example:\n' +
            '  const Component = styled.div.attrs(props => ({\n' +
            '    style: {\n' +
            '      background: props.background,\n' +
            '    },\n' +
            '  }))`width: 100%;`\n\n' +
            '  <Component />'
        );
        warningSeen = true;
        generatedClasses = {};
      }
    }
  };
};

//
var determineTheme = function(props, providedTheme, defaultProps) {
  if (defaultProps === void 0) {
    defaultProps = EMPTY_OBJECT;
  }

  return (props.theme !== defaultProps.theme && props.theme) || providedTheme || defaultProps.theme;
};

//
var escapeRegex = /[[\].#*$><+~=|^:(),"'`-]+/g;
var dashesAtEnds = /(^-|-$)/g;
/**
 * TODO: Explore using CSS.escape when it becomes more available
 * in evergreen browsers.
 */

function escape(str) {
  return str // Replace all possible CSS selectors
    .replace(escapeRegex, '-') // Remove extraneous hyphens at the start and end
    .replace(dashesAtEnds, '');
}

//
function isTag(target) {
  return (
    typeof target === 'string' &&
    (process.env.NODE_ENV !== 'production'
      ? target.charAt(0) === target.charAt(0).toLowerCase()
      : true)
  );
}

//
function generateDisplayName(target) {
  // $FlowFixMe
  return isTag(target) ? 'styled.' + target : 'Styled(' + getComponentName(target) + ')';
}

//
var generateComponentId = function(str) {
  return generateAlphabeticName(hash(str));
};

/**
 * Convenience function for joining strings to form className chains
 */
function joinStrings(a, b) {
  return a && b ? a + ' ' + b : a || b;
}

var ThemeContext = React.createContext();
var ThemeConsumer = ThemeContext.Consumer;

function mergeTheme(theme, outerTheme) {
  if (!theme) {
    return throwStyledComponentsError(14);
  }

  if (isFunction(theme)) {
    var mergedTheme = theme(outerTheme);

    if (
      process.env.NODE_ENV !== 'production' &&
      (mergedTheme === null || Array.isArray(mergedTheme) || typeof mergedTheme !== 'object')
    ) {
      return throwStyledComponentsError(7);
    }

    return mergedTheme;
  }

  if (Array.isArray(theme) || typeof theme !== 'object') {
    return throwStyledComponentsError(8);
  }

  return outerTheme ? _extends({}, outerTheme, theme) : theme;
}
/**
 * Provide a theme to an entire react component tree via context
 */

function ThemeProvider(props) {
  var outerTheme = useContext(ThemeContext);
  var themeContext = useMemo(
    function() {
      return mergeTheme(props.theme, outerTheme);
    },
    [props.theme, outerTheme]
  );

  if (!props.children) {
    return null;
  }

  return React.createElement(
    ThemeContext.Provider,
    {
      value: themeContext,
    },
    props.children
  );
}

/* global $Call */

var identifiers = {};
/* We depend on components having unique IDs */

function generateId(displayName, parentComponentId) {
  var name = typeof displayName !== 'string' ? 'sc' : escape(displayName); // Ensure that no displayName can lead to duplicate componentIds

  identifiers[name] = (identifiers[name] || 0) + 1;
  var componentId = name + '-' + generateComponentId(name + identifiers[name]);
  return parentComponentId ? parentComponentId + '-' + componentId : componentId;
}

function useResolvedAttrs(theme, props, attrs) {
  if (theme === void 0) {
    theme = EMPTY_OBJECT;
  }

  // NOTE: can't memoize this
  // returns [context, resolvedAttrs]
  // where resolvedAttrs is only the things injected by the attrs themselves
  var context = _extends({}, props, {
    theme: theme,
  });

  var resolvedAttrs = {};
  attrs.forEach(function(attrDef) {
    var resolvedAttrDef = attrDef;
    var key;

    if (isFunction(resolvedAttrDef)) {
      resolvedAttrDef = resolvedAttrDef(context);
    }
    /* eslint-disable guard-for-in */

    for (key in resolvedAttrDef) {
      context[key] = resolvedAttrs[key] =
        key === 'className'
          ? joinStrings(resolvedAttrs[key], resolvedAttrDef[key])
          : resolvedAttrDef[key];
    }
    /* eslint-enable guard-for-in */
  });
  return [context, resolvedAttrs];
}

function useInjectedStyle(componentStyle, hasAttrs, resolvedAttrs, warnTooManyClasses) {
  var styleSheet = useStyleSheet();
  var stylis = useStylis(); // statically styled-components don't need to build an execution context object,
  // and shouldn't be increasing the number of class names

  var isStatic = componentStyle.isStatic && !hasAttrs;
  var className = isStatic
    ? componentStyle.generateAndInjectStyles(EMPTY_OBJECT, styleSheet, stylis)
    : componentStyle.generateAndInjectStyles(resolvedAttrs, styleSheet, stylis);
  useDebugValue(className);

  if (process.env.NODE_ENV !== 'production' && !isStatic && warnTooManyClasses) {
    warnTooManyClasses(className);
  }

  return className;
}

function useStyledComponentImpl(forwardedComponent, props, forwardedRef) {
  var componentAttrs = forwardedComponent.attrs,
    componentStyle = forwardedComponent.componentStyle,
    defaultProps = forwardedComponent.defaultProps,
    foldedComponentIds = forwardedComponent.foldedComponentIds,
    styledComponentId = forwardedComponent.styledComponentId,
    target = forwardedComponent.target;
  useDebugValue(styledComponentId); // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
  // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
  // should be an immutable value, but behave for now.

  var theme = determineTheme(props, useContext(ThemeContext), defaultProps);

  var _useResolvedAttrs = useResolvedAttrs(theme || EMPTY_OBJECT, props, componentAttrs),
    context = _useResolvedAttrs[0],
    attrs = _useResolvedAttrs[1];

  var generatedClassName = useInjectedStyle(
    componentStyle,
    componentAttrs.length > 0,
    context,
    process.env.NODE_ENV !== 'production' ? forwardedComponent.warnTooManyClasses : undefined
  );
  var refToForward = forwardedRef;
  var elementToBeCreated = attrs.as || props.as || target;
  var isTargetTag = isTag(elementToBeCreated);
  var computedProps = attrs !== props ? _extends({}, props, attrs) : props;
  var shouldFilterProps = isTargetTag || 'as' in computedProps || 'forwardedAs' in computedProps;
  var propsForElement = shouldFilterProps ? {} : _extends({}, computedProps);

  if (shouldFilterProps) {
    // eslint-disable-next-line guard-for-in
    for (var key in computedProps) {
      if (key === 'forwardedAs') {
        propsForElement.as = computedProps[key];
      } else if (key !== 'as' && key !== 'forwardedAs' && (!isTargetTag || validAttr(key))) {
        // Don't pass through non HTML tags through to HTML elements
        propsForElement[key] = computedProps[key];
      }
    }
  }

  if (props.style && attrs.style !== props.style) {
    propsForElement.style = _extends({}, props.style, attrs.style);
  }

  propsForElement.className = Array.prototype
    .concat(
      foldedComponentIds,
      styledComponentId,
      generatedClassName !== styledComponentId ? generatedClassName : null,
      props.className,
      attrs.className
    )
    .filter(Boolean)
    .join(' ');
  propsForElement.ref = refToForward;
  return createElement(elementToBeCreated, propsForElement);
}

function createStyledComponent(target, options, rules) {
  var isTargetStyledComp = isStyledComponent(target);
  var isCompositeComponent = !isTag(target);
  var _options$displayName = options.displayName,
    displayName =
      _options$displayName === void 0 ? generateDisplayName(target) : _options$displayName,
    _options$componentId = options.componentId,
    componentId =
      _options$componentId === void 0
        ? generateId(options.displayName, options.parentComponentId)
        : _options$componentId,
    _options$attrs = options.attrs,
    attrs = _options$attrs === void 0 ? EMPTY_ARRAY : _options$attrs;
  var styledComponentId =
    options.displayName && options.componentId
      ? escape(options.displayName) + '-' + options.componentId
      : options.componentId || componentId; // fold the underlying StyledComponent attrs up (implicit extend)

  var finalAttrs = // $FlowFixMe
    isTargetStyledComp && target.attrs
      ? Array.prototype.concat(target.attrs, attrs).filter(Boolean)
      : attrs;
  var componentStyle = new ComponentStyle(
    isTargetStyledComp // fold the underlying StyledComponent rules up (implicit extend)
      ? // $FlowFixMe
        target.componentStyle.rules.concat(rules)
      : rules,
    styledComponentId
  );
  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */

  var WrappedStyledComponent; // eslint-disable-next-line react-hooks/rules-of-hooks

  var forwardRef = function forwardRef(props, ref) {
    return useStyledComponentImpl(WrappedStyledComponent, props, ref);
  };

  forwardRef.displayName = displayName; // $FlowFixMe this is a forced cast to merge it StyledComponentWrapperProperties

  WrappedStyledComponent = React.forwardRef(forwardRef);
  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.componentStyle = componentStyle;
  WrappedStyledComponent.displayName = displayName; // this static is used to preserve the cascade of static classes for component selector
  // purposes; this is especially important with usage of the css prop

  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp // $FlowFixMe
    ? Array.prototype.concat(target.foldedComponentIds, target.styledComponentId)
    : EMPTY_ARRAY;
  WrappedStyledComponent.styledComponentId = styledComponentId; // fold the underlying StyledComponent target up since we folded the styles

  WrappedStyledComponent.target = isTargetStyledComp // $FlowFixMe
    ? target.target
    : target; // $FlowFixMe

  WrappedStyledComponent.withComponent = function withComponent(tag) {
    var previousComponentId = options.componentId,
      optionsToCopy = _objectWithoutPropertiesLoose(options, ['componentId']);

    var newComponentId =
      previousComponentId &&
      previousComponentId + '-' + (isTag(tag) ? tag : escape(getComponentName(tag)));

    var newOptions = _extends({}, optionsToCopy, {
      attrs: finalAttrs,
      componentId: newComponentId,
    });

    return createStyledComponent(tag, newOptions, rules);
  }; // $FlowFixMe

  Object.defineProperty(WrappedStyledComponent, 'defaultProps', {
    get: function get() {
      return this._foldedDefaultProps;
    },
    set: function set(obj) {
      // $FlowFixMe
      this._foldedDefaultProps = isTargetStyledComp ? mixinDeep({}, target.defaultProps, obj) : obj;
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(
      displayName,
      styledComponentId
    );
  } // $FlowFixMe

  WrappedStyledComponent.toString = function() {
    return '.' + WrappedStyledComponent.styledComponentId;
  };

  if (isCompositeComponent) {
    hoist(WrappedStyledComponent, target, {
      // all SC-specific things should not be hoisted
      attrs: true,
      componentStyle: true,
      displayName: true,
      foldedComponentIds: true,
      self: true,
      styledComponentId: true,
      target: true,
      withComponent: true,
    });
  }

  return WrappedStyledComponent;
}

//
// Thanks to ReactDOMFactories for this handy list!
var domElements = [
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'big',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'keygen',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'marquee',
  'menu',
  'menuitem',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'var',
  'video',
  'wbr', // SVG
  'circle',
  'clipPath',
  'defs',
  'ellipse',
  'foreignObject',
  'g',
  'image',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'svg',
  'text',
  'tspan',
];

//

var styled = function styled(tag) {
  return constructWithOptions(createStyledComponent, tag);
}; // Shorthands for all valid HTML Elements

domElements.forEach(function(domElement) {
  styled[domElement] = styled(domElement);
});

//

var GlobalStyle =
  /*#__PURE__*/
  (function() {
    function GlobalStyle(rules, componentId) {
      this.rules = rules;
      this.componentId = componentId;
      this.isStatic = isStaticRules(rules);
    }

    var _proto = GlobalStyle.prototype;

    _proto.createStyles = function createStyles(instance, executionContext, styleSheet, stylis) {
      var flatCSS = flatten(this.rules, executionContext, styleSheet);
      var css = stylis(flatCSS.join(''), '');
      var id = this.componentId + instance; // NOTE: We use the id as a name as well, since these rules never change

      styleSheet.insertRules(id, id, css);
    };

    _proto.removeStyles = function removeStyles(instance, styleSheet) {
      styleSheet.clearRules(this.componentId + instance);
    };

    _proto.renderStyles = function renderStyles(instance, executionContext, styleSheet, stylis) {
      StyleSheet.registerId(this.componentId + instance); // NOTE: Remove old styles, then inject the new ones

      this.removeStyles(instance, styleSheet);
      this.createStyles(instance, executionContext, styleSheet, stylis);
    };

    return GlobalStyle;
  })();

function createGlobalStyle(strings) {
  for (
    var _len = arguments.length, interpolations = new Array(_len > 1 ? _len - 1 : 0), _key = 1;
    _key < _len;
    _key++
  ) {
    interpolations[_key - 1] = arguments[_key];
  }

  var rules = css.apply(void 0, [strings].concat(interpolations));
  var styledComponentId = 'sc-global-' + generateComponentId(JSON.stringify(rules));
  var globalStyle = new GlobalStyle(rules, styledComponentId);

  function GlobalStyleComponent(props) {
    var styleSheet = useStyleSheet();
    var stylis = useStylis();
    var theme = useContext(ThemeContext);
    var instanceRef = useRef(null);

    if (instanceRef.current === null) {
      instanceRef.current = styleSheet.allocateGSInstance(styledComponentId);
    }

    var instance = instanceRef.current;

    if (process.env.NODE_ENV !== 'production' && React.Children.count(props.children)) {
      // eslint-disable-next-line no-console
      console.warn(
        'The global style component ' +
          styledComponentId +
          ' was given child JSX. createGlobalStyle does not render children.'
      );
    }

    if (globalStyle.isStatic) {
      globalStyle.renderStyles(instance, STATIC_EXECUTION_CONTEXT, styleSheet, stylis);
    } else {
      var context = _extends({}, props, {
        theme: determineTheme(props, theme, GlobalStyleComponent.defaultProps),
      });

      globalStyle.renderStyles(instance, context, styleSheet, stylis);
    }

    useEffect(function() {
      return function() {
        return globalStyle.removeStyles(instance, styleSheet);
      };
    }, EMPTY_ARRAY);
    return null;
  } // $FlowFixMe

  return React.memo(GlobalStyleComponent);
}

//
function keyframes(strings) {
  /* Warning if you've used keyframes on React Native */
  if (
    process.env.NODE_ENV !== 'production' &&
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      '`keyframes` cannot be used on ReactNative, only on the web. To do animation in ReactNative please use Animated.'
    );
  }

  for (
    var _len = arguments.length, interpolations = new Array(_len > 1 ? _len - 1 : 0), _key = 1;
    _key < _len;
    _key++
  ) {
    interpolations[_key - 1] = arguments[_key];
  }

  var rules = css.apply(void 0, [strings].concat(interpolations)).join('');
  var name = generateComponentId(rules);
  return new Keyframes(name, [rules, name, '@keyframes']);
}

var ServerStyleSheet =
  /*#__PURE__*/
  (function() {
    function ServerStyleSheet() {
      var _this = this;

      this._emitSheetCSS = function() {
        var css = _this.instance.toString();

        var nonce = getNonce();
        var attrs = [
          nonce && 'nonce="' + nonce + '"',
          SC_ATTR,
          SC_ATTR_VERSION + '="' + SC_VERSION + '"',
        ];
        var htmlAttr = attrs.filter(Boolean).join(' ');
        return '<style ' + htmlAttr + '>' + css + '</style>';
      };

      this.getStyleTags = function() {
        if (_this.sealed) {
          return throwStyledComponentsError(2);
        }

        return _this._emitSheetCSS();
      };

      this.getStyleElement = function() {
        var _props;

        if (_this.sealed) {
          return throwStyledComponentsError(2);
        }

        var props = ((_props = {}),
        (_props[SC_ATTR] = ''),
        (_props[SC_ATTR_VERSION] = SC_VERSION),
        (_props.dangerouslySetInnerHTML = {
          __html: _this.instance.toString(),
        }),
        _props);
        var nonce = getNonce();

        if (nonce) {
          props.nonce = nonce;
        } // v4 returned an array for this fn, so we'll do the same for v5 for backward compat

        return [
          React.createElement(
            'style',
            _extends({}, props, {
              key: 'sc-0-0',
            })
          ),
        ];
      };

      this.seal = function() {
        _this.sealed = true;
      };

      this.instance = new StyleSheet({
        isServer: true,
      });
      this.sealed = false;
    }

    var _proto = ServerStyleSheet.prototype;

    _proto.collectStyles = function collectStyles(children) {
      if (this.sealed) {
        return throwStyledComponentsError(2);
      }

      return React.createElement(
        StyleSheetManager,
        {
          sheet: this.instance,
        },
        children
      );
    };

    // eslint-disable-next-line consistent-return
    _proto.interleaveWithNodeStream = function interleaveWithNodeStream(input) {
      {
        return throwStyledComponentsError(3);
      }
    };

    return ServerStyleSheet;
  })();

// export default <Config: { theme?: any }, Instance>(
//  Component: AbstractComponent<Config, Instance>
// ): AbstractComponent<$Diff<Config, { theme?: any }> & { theme?: any }, Instance>
//
// but the old build system tooling doesn't support the syntax

var withTheme = function(Component) {
  // $FlowFixMe This should be React.forwardRef<Config, Instance>
  var WithTheme = React.forwardRef(function(props, ref) {
    var theme = useContext(ThemeContext); // $FlowFixMe defaultProps isn't declared so it can be inferrable

    var defaultProps = Component.defaultProps;
    var themeProp = determineTheme(props, theme, defaultProps);

    if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
      // eslint-disable-next-line no-console
      console.warn(
        '[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class "' +
          getComponentName(Component) +
          '"'
      );
    }

    return React.createElement(
      Component,
      _extends({}, props, {
        theme: themeProp,
        ref: ref,
      })
    );
  });
  hoist(WithTheme, Component);
  WithTheme.displayName = 'WithTheme(' + getComponentName(Component) + ')';
  return WithTheme;
};

//

var useTheme = function useTheme() {
  return useContext(ThemeContext);
};

//
var __PRIVATE__ = {
  StyleSheet: StyleSheet,
  masterSheet: masterSheet,
};

//
/* Define bundle version for export */

var version = '5.0.0';
/* Warning if you've imported this file on React Native */

if (
  process.env.NODE_ENV !== 'production' &&
  typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative'
) {
  // eslint-disable-next-line no-console
  console.warn(
    "It looks like you've imported 'styled-components' on React Native.\n" +
      "Perhaps you're looking to import 'styled-components/native'?\n" +
      'Read more about this at https://www.styled-components.com/docs/basics#react-native'
  );
}
/* Warning if there are several instances of styled-components */

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window['__styled-components-init__'] = window['__styled-components-init__'] || 0;

  if (window['__styled-components-init__'] === 1) {
    // eslint-disable-next-line no-console
    console.warn(
      "It looks like there are several instances of 'styled-components' initialized in this application. " +
        'This may cause dynamic styles not rendering properly, errors happening during rehydration process, ' +
        'missing theme prop, and makes your application bigger without a good reason.\n\n' +
        'See https://s-c.sh/2BAXzed for more info.'
    );
  }

  window['__styled-components-init__'] += 1;
}

//

export default styled;
export {
  ServerStyleSheet,
  StyleSheetConsumer,
  StyleSheetContext,
  StyleSheetManager,
  ThemeConsumer,
  ThemeContext,
  ThemeProvider,
  __PRIVATE__,
  createGlobalStyle,
  css,
  isStyledComponent,
  keyframes,
  useTheme,
  version,
  withTheme,
};
