import Stylis from 'stylis/stylis.min';
import _insertRulePlugin from 'stylis-rule-sheet';
import React, { cloneElement, createContext, Component, createElement } from 'react';
import unitless from '@emotion/unitless';
import { isElement, isValidElementType, ForwardRef } from 'react-is';
import memoize from 'memoize-one';
import PropTypes from 'prop-types';
import validAttr from '@emotion/is-prop-valid';
import merge from 'merge-anything';

//

var interleave = function(strings, interpolations) {
  var result = [strings[0]];

  for (var i = 0, len = interpolations.length; i < len; i += 1) {
    result.push(interpolations[i], strings[i + 1]);
  }

  return result;
};

var _typeof =
  typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
    ? function(obj) {
        return typeof obj;
      }
    : function(obj) {
        return obj &&
          typeof Symbol === 'function' &&
          obj.constructor === Symbol &&
          obj !== Symbol.prototype
          ? 'symbol'
          : typeof obj;
      };

var classCallCheck = function(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
};

var createClass = (function() {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function(Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

var _extends =
  Object.assign ||
  function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

var inherits = function(subClass, superClass) {
  if (typeof superClass !== 'function' && superClass !== null) {
    throw new TypeError(
      'Super expression must either be null or a function, not ' + typeof superClass
    );
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });
  if (superClass)
    Object.setPrototypeOf
      ? Object.setPrototypeOf(subClass, superClass)
      : (subClass.__proto__ = superClass);
};

var objectWithoutProperties = function(obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
};

var possibleConstructorReturn = function(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === 'object' || typeof call === 'function') ? call : self;
};

//
var isPlainObject = function(x) {
  return (
    (typeof x === 'undefined' ? 'undefined' : _typeof(x)) === 'object' && x.constructor === Object
  );
};

//
var EMPTY_ARRAY = Object.freeze([]);
var EMPTY_OBJECT = Object.freeze({});

//
function isFunction(test) {
  return typeof test === 'function';
}

//

function getComponentName(target) {
  return (
    (process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) ||
    target.displayName ||
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

var SC_ATTR =
  (typeof process !== 'undefined' && (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR)) ||
  'data-styled';

var SC_VERSION_ATTR = 'data-styled-version';

var SC_STREAM_ATTR = 'data-styled-streamed';

var IS_BROWSER = typeof window !== 'undefined' && 'HTMLElement' in window;

var DISABLE_SPEEDY =
  (typeof SC_DISABLE_SPEEDY === 'boolean' && SC_DISABLE_SPEEDY) ||
  (typeof process !== 'undefined' &&
    (process.env.REACT_APP_SC_DISABLE_SPEEDY || process.env.SC_DISABLE_SPEEDY)) ||
  process.env.NODE_ENV !== 'production';

// Shared empty execution context when generating static styles
var STATIC_EXECUTION_CONTEXT = {};

//

/**
 * Parse errors.md and turn it into a simple hash of code: message
 */
var ERRORS =
  process.env.NODE_ENV !== 'production'
    ? {
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
          'It seems you are interpolating a keyframe declaration (%s) into an untagged string. This was supported in styled-components v3, but is not longer supported in v4 as keyframes are now injected on-demand. Please wrap your string in the css\\`\\` helper (see https://www.styled-components.com/docs/api#css), which ensures the styles are injected correctly.\n\n',
        '13':
          '%s is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.\n',
      }
    : {};

/**
 * super basic version of sprintf
 */
function format() {
  var a = arguments.length <= 0 ? undefined : arguments[0];
  var b = [];

  for (var c = 1, len = arguments.length; c < len; c += 1) {
    b.push(arguments.length <= c ? undefined : arguments[c]);
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

var StyledComponentsError = (function(_Error) {
  inherits(StyledComponentsError, _Error);

  function StyledComponentsError(code) {
    classCallCheck(this, StyledComponentsError);

    for (
      var _len = arguments.length, interpolations = Array(_len > 1 ? _len - 1 : 0), _key = 1;
      _key < _len;
      _key++
    ) {
      interpolations[_key - 1] = arguments[_key];
    }

    if (process.env.NODE_ENV === 'production') {
      var _this = possibleConstructorReturn(
        this,
        _Error.call(
          this,
          'An error occurred. See https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/utils/errors.md#' +
            code +
            ' for more information.' +
            (interpolations.length > 0 ? ' Additional arguments: ' + interpolations.join(', ') : '')
        )
      );
    } else {
      var _this = possibleConstructorReturn(
        this,
        _Error.call(this, format.apply(undefined, [ERRORS[code]].concat(interpolations)).trim())
      );
    }
    return possibleConstructorReturn(_this);
  }

  return StyledComponentsError;
})(Error);

//
var SC_COMPONENT_ID = /^[^\S\n]*?\/\* sc-component-id:\s*(\S+)\s+\*\//gm;

var extractComps = function(maybeCSS) {
  var css = '' + (maybeCSS || ''); // Definitely a string, and a clone
  var existingComponents = [];
  css.replace(SC_COMPONENT_ID, function(match, componentId, matchIndex) {
    existingComponents.push({ componentId: componentId, matchIndex: matchIndex });
    return match;
  });
  return existingComponents.map(function(_ref, i) {
    var componentId = _ref.componentId,
      matchIndex = _ref.matchIndex;

    var nextComp = existingComponents[i + 1];
    var cssFromDOM = nextComp ? css.slice(matchIndex, nextComp.matchIndex) : css.slice(matchIndex);
    return { componentId: componentId, cssFromDOM: cssFromDOM };
  });
};

//

var COMMENT_REGEX = /^\s*\/\/.*$/gm;

// NOTE: This stylis instance is only used to split rules from SSR'd style tags
var stylisSplitter = new Stylis({
  global: false,
  cascade: true,
  keyframe: false,
  prefix: false,
  compress: false,
  semicolon: true,
});

var stylis = new Stylis({
  global: false,
  cascade: true,
  keyframe: false,
  prefix: true,
  compress: false,
  semicolon: false, // NOTE: This means "autocomplete missing semicolons"
});

// Wrap `insertRulePlugin to build a list of rules,
// and then make our own plugin to return the rules. This
// makes it easier to hook into the existing SSR architecture

var parsingRules = [];

// eslint-disable-next-line consistent-return
var returnRulesPlugin = function returnRulesPlugin(context) {
  if (context === -2) {
    var parsedRules = parsingRules;
    parsingRules = [];
    return parsedRules;
  }
};

var parseRulesPlugin = _insertRulePlugin(function(rule) {
  parsingRules.push(rule);
});

var _componentId = void 0;
var _selector = void 0;
var _selectorRegexp = void 0;

var selfReferenceReplacer = function selfReferenceReplacer(match, offset, string) {
  if (
    // the first self-ref is always untouched
    offset > 0 &&
    // there should be at least two self-refs to do a replacement (.b > .b)
    string.slice(0, offset).indexOf(_selector) !== -1 &&
    // no consecutive self refs (.b.b); that is a precedence boost and treated differently
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

stylis.use([selfReferenceReplacementPlugin, parseRulesPlugin, returnRulesPlugin]);
stylisSplitter.use([parseRulesPlugin, returnRulesPlugin]);

var splitByRules = function splitByRules(css) {
  return stylisSplitter('', css);
};

function stringifyRules(rules, selector, prefix) {
  var componentId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '&';

  var flatCSS = rules.join('').replace(COMMENT_REGEX, ''); // replace JS comments

  var cssStr = selector && prefix ? prefix + ' ' + selector + ' { ' + flatCSS + ' }' : flatCSS;

  // stylis has no concept of state to be passed to plugins
  // but since JS is single=threaded, we can rely on that to ensure
  // these properties stay in sync with the current stylis run
  _componentId = componentId;
  _selector = selector;
  _selectorRegexp = new RegExp('\\' + _selector + '\\b', 'g');

  return stylis(prefix || !selector ? '' : selector, cssStr);
}

//
/* eslint-disable camelcase, no-undef */

var getNonce = function() {
  return typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null;
};

//
/* These are helpers for the StyleTags to keep track of the injected
 * rule names for each (component) ID that they're keeping track of.
 * They're crucial for detecting whether a name has already been
 * injected.
 * (This excludes rehydrated names) */

/* adds a new ID:name pairing to a names dictionary */
var addNameForId = function addNameForId(names, id, name) {
  if (name) {
    // eslint-disable-next-line no-param-reassign
    var namesForId = names[id] || (names[id] = Object.create(null));
    namesForId[name] = true;
  }
};

/* resets an ID entirely by overwriting it in the dictionary */
var resetIdNames = function resetIdNames(names, id) {
  // eslint-disable-next-line no-param-reassign
  names[id] = Object.create(null);
};

/* factory for a names dictionary checking the existance of an ID:name pairing */
var hasNameForId = function hasNameForId(names) {
  return function(id, name) {
    return names[id] !== undefined && names[id][name];
  };
};

/* stringifies names for the html/element output */
var stringifyNames = function stringifyNames(names) {
  var str = '';
  // eslint-disable-next-line guard-for-in
  for (var id in names) {
    str += Object.keys(names[id]).join(' ') + ' ';
  }
  return str.trim();
};

/* clones the nested names dictionary */
var cloneNames = function cloneNames(names) {
  var clone = Object.create(null);
  // eslint-disable-next-line guard-for-in
  for (var id in names) {
    clone[id] = _extends({}, names[id]);
  }
  return clone;
};

//

/* These are helpers that deal with the insertRule (aka speedy) API
 * They are used in the StyleTags and specifically the speedy tag
 */

/* retrieve a sheet for a given style tag */
var sheetForTag = function sheetForTag(tag) {
  // $FlowFixMe
  if (tag.sheet) return tag.sheet;

  /* Firefox quirk requires us to step through all stylesheets to find one owned by the given tag */
  var size = document.styleSheets.length;
  for (var i = 0; i < size; i += 1) {
    var sheet = document.styleSheets[i];
    // $FlowFixMe
    if (sheet.ownerNode === tag) return sheet;
  }

  /* we should always be able to find a tag */
  throw new StyledComponentsError(10);
};

/* insert a rule safely and return whether it was actually injected */
var safeInsertRule = function safeInsertRule(sheet, cssRule, index) {
  /* abort early if cssRule string is falsy */
  if (!cssRule) return false;

  var maxIndex = sheet.cssRules.length;

  try {
    /* use insertRule and cap passed index with maxIndex (no of cssRules) */
    sheet.insertRule(cssRule, index <= maxIndex ? index : maxIndex);
  } catch (err) {
    /* any error indicates an invalid rule */
    return false;
  }

  return true;
};

/* deletes `size` rules starting from `removalIndex` */
var deleteRules = function deleteRules(sheet, removalIndex, size) {
  var lowerBound = removalIndex - size;
  for (var i = removalIndex; i > lowerBound; i -= 1) {
    sheet.deleteRule(i);
  }
};

//

/* this marker separates component styles and is important for rehydration */
var makeTextMarker = function makeTextMarker(id) {
  return '\n/* sc-component-id: ' + id + ' */\n';
};

/* add up all numbers in array up until and including the index */
var addUpUntilIndex = function addUpUntilIndex(sizes, index) {
  var totalUpToIndex = 0;
  for (var i = 0; i <= index; i += 1) {
    totalUpToIndex += sizes[i];
  }

  return totalUpToIndex;
};

/* create a new style tag after lastEl */
var makeStyleTag = function makeStyleTag(target, tagEl, insertBefore) {
  var el = document.createElement('style');
  el.setAttribute(SC_ATTR, '');
  el.setAttribute(SC_VERSION_ATTR, '4.3.1');

  var nonce = getNonce();
  if (nonce) {
    el.setAttribute('nonce', nonce);
  }

  /* Work around insertRule quirk in EdgeHTML */
  el.appendChild(document.createTextNode(''));

  if (target && !tagEl) {
    /* Append to target when no previous element was passed */
    target.appendChild(el);
  } else {
    if (!tagEl || !target || !tagEl.parentNode) {
      throw new StyledComponentsError(6);
    }

    /* Insert new style tag after the previous one */
    tagEl.parentNode.insertBefore(el, insertBefore ? tagEl : tagEl.nextSibling);
  }

  return el;
};

/* takes a css factory function and outputs an html styled tag factory */
var wrapAsHtmlTag = function wrapAsHtmlTag(css, names) {
  return function(additionalAttrs) {
    var nonce = getNonce();
    var attrs = [
      nonce && 'nonce="' + nonce + '"',
      SC_ATTR + '="' + stringifyNames(names) + '"',
      SC_VERSION_ATTR + '="' + '4.3.1' + '"',
      additionalAttrs,
    ];

    var htmlAttr = attrs.filter(Boolean).join(' ');
    return '<style ' + htmlAttr + '>' + css() + '</style>';
  };
};

/* takes a css factory function and outputs an element factory */
var wrapAsElement = function wrapAsElement(css, names) {
  return function() {
    var _props;

    var props = ((_props = {}),
    (_props[SC_ATTR] = stringifyNames(names)),
    (_props[SC_VERSION_ATTR] = '4.3.1'),
    _props);

    var nonce = getNonce();
    if (nonce) {
      // $FlowFixMe
      props.nonce = nonce;
    }

    // eslint-disable-next-line react/no-danger
    return React.createElement(
      'style',
      _extends({}, props, { dangerouslySetInnerHTML: { __html: css() } })
    );
  };
};

var getIdsFromMarkersFactory = function getIdsFromMarkersFactory(markers) {
  return function() {
    return Object.keys(markers);
  };
};

/* speedy tags utilise insertRule */
var makeSpeedyTag = function makeSpeedyTag(el, getImportRuleTag) {
  var names = Object.create(null);
  var markers = Object.create(null);
  var sizes = [];

  var extractImport = getImportRuleTag !== undefined;
  /* indicates whether getImportRuleTag was called */
  var usedImportRuleTag = false;

  var insertMarker = function insertMarker(id) {
    var prev = markers[id];
    if (prev !== undefined) {
      return prev;
    }

    markers[id] = sizes.length;
    sizes.push(0);
    resetIdNames(names, id);

    return markers[id];
  };

  var insertRules = function insertRules(id, cssRules, name) {
    var marker = insertMarker(id);
    var sheet = sheetForTag(el);
    var insertIndex = addUpUntilIndex(sizes, marker);

    var injectedRules = 0;
    var importRules = [];
    var cssRulesSize = cssRules.length;

    for (var i = 0; i < cssRulesSize; i += 1) {
      var cssRule = cssRules[i];
      var mayHaveImport = extractImport; /* @import rules are reordered to appear first */
      if (mayHaveImport && cssRule.indexOf('@import') !== -1) {
        importRules.push(cssRule);
      } else if (safeInsertRule(sheet, cssRule, insertIndex + injectedRules)) {
        mayHaveImport = false;
        injectedRules += 1;
      }
    }

    if (extractImport && importRules.length > 0) {
      usedImportRuleTag = true;
      // $FlowFixMe
      getImportRuleTag().insertRules(id + '-import', importRules);
    }

    sizes[marker] += injectedRules; /* add up no of injected rules */
    addNameForId(names, id, name);
  };

  var removeRules = function removeRules(id) {
    var marker = markers[id];
    if (marker === undefined) return;

    var size = sizes[marker];
    var sheet = sheetForTag(el);
    var removalIndex = addUpUntilIndex(sizes, marker) - 1;
    deleteRules(sheet, removalIndex, size);
    sizes[marker] = 0;
    resetIdNames(names, id);

    if (extractImport && usedImportRuleTag) {
      // $FlowFixMe
      getImportRuleTag().removeRules(id + '-import');
    }
  };

  var css = function css() {
    var _sheetForTag = sheetForTag(el),
      cssRules = _sheetForTag.cssRules;

    var str = '';

    // eslint-disable-next-line guard-for-in
    for (var id in markers) {
      str += makeTextMarker(id);
      var marker = markers[id];
      var end = addUpUntilIndex(sizes, marker);
      var size = sizes[marker];
      for (var i = end - size; i < end; i += 1) {
        var rule = cssRules[i];
        if (rule !== undefined) {
          str += rule.cssText;
        }
      }
    }

    return str;
  };

  return {
    clone: function clone() {
      throw new StyledComponentsError(5);
    },

    css: css,
    getIds: getIdsFromMarkersFactory(markers),
    hasNameForId: hasNameForId(names),
    insertMarker: insertMarker,
    insertRules: insertRules,
    removeRules: removeRules,
    sealed: false,
    styleTag: el,
    toElement: wrapAsElement(css, names),
    toHTML: wrapAsHtmlTag(css, names),
  };
};

var makeTextNode = function makeTextNode(id) {
  return document.createTextNode(makeTextMarker(id));
};

var makeBrowserTag = function makeBrowserTag(el, getImportRuleTag) {
  var names = Object.create(null);
  var markers = Object.create(null);

  var extractImport = getImportRuleTag !== undefined;

  /* indicates whether getImportRuleTag was called */
  var usedImportRuleTag = false;

  var insertMarker = function insertMarker(id) {
    var prev = markers[id];
    if (prev !== undefined) {
      return prev;
    }

    markers[id] = makeTextNode(id);
    el.appendChild(markers[id]);
    names[id] = Object.create(null);

    return markers[id];
  };

  var insertRules = function insertRules(id, cssRules, name) {
    var marker = insertMarker(id);
    var importRules = [];
    var cssRulesSize = cssRules.length;

    for (var i = 0; i < cssRulesSize; i += 1) {
      var rule = cssRules[i];
      var mayHaveImport = extractImport;
      if (mayHaveImport && rule.indexOf('@import') !== -1) {
        importRules.push(rule);
      } else {
        mayHaveImport = false;
        var separator = i === cssRulesSize - 1 ? '' : ' ';
        marker.appendData('' + rule + separator);
      }
    }

    addNameForId(names, id, name);

    if (extractImport && importRules.length > 0) {
      usedImportRuleTag = true;
      // $FlowFixMe
      getImportRuleTag().insertRules(id + '-import', importRules);
    }
  };

  var removeRules = function removeRules(id) {
    var marker = markers[id];
    if (marker === undefined) return;

    /* create new empty text node and replace the current one */
    var newMarker = makeTextNode(id);
    el.replaceChild(newMarker, marker);
    markers[id] = newMarker;
    resetIdNames(names, id);

    if (extractImport && usedImportRuleTag) {
      // $FlowFixMe
      getImportRuleTag().removeRules(id + '-import');
    }
  };

  var css = function css() {
    var str = '';

    // eslint-disable-next-line guard-for-in
    for (var id in markers) {
      str += markers[id].data;
    }

    return str;
  };

  return {
    clone: function clone() {
      throw new StyledComponentsError(5);
    },

    css: css,
    getIds: getIdsFromMarkersFactory(markers),
    hasNameForId: hasNameForId(names),
    insertMarker: insertMarker,
    insertRules: insertRules,
    removeRules: removeRules,
    sealed: false,
    styleTag: el,
    toElement: wrapAsElement(css, names),
    toHTML: wrapAsHtmlTag(css, names),
  };
};

var makeServerTag = function makeServerTag(namesArg, markersArg) {
  var names = namesArg === undefined ? Object.create(null) : namesArg;
  var markers = markersArg === undefined ? Object.create(null) : markersArg;

  var insertMarker = function insertMarker(id) {
    var prev = markers[id];
    if (prev !== undefined) {
      return prev;
    }

    return (markers[id] = ['']);
  };

  var insertRules = function insertRules(id, cssRules, name) {
    var marker = insertMarker(id);
    marker[0] += cssRules.join(' ');
    addNameForId(names, id, name);
  };

  var removeRules = function removeRules(id) {
    var marker = markers[id];
    if (marker === undefined) return;
    marker[0] = '';
    resetIdNames(names, id);
  };

  var css = function css() {
    var str = '';
    // eslint-disable-next-line guard-for-in
    for (var id in markers) {
      var cssForId = markers[id][0];
      if (cssForId) {
        str += makeTextMarker(id) + cssForId;
      }
    }
    return str;
  };

  var clone = function clone() {
    var namesClone = cloneNames(names);
    var markersClone = Object.create(null);

    // eslint-disable-next-line guard-for-in
    for (var id in markers) {
      markersClone[id] = [markers[id][0]];
    }

    return makeServerTag(namesClone, markersClone);
  };

  var tag = {
    clone: clone,
    css: css,
    getIds: getIdsFromMarkersFactory(markers),
    hasNameForId: hasNameForId(names),
    insertMarker: insertMarker,
    insertRules: insertRules,
    removeRules: removeRules,
    sealed: false,
    styleTag: null,
    toElement: wrapAsElement(css, names),
    toHTML: wrapAsHtmlTag(css, names),
  };

  return tag;
};

var makeTag = function makeTag(target, tagEl, forceServer, insertBefore, getImportRuleTag) {
  if (IS_BROWSER && !forceServer) {
    var el = makeStyleTag(target, tagEl, insertBefore);

    if (DISABLE_SPEEDY) {
      return makeBrowserTag(el, getImportRuleTag);
    } else {
      return makeSpeedyTag(el, getImportRuleTag);
    }
  }

  return makeServerTag();
};

var rehydrate = function rehydrate(tag, els, extracted) {
  /* add all extracted components to the new tag */
  for (var i = 0, len = extracted.length; i < len; i += 1) {
    var _extracted$i = extracted[i],
      componentId = _extracted$i.componentId,
      cssFromDOM = _extracted$i.cssFromDOM;

    var cssRules = splitByRules(cssFromDOM);
    tag.insertRules(componentId, cssRules);
  }

  /* remove old HTMLStyleElements, since they have been rehydrated */
  for (var _i = 0, _len = els.length; _i < _len; _i += 1) {
    var el = els[_i];
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }
};

//

var SPLIT_REGEX = /\s+/;

/* determine the maximum number of components before tags are sharded */
var MAX_SIZE = void 0;
if (IS_BROWSER) {
  /* in speedy mode we can keep a lot more rules in a sheet before a slowdown can be expected */
  MAX_SIZE = DISABLE_SPEEDY ? 40 : 1000;
} else {
  /* for servers we do not need to shard at all */
  MAX_SIZE = -1;
}

var sheetRunningId = 0;
var master = void 0;

var StyleSheet = (function() {
  /* a map from ids to tags */

  /* deferred rules for a given id */

  /* this is used for not reinjecting rules via hasNameForId() */

  /* when rules for an id are removed using remove() we have to ignore rehydratedNames for it */

  /* a list of tags belonging to this StyleSheet */

  /* a tag for import rules */

  /* current capacity until a new tag must be created */

  /* children (aka clones) of this StyleSheet inheriting all and future injections */

  function StyleSheet() {
    var _this = this;

    var target =
      arguments.length > 0 && arguments[0] !== undefined
        ? arguments[0]
        : IS_BROWSER
        ? document.head
        : null;
    var forceServer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    classCallCheck(this, StyleSheet);

    this.getImportRuleTag = function() {
      var importRuleTag = _this.importRuleTag;

      if (importRuleTag !== undefined) {
        return importRuleTag;
      }

      var firstTag = _this.tags[0];
      var insertBefore = true;

      return (_this.importRuleTag = makeTag(
        _this.target,
        firstTag ? firstTag.styleTag : null,
        _this.forceServer,
        insertBefore
      ));
    };

    sheetRunningId += 1;
    this.id = sheetRunningId;
    this.forceServer = forceServer;
    this.target = forceServer ? null : target;
    this.tagMap = {};
    this.deferred = {};
    this.rehydratedNames = {};
    this.ignoreRehydratedNames = {};
    this.tags = [];
    this.capacity = 1;
    this.clones = [];
  }

  /* rehydrate all SSR'd style tags */

  StyleSheet.prototype.rehydrate = function rehydrate$$1() {
    if (!IS_BROWSER || this.forceServer) return this;

    var els = [];
    var extracted = [];
    var isStreamed = false;

    /* retrieve all of our SSR style elements from the DOM */
    var nodes = document.querySelectorAll(
      'style[' + SC_ATTR + '][' + SC_VERSION_ATTR + '="' + '4.3.1' + '"]'
    );

    var nodesSize = nodes.length;

    /* abort rehydration if no previous style tags were found */
    if (!nodesSize) return this;

    for (var i = 0; i < nodesSize; i += 1) {
      var el = nodes[i];

      /* check if style tag is a streamed tag */
      if (!isStreamed) isStreamed = !!el.getAttribute(SC_STREAM_ATTR);

      /* retrieve all component names */
      var elNames = (el.getAttribute(SC_ATTR) || '').trim().split(SPLIT_REGEX);
      var elNamesSize = elNames.length;
      for (var j = 0, name; j < elNamesSize; j += 1) {
        name = elNames[j];
        /* add rehydrated name to sheet to avoid re-adding styles */
        this.rehydratedNames[name] = true;
      }

      /* extract all components and their CSS */
      extracted.push.apply(extracted, extractComps(el.textContent));

      /* store original HTMLStyleElement */
      els.push(el);
    }

    /* abort rehydration if nothing was extracted */
    var extractedSize = extracted.length;
    if (!extractedSize) return this;

    /* create a tag to be used for rehydration */
    var tag = this.makeTag(null);

    rehydrate(tag, els, extracted);

    /* reset capacity and adjust MAX_SIZE by the initial size of the rehydration */
    this.capacity = Math.max(1, MAX_SIZE - extractedSize);
    this.tags.push(tag);

    /* retrieve all component ids */
    for (var _j = 0; _j < extractedSize; _j += 1) {
      this.tagMap[extracted[_j].componentId] = tag;
    }

    return this;
  };

  /* retrieve a "master" instance of StyleSheet which is typically used when no other is available
   * The master StyleSheet is targeted by createGlobalStyle, keyframes, and components outside of any
   * StyleSheetManager's context */

  /* reset the internal "master" instance */
  StyleSheet.reset = function reset() {
    var forceServer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    master = new StyleSheet(undefined, forceServer).rehydrate();
  };

  /* adds "children" to the StyleSheet that inherit all of the parents' rules
   * while their own rules do not affect the parent */

  StyleSheet.prototype.clone = function clone() {
    var sheet = new StyleSheet(this.target, this.forceServer);

    /* add to clone array */
    this.clones.push(sheet);

    /* clone all tags */
    sheet.tags = this.tags.map(function(tag) {
      var ids = tag.getIds();
      var newTag = tag.clone();

      /* reconstruct tagMap */
      for (var i = 0; i < ids.length; i += 1) {
        sheet.tagMap[ids[i]] = newTag;
      }

      return newTag;
    });

    /* clone other maps */
    sheet.rehydratedNames = _extends({}, this.rehydratedNames);
    sheet.deferred = _extends({}, this.deferred);

    return sheet;
  };

  /* force StyleSheet to create a new tag on the next injection */

  StyleSheet.prototype.sealAllTags = function sealAllTags() {
    this.capacity = 1;

    this.tags.forEach(function(tag) {
      // eslint-disable-next-line no-param-reassign
      tag.sealed = true;
    });
  };

  StyleSheet.prototype.makeTag = function makeTag$$1(tag) {
    var lastEl = tag ? tag.styleTag : null;
    var insertBefore = false;

    return makeTag(this.target, lastEl, this.forceServer, insertBefore, this.getImportRuleTag);
  };

  /* get a tag for a given componentId, assign the componentId to one, or shard */
  StyleSheet.prototype.getTagForId = function getTagForId(id) {
    /* simply return a tag, when the componentId was already assigned one */
    var prev = this.tagMap[id];
    if (prev !== undefined && !prev.sealed) {
      return prev;
    }

    var tag = this.tags[this.tags.length - 1];

    /* shard (create a new tag) if the tag is exhausted (See MAX_SIZE) */
    this.capacity -= 1;

    if (this.capacity === 0) {
      this.capacity = MAX_SIZE;
      tag = this.makeTag(tag);
      this.tags.push(tag);
    }

    return (this.tagMap[id] = tag);
  };

  /* mainly for createGlobalStyle to check for its id */

  StyleSheet.prototype.hasId = function hasId(id) {
    return this.tagMap[id] !== undefined;
  };

  /* caching layer checking id+name to already have a corresponding tag and injected rules */

  StyleSheet.prototype.hasNameForId = function hasNameForId(id, name) {
    /* exception for rehydrated names which are checked separately */
    if (this.ignoreRehydratedNames[id] === undefined && this.rehydratedNames[name]) {
      return true;
    }

    var tag = this.tagMap[id];
    return tag !== undefined && tag.hasNameForId(id, name);
  };

  /* registers a componentId and registers it on its tag */

  StyleSheet.prototype.deferredInject = function deferredInject(id, cssRules) {
    /* don't inject when the id is already registered */
    if (this.tagMap[id] !== undefined) return;

    var clones = this.clones;

    for (var i = 0; i < clones.length; i += 1) {
      clones[i].deferredInject(id, cssRules);
    }

    this.getTagForId(id).insertMarker(id);
    this.deferred[id] = cssRules;
  };

  /* injects rules for a given id with a name that will need to be cached */

  StyleSheet.prototype.inject = function inject(id, cssRules, name) {
    var clones = this.clones;

    for (var i = 0; i < clones.length; i += 1) {
      clones[i].inject(id, cssRules, name);
    }

    var tag = this.getTagForId(id);

    /* add deferred rules for component */
    if (this.deferred[id] !== undefined) {
      // Combine passed cssRules with previously deferred CSS rules
      // NOTE: We cannot mutate the deferred array itself as all clones
      // do the same (see clones[i].inject)
      var rules = this.deferred[id].concat(cssRules);
      tag.insertRules(id, rules, name);

      this.deferred[id] = undefined;
    } else {
      tag.insertRules(id, cssRules, name);
    }
  };

  /* removes all rules for a given id, which doesn't remove its marker but resets it */

  StyleSheet.prototype.remove = function remove(id) {
    var tag = this.tagMap[id];
    if (tag === undefined) return;

    var clones = this.clones;

    for (var i = 0; i < clones.length; i += 1) {
      clones[i].remove(id);
    }

    /* remove all rules from the tag */
    tag.removeRules(id);

    /* ignore possible rehydrated names */
    this.ignoreRehydratedNames[id] = true;

    /* delete possible deferred rules */
    this.deferred[id] = undefined;
  };

  StyleSheet.prototype.toHTML = function toHTML() {
    return this.tags
      .map(function(tag) {
        return tag.toHTML();
      })
      .join('');
  };

  StyleSheet.prototype.toReactElements = function toReactElements() {
    var id = this.id;

    return this.tags.map(function(tag, i) {
      var key = 'sc-' + id + '-' + i;
      return cloneElement(tag.toElement(), { key: key });
    });
  };

  createClass(StyleSheet, null, [
    {
      key: 'master',
      get: function get$$1() {
        return master || (master = new StyleSheet().rehydrate());
      },

      /* NOTE: This is just for backwards-compatibility with jest-styled-components */
    },
    {
      key: 'instance',
      get: function get$$1() {
        return StyleSheet.master;
      },
    },
  ]);
  return StyleSheet;
})();

//

var Keyframes = (function() {
  function Keyframes(name, rules) {
    var _this = this;

    classCallCheck(this, Keyframes);

    this.inject = function(styleSheet) {
      if (!styleSheet.hasNameForId(_this.id, _this.name)) {
        styleSheet.inject(_this.id, _this.rules, _this.name);
      }
    };

    this.toString = function() {
      throw new StyledComponentsError(12, String(_this.name));
    };

    this.name = name;
    this.rules = rules;

    this.id = 'sc-keyframes-' + name;
  }

  Keyframes.prototype.getName = function getName() {
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

// Taken from https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/shared/dangerousStyleValue.js
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

      if (result === null) continue;
      else if (Array.isArray(result)) ruleSet.push.apply(ruleSet, result);
      else ruleSet.push(result);
    }

    return ruleSet;
  }

  if (isFalsish(chunk)) {
    return null;
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
    var _len = arguments.length, interpolations = Array(_len > 1 ? _len - 1 : 0), _key = 1;
    _key < _len;
    _key++
  ) {
    interpolations[_key - 1] = arguments[_key];
  }

  if (isFunction(styles) || isPlainObject(styles)) {
    // $FlowFixMe
    return flatten(interleave(EMPTY_ARRAY, [styles].concat(interpolations)));
  }

  // $FlowFixMe
  return flatten(interleave(styles, interpolations));
}

//

function constructWithOptions(componentConstructor, tag) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : EMPTY_OBJECT;

  if (!isValidElementType(tag)) {
    throw new StyledComponentsError(1, String(tag));
  }

  /* This is callable directly as a template function */
  // $FlowFixMe: Not typed to avoid destructuring arguments
  var templateFunction = function templateFunction() {
    return componentConstructor(tag, options, css.apply(undefined, arguments));
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

//
// Source: https://github.com/garycourt/murmurhash-js/blob/master/murmurhash2_gc.js
function murmurhash(c) {
  for (var e = c.length | 0, a = e | 0, d = 0, b; e >= 4; ) {
    (b =
      (c.charCodeAt(d) & 255) |
      ((c.charCodeAt(++d) & 255) << 8) |
      ((c.charCodeAt(++d) & 255) << 16) |
      ((c.charCodeAt(++d) & 255) << 24)),
      (b = 1540483477 * (b & 65535) + (((1540483477 * (b >>> 16)) & 65535) << 16)),
      (b ^= b >>> 24),
      (b = 1540483477 * (b & 65535) + (((1540483477 * (b >>> 16)) & 65535) << 16)),
      (a = (1540483477 * (a & 65535) + (((1540483477 * (a >>> 16)) & 65535) << 16)) ^ b),
      (e -= 4),
      ++d;
  }
  switch (e) {
    case 3:
      a ^= (c.charCodeAt(d + 2) & 255) << 16;
    case 2:
      a ^= (c.charCodeAt(d + 1) & 255) << 8;
    case 1:
      (a ^= c.charCodeAt(d) & 255),
        (a = 1540483477 * (a & 65535) + (((1540483477 * (a >>> 16)) & 65535) << 16));
  }
  a ^= a >>> 13;
  a = 1540483477 * (a & 65535) + (((1540483477 * (a >>> 16)) & 65535) << 16);
  return (a ^ (a >>> 15)) >>> 0;
}

//
/* eslint-disable no-bitwise */

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
  var x = void 0;

  /* get a char and divide by alphabet-length */
  for (x = code; x > charsLength; x = Math.floor(x / charsLength)) {
    name = getAlphabeticChar(x % charsLength) + name;
  }

  return getAlphabeticChar(x % charsLength) + name;
}

//

function hasFunctionObjectKey(obj) {
  // eslint-disable-next-line guard-for-in, no-restricted-syntax
  for (var key in obj) {
    if (isFunction(obj[key])) {
      return true;
    }
  }

  return false;
}

function isStaticRules(rules, attrs) {
  for (var i = 0; i < rules.length; i += 1) {
    var rule = rules[i];

    // recursive case
    if (Array.isArray(rule) && !isStaticRules(rule, attrs)) {
      return false;
    } else if (isFunction(rule) && !isStyledComponent(rule)) {
      // functions are allowed to be static if they're just being
      // used to get the classname of a nested styled component
      return false;
    }
  }

  if (
    attrs.some(function(x) {
      return isFunction(x) || hasFunctionObjectKey(x);
    })
  )
    return false;

  return true;
}

//

var isHMREnabled =
  process.env.NODE_ENV !== 'production' && typeof module !== 'undefined' && module.hot;

/* combines hashStr (murmurhash) and nameGenerator for convenience */
var hasher = function hasher(str) {
  return generateAlphabeticName(murmurhash(str));
};

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */

var ComponentStyle = (function() {
  function ComponentStyle(rules, attrs, componentId) {
    classCallCheck(this, ComponentStyle);

    this.rules = rules;
    this.isStatic = !isHMREnabled && isStaticRules(rules, attrs);
    this.componentId = componentId;

    if (!StyleSheet.master.hasId(componentId)) {
      StyleSheet.master.deferredInject(componentId, []);
    }
  }

  /*
   * Flattens a rule set into valid CSS
   * Hashes it, wraps the whole chunk in a .hash1234 {}
   * Returns the hash to be injected on render()
   * */

  ComponentStyle.prototype.generateAndInjectStyles = function generateAndInjectStyles(
    executionContext,
    styleSheet
  ) {
    var isStatic = this.isStatic,
      componentId = this.componentId,
      lastClassName = this.lastClassName;

    if (
      IS_BROWSER &&
      isStatic &&
      typeof lastClassName === 'string' &&
      styleSheet.hasNameForId(componentId, lastClassName)
    ) {
      return lastClassName;
    }

    var flatCSS = flatten(this.rules, executionContext, styleSheet);
    var name = hasher(this.componentId + flatCSS.join(''));
    if (!styleSheet.hasNameForId(componentId, name)) {
      styleSheet.inject(
        this.componentId,
        stringifyRules(flatCSS, '.' + name, undefined, componentId),
        name
      );
    }

    this.lastClassName = name;
    return name;
  };

  ComponentStyle.generateName = function generateName(str) {
    return hasher(str);
  };

  return ComponentStyle;
})();

//

var LIMIT = 200;

var createWarnTooManyClasses = function(displayName) {
  var generatedClasses = {};
  var warningSeen = false;

  return function(className) {
    if (!warningSeen) {
      generatedClasses[className] = true;
      if (Object.keys(generatedClasses).length >= LIMIT) {
        // Unable to find latestRule in test environment.
        /* eslint-disable no-console, prefer-template */
        console.warn(
          'Over ' +
            LIMIT +
            ' classes were generated for component ' +
            displayName +
            '. \n' +
            'Consider using the attrs method, together with a style object for frequently changed styles.\n' +
            'Example:\n' +
            '  const Component = styled.div.attrs({\n' +
            '    style: ({ background }) => ({\n' +
            '      background,\n' +
            '    }),\n' +
            '  })`width: 100%;`\n\n' +
            '  <Component />'
        );
        warningSeen = true;
        generatedClasses = {};
      }
    }
  };
};

//

var determineTheme = function(props, fallbackTheme) {
  var defaultProps =
    arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : EMPTY_OBJECT;

  // Props should take precedence over ThemeProvider, which should take precedence over
  // defaultProps, but React automatically puts defaultProps on props.

  /* eslint-disable react/prop-types, flowtype-errors/show-errors */
  var isDefaultTheme = defaultProps ? props.theme === defaultProps.theme : false;
  var theme = props.theme && !isDefaultTheme ? props.theme : fallbackTheme || defaultProps.theme;
  /* eslint-enable */

  return theme;
};

//
var escapeRegex = /[[\].#*$><+~=|^:(),"'`-]+/g;
var dashesAtEnds = /(^-|-$)/g;

/**
 * TODO: Explore using CSS.escape when it becomes more available
 * in evergreen browsers.
 */
function escape(str) {
  return (
    str
      // Replace all possible CSS selectors
      .replace(escapeRegex, '-')

      // Remove extraneous hyphens at the start and end
      .replace(dashesAtEnds, '')
  );
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

var _TYPE_STATICS;

var REACT_STATICS = {
  childContextTypes: true,
  contextTypes: true,
  defaultProps: true,
  displayName: true,
  getDerivedStateFromProps: true,
  propTypes: true,
  type: true,
};

var KNOWN_STATICS = {
  name: true,
  length: true,
  prototype: true,
  caller: true,
  callee: true,
  arguments: true,
  arity: true,
};

var TYPE_STATICS = ((_TYPE_STATICS = {}),
(_TYPE_STATICS[ForwardRef] = {
  $$typeof: true,
  render: true,
}),
_TYPE_STATICS);

var defineProperty$1 = Object.defineProperty,
  getOwnPropertyNames = Object.getOwnPropertyNames,
  _Object$getOwnPropert = Object.getOwnPropertySymbols,
  getOwnPropertySymbols =
    _Object$getOwnPropert === undefined
      ? function() {
          return [];
        }
      : _Object$getOwnPropert,
  getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
  getPrototypeOf = Object.getPrototypeOf,
  objectPrototype = Object.prototype;
var arrayPrototype = Array.prototype;

function hoistNonReactStatics(targetComponent, sourceComponent, blacklist) {
  if (typeof sourceComponent !== 'string') {
    // don't hoist over string (html) components

    var inheritedComponent = getPrototypeOf(sourceComponent);

    if (inheritedComponent && inheritedComponent !== objectPrototype) {
      hoistNonReactStatics(targetComponent, inheritedComponent, blacklist);
    }

    var keys = arrayPrototype.concat(
      getOwnPropertyNames(sourceComponent),
      // $FlowFixMe
      getOwnPropertySymbols(sourceComponent)
    );

    var targetStatics = TYPE_STATICS[targetComponent.$$typeof] || REACT_STATICS;

    var sourceStatics = TYPE_STATICS[sourceComponent.$$typeof] || REACT_STATICS;

    var i = keys.length;
    var descriptor = void 0;
    var key = void 0;

    // eslint-disable-next-line no-plusplus
    while (i--) {
      key = keys[i];

      if (
        // $FlowFixMe
        !KNOWN_STATICS[key] &&
        !(blacklist && blacklist[key]) &&
        !(sourceStatics && sourceStatics[key]) &&
        // $FlowFixMe
        !(targetStatics && targetStatics[key])
      ) {
        descriptor = getOwnPropertyDescriptor(sourceComponent, key);

        if (descriptor) {
          try {
            // Avoid failures from read-only properties
            defineProperty$1(targetComponent, key, descriptor);
          } catch (e) {
            /* fail silently */
          }
        }
      }
    }

    return targetComponent;
  }

  return targetComponent;
}

//
function isDerivedReactComponent(fn) {
  return !!(fn && fn.prototype && fn.prototype.isReactComponent);
}

//
// Helper to call a given function, only once
var once = function(cb) {
  var called = false;

  return function() {
    if (!called) {
      called = true;
      cb.apply(undefined, arguments);
    }
  };
};

//

var ThemeContext = createContext();

var ThemeConsumer = ThemeContext.Consumer;

/**
 * Provide a theme to an entire react component tree via context
 */

var ThemeProvider = (function(_Component) {
  inherits(ThemeProvider, _Component);

  function ThemeProvider(props) {
    classCallCheck(this, ThemeProvider);

    var _this = possibleConstructorReturn(this, _Component.call(this, props));

    _this.getContext = memoize(_this.getContext.bind(_this));
    _this.renderInner = _this.renderInner.bind(_this);
    return _this;
  }

  ThemeProvider.prototype.render = function render() {
    if (!this.props.children) return null;

    return React.createElement(ThemeContext.Consumer, null, this.renderInner);
  };

  ThemeProvider.prototype.renderInner = function renderInner(outerTheme) {
    var context = this.getContext(this.props.theme, outerTheme);

    return React.createElement(
      ThemeContext.Provider,
      { value: context },
      React.Children.only(this.props.children)
    );
  };

  /**
   * Get the theme from the props, supporting both (outerTheme) => {}
   * as well as object notation
   */

  ThemeProvider.prototype.getTheme = function getTheme(theme, outerTheme) {
    if (isFunction(theme)) {
      var mergedTheme = theme(outerTheme);

      if (
        process.env.NODE_ENV !== 'production' &&
        (mergedTheme === null ||
          Array.isArray(mergedTheme) ||
          (typeof mergedTheme === 'undefined' ? 'undefined' : _typeof(mergedTheme)) !== 'object')
      ) {
        throw new StyledComponentsError(7);
      }

      return mergedTheme;
    }

    if (
      theme === null ||
      Array.isArray(theme) ||
      (typeof theme === 'undefined' ? 'undefined' : _typeof(theme)) !== 'object'
    ) {
      throw new StyledComponentsError(8);
    }

    return _extends({}, outerTheme, theme);
  };

  ThemeProvider.prototype.getContext = function getContext(theme, outerTheme) {
    return this.getTheme(theme, outerTheme);
  };

  return ThemeProvider;
})(Component);

//

var CLOSING_TAG_R = /^\s*<\/[a-z]/i;

var ServerStyleSheet = (function() {
  function ServerStyleSheet() {
    classCallCheck(this, ServerStyleSheet);

    /* The master sheet might be reset, so keep a reference here */
    this.masterSheet = StyleSheet.master;
    this.instance = this.masterSheet.clone();
    this.sealed = false;
  }

  /**
   * Mark the ServerStyleSheet as being fully emitted and manually GC it from the
   * StyleSheet singleton.
   */

  ServerStyleSheet.prototype.seal = function seal() {
    if (!this.sealed) {
      /* Remove sealed StyleSheets from the master sheet */
      var index = this.masterSheet.clones.indexOf(this.instance);
      this.masterSheet.clones.splice(index, 1);
      this.sealed = true;
    }
  };

  ServerStyleSheet.prototype.collectStyles = function collectStyles(children) {
    if (this.sealed) {
      throw new StyledComponentsError(2);
    }

    return React.createElement(StyleSheetManager, { sheet: this.instance }, children);
  };

  ServerStyleSheet.prototype.getStyleTags = function getStyleTags() {
    this.seal();
    return this.instance.toHTML();
  };

  ServerStyleSheet.prototype.getStyleElement = function getStyleElement() {
    this.seal();
    return this.instance.toReactElements();
  };

  ServerStyleSheet.prototype.interleaveWithNodeStream = function interleaveWithNodeStream(
    readableStream
  ) {
    var _this = this;

    {
      throw new StyledComponentsError(3);
    }

    /* the tag index keeps track of which tags have already been emitted */
    var instance = this.instance;

    var instanceTagIndex = 0;

    var streamAttr = SC_STREAM_ATTR + '="true"';

    var transformer = new stream.Transform({
      transform: function appendStyleChunks(chunk, /* encoding */ _, callback) {
        var tags = instance.tags;

        var html = '';

        /* retrieve html for each new style tag */
        for (; instanceTagIndex < tags.length; instanceTagIndex += 1) {
          var tag = tags[instanceTagIndex];
          html += tag.toHTML(streamAttr);
        }

        /* force our StyleSheets to emit entirely new tags */
        instance.sealAllTags();

        var renderedHtml = chunk.toString();

        /* prepend style html to chunk, unless the start of the chunk is a closing tag in which case append right after that */
        if (CLOSING_TAG_R.test(renderedHtml)) {
          var endOfClosingTag = renderedHtml.indexOf('>');

          this.push(
            renderedHtml.slice(0, endOfClosingTag + 1) +
              html +
              renderedHtml.slice(endOfClosingTag + 1)
          );
        } else this.push(html + renderedHtml);

        callback();
      },
    });

    readableStream.on('end', function() {
      return _this.seal();
    });

    readableStream.on('error', function(err) {
      _this.seal();

      // forward the error to the transform stream
      transformer.emit('error', err);
    });

    return readableStream.pipe(transformer);
  };

  return ServerStyleSheet;
})();

//

var StyleSheetContext = createContext();
var StyleSheetConsumer = StyleSheetContext.Consumer;

var StyleSheetManager = (function(_Component) {
  inherits(StyleSheetManager, _Component);

  function StyleSheetManager(props) {
    classCallCheck(this, StyleSheetManager);

    var _this = possibleConstructorReturn(this, _Component.call(this, props));

    _this.getContext = memoize(_this.getContext);
    return _this;
  }

  StyleSheetManager.prototype.getContext = function getContext(sheet, target) {
    if (sheet) {
      return sheet;
    } else if (target) {
      return new StyleSheet(target);
    } else {
      throw new StyledComponentsError(4);
    }
  };

  StyleSheetManager.prototype.render = function render() {
    var _props = this.props,
      children = _props.children,
      sheet = _props.sheet,
      target = _props.target;

    return React.createElement(
      StyleSheetContext.Provider,
      { value: this.getContext(sheet, target) },
      process.env.NODE_ENV !== 'production' ? React.Children.only(children) : children
    );
  };

  return StyleSheetManager;
})(Component);
process.env.NODE_ENV !== 'production'
  ? (StyleSheetManager.propTypes = {
      sheet: PropTypes.oneOfType([
        PropTypes.instanceOf(StyleSheet),
        PropTypes.instanceOf(ServerStyleSheet),
      ]),

      target: PropTypes.shape({
        appendChild: PropTypes.func.isRequired,
      }),
    })
  : void 0;

//

var identifiers = {};

/* We depend on components having unique IDs */
function generateId(_ComponentStyle, _displayName, parentComponentId) {
  var displayName = typeof _displayName !== 'string' ? 'sc' : escape(_displayName);

  /**
   * This ensures uniqueness if two components happen to share
   * the same displayName.
   */
  var nr = (identifiers[displayName] || 0) + 1;
  identifiers[displayName] = nr;

  var componentId = displayName + '-' + _ComponentStyle.generateName(displayName + nr);

  return parentComponentId ? parentComponentId + '-' + componentId : componentId;
}

// $FlowFixMe

var StyledComponent = (function(_Component) {
  inherits(StyledComponent, _Component);

  function StyledComponent() {
    classCallCheck(this, StyledComponent);

    var _this = possibleConstructorReturn(this, _Component.call(this));

    _this.attrs = {};

    _this.renderOuter = _this.renderOuter.bind(_this);
    _this.renderInner = _this.renderInner.bind(_this);

    if (process.env.NODE_ENV !== 'production') {
      _this.warnInnerRef = once(function(displayName) {
        return (
          // eslint-disable-next-line no-console
          console.warn(
            'The "innerRef" API has been removed in styled-components v4 in favor of React 16 ref forwarding, use "ref" instead like a typical component. "innerRef" was detected on component "' +
              displayName +
              '".'
          )
        );
      });

      _this.warnAttrsFnObjectKeyDeprecated = once(function(key, displayName) {
        return (
          // eslint-disable-next-line no-console
          console.warn(
            'Functions as object-form attrs({}) keys are now deprecated and will be removed in a future version of styled-components. Switch to the new attrs(props => ({})) syntax instead for easier and more powerful composition. The attrs key in question is "' +
              key +
              '" on component "' +
              displayName +
              '".',
            '\n ' + new Error().stack
          )
        );
      });

      _this.warnNonStyledComponentAttrsObjectKey = once(function(key, displayName) {
        return (
          // eslint-disable-next-line no-console
          console.warn(
            'It looks like you\'ve used a non styled-component as the value for the "' +
              key +
              '" prop in an object-form attrs constructor of "' +
              displayName +
              '".\n' +
              'You should use the new function-form attrs constructor which avoids this issue: attrs(props => ({ yourStuff }))\n' +
              "To continue using the deprecated object syntax, you'll need to wrap your component prop in a function to make it available inside the styled component (you'll still get the deprecation warning though.)\n" +
              ('For example, { ' +
                key +
                ': () => InnerComponent } instead of { ' +
                key +
                ': InnerComponent }')
          )
        );
      });
    }
    return _this;
  }

  StyledComponent.prototype.render = function render() {
    return React.createElement(StyleSheetConsumer, null, this.renderOuter);
  };

  StyledComponent.prototype.renderOuter = function renderOuter() {
    var styleSheet =
      arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : StyleSheet.master;

    this.styleSheet = styleSheet;

    // No need to subscribe a static component to theme changes, it won't change anything
    if (this.props.forwardedComponent.componentStyle.isStatic) return this.renderInner();

    return React.createElement(ThemeConsumer, null, this.renderInner);
  };

  StyledComponent.prototype.renderInner = function renderInner(theme) {
    var _props$forwardedCompo = this.props.forwardedComponent,
      componentStyle = _props$forwardedCompo.componentStyle,
      defaultProps = _props$forwardedCompo.defaultProps,
      displayName = _props$forwardedCompo.displayName,
      foldedComponentIds = _props$forwardedCompo.foldedComponentIds,
      styledComponentId = _props$forwardedCompo.styledComponentId,
      target = _props$forwardedCompo.target;

    var generatedClassName = void 0;
    if (componentStyle.isStatic) {
      generatedClassName = this.generateAndInjectStyles(EMPTY_OBJECT, this.props);
    } else {
      generatedClassName = this.generateAndInjectStyles(
        determineTheme(this.props, theme, defaultProps) || EMPTY_OBJECT,
        this.props
      );
    }

    var elementToBeCreated = this.props.as || this.attrs.as || target;
    var isTargetTag = isTag(elementToBeCreated);

    var propsForElement = {};
    var computedProps = _extends({}, this.attrs, this.props);

    var key = void 0;
    // eslint-disable-next-line guard-for-in
    for (key in computedProps) {
      if (process.env.NODE_ENV !== 'production' && key === 'innerRef' && isTargetTag) {
        this.warnInnerRef(displayName);
      }

      if (key === 'forwardedComponent' || key === 'as') {
        continue;
      } else if (key === 'forwardedRef') propsForElement.ref = computedProps[key];
      else if (key === 'forwardedAs') propsForElement.as = computedProps[key];
      else if (!isTargetTag || validAttr(key)) {
        // Don't pass through non HTML tags through to HTML elements
        propsForElement[key] = computedProps[key];
      }
    }

    if (this.props.style && this.attrs.style) {
      propsForElement.style = _extends({}, this.attrs.style, this.props.style);
    }

    propsForElement.className = Array.prototype
      .concat(
        foldedComponentIds,
        this.props.className,
        styledComponentId,
        this.attrs.className,
        generatedClassName
      )
      .filter(Boolean)
      .join(' ');

    return createElement(elementToBeCreated, propsForElement);
  };

  StyledComponent.prototype.buildExecutionContext = function buildExecutionContext(
    theme,
    props,
    attrs
  ) {
    var _this2 = this;

    var context = _extends({}, props, { theme: theme });

    if (!attrs.length) return context;

    this.attrs = {};

    attrs.forEach(function(attrDef) {
      var resolvedAttrDef = attrDef;
      var attrDefWasFn = false;
      var attr = void 0;
      var key = void 0;

      if (isFunction(resolvedAttrDef)) {
        // $FlowFixMe
        resolvedAttrDef = resolvedAttrDef(context);
        attrDefWasFn = true;
      }

      /* eslint-disable guard-for-in */
      // $FlowFixMe
      for (key in resolvedAttrDef) {
        attr = resolvedAttrDef[key];

        if (!attrDefWasFn) {
          if (isFunction(attr) && !isDerivedReactComponent(attr) && !isStyledComponent(attr)) {
            if (process.env.NODE_ENV !== 'production') {
              _this2.warnAttrsFnObjectKeyDeprecated(key, props.forwardedComponent.displayName);
            }

            attr = attr(context);

            if (process.env.NODE_ENV !== 'production' && React.isValidElement(attr)) {
              _this2.warnNonStyledComponentAttrsObjectKey(
                key,
                props.forwardedComponent.displayName
              );
            }
          }
        }

        _this2.attrs[key] = attr;
        context[key] = attr;
      }
      /* eslint-enable */
    });

    return context;
  };

  StyledComponent.prototype.generateAndInjectStyles = function generateAndInjectStyles(
    theme,
    props
  ) {
    var _props$forwardedCompo2 = props.forwardedComponent,
      attrs = _props$forwardedCompo2.attrs,
      componentStyle = _props$forwardedCompo2.componentStyle,
      warnTooManyClasses = _props$forwardedCompo2.warnTooManyClasses;

    // statically styled-components don't need to build an execution context object,
    // and shouldn't be increasing the number of class names

    if (componentStyle.isStatic && !attrs.length) {
      return componentStyle.generateAndInjectStyles(EMPTY_OBJECT, this.styleSheet);
    }

    var className = componentStyle.generateAndInjectStyles(
      this.buildExecutionContext(theme, props, attrs),
      this.styleSheet
    );

    if (process.env.NODE_ENV !== 'production' && warnTooManyClasses) warnTooManyClasses(className);

    return className;
  };

  return StyledComponent;
})(Component);

function createStyledComponent(target, options, rules) {
  var isTargetStyledComp = isStyledComponent(target);
  var isClass = !isTag(target);

  var _options$displayName = options.displayName,
    displayName =
      _options$displayName === undefined ? generateDisplayName(target) : _options$displayName,
    _options$componentId = options.componentId,
    componentId =
      _options$componentId === undefined
        ? generateId(ComponentStyle, options.displayName, options.parentComponentId)
        : _options$componentId,
    _options$ParentCompon = options.ParentComponent,
    ParentComponent = _options$ParentCompon === undefined ? StyledComponent : _options$ParentCompon,
    _options$attrs = options.attrs,
    attrs = _options$attrs === undefined ? EMPTY_ARRAY : _options$attrs;

  var styledComponentId =
    options.displayName && options.componentId
      ? escape(options.displayName) + '-' + options.componentId
      : options.componentId || componentId;

  // fold the underlying StyledComponent attrs up (implicit extend)
  var finalAttrs =
    // $FlowFixMe
    isTargetStyledComp && target.attrs
      ? Array.prototype.concat(target.attrs, attrs).filter(Boolean)
      : attrs;

  var componentStyle = new ComponentStyle(
    isTargetStyledComp // fold the underlying StyledComponent rules up (implicit extend)
      ? // $FlowFixMe
        target.componentStyle.rules.concat(rules)
      : rules,
    finalAttrs,
    styledComponentId
  );

  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  var WrappedStyledComponent = void 0;
  var forwardRef = function forwardRef(props, ref) {
    return React.createElement(
      ParentComponent,
      _extends({}, props, { forwardedComponent: WrappedStyledComponent, forwardedRef: ref })
    );
  };
  forwardRef.displayName = displayName;
  WrappedStyledComponent = React.forwardRef(forwardRef);
  WrappedStyledComponent.displayName = displayName;

  // $FlowFixMe
  WrappedStyledComponent.attrs = finalAttrs;
  // $FlowFixMe
  WrappedStyledComponent.componentStyle = componentStyle;

  // $FlowFixMe
  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp // $FlowFixMe
    ? Array.prototype.concat(target.foldedComponentIds, target.styledComponentId)
    : EMPTY_ARRAY;

  // $FlowFixMe
  WrappedStyledComponent.styledComponentId = styledComponentId;

  // fold the underlying StyledComponent target up since we folded the styles
  // $FlowFixMe
  WrappedStyledComponent.target = isTargetStyledComp ? target.target : target;

  // $FlowFixMe
  WrappedStyledComponent.withComponent = function withComponent(tag) {
    var previousComponentId = options.componentId,
      optionsToCopy = objectWithoutProperties(options, ['componentId']);

    var newComponentId =
      previousComponentId &&
      previousComponentId + '-' + (isTag(tag) ? tag : escape(getComponentName(tag)));

    var newOptions = _extends({}, optionsToCopy, {
      attrs: finalAttrs,
      componentId: newComponentId,
      ParentComponent: ParentComponent,
    });

    return createStyledComponent(tag, newOptions, rules);
  };

  // $FlowFixMe
  Object.defineProperty(WrappedStyledComponent, 'defaultProps', {
    get: function get$$1() {
      return this._foldedDefaultProps;
    },
    set: function set$$1(obj) {
      // $FlowFixMe
      this._foldedDefaultProps = isTargetStyledComp ? merge(target.defaultProps, obj) : obj;
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    // $FlowFixMe
    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(displayName);
  }

  // $FlowFixMe
  WrappedStyledComponent.toString = function() {
    return '.' + WrappedStyledComponent.styledComponentId;
  };

  if (isClass) {
    hoistNonReactStatics(WrappedStyledComponent, target, {
      // all SC-specific things should not be hoisted
      attrs: true,
      componentStyle: true,
      displayName: true,
      foldedComponentIds: true,
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
  'wbr',

  // SVG
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
};

// Shorthands for all valid HTML Elements
domElements.forEach(function(domElement) {
  styled[domElement] = styled(domElement);
});

//

var GlobalStyle = (function() {
  function GlobalStyle(rules, componentId) {
    classCallCheck(this, GlobalStyle);

    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules, EMPTY_ARRAY);

    if (!StyleSheet.master.hasId(componentId)) {
      StyleSheet.master.deferredInject(componentId, []);
    }
  }

  GlobalStyle.prototype.createStyles = function createStyles(executionContext, styleSheet) {
    var flatCSS = flatten(this.rules, executionContext, styleSheet);
    var css = stringifyRules(flatCSS, '');

    styleSheet.inject(this.componentId, css);
  };

  GlobalStyle.prototype.removeStyles = function removeStyles(styleSheet) {
    var componentId = this.componentId;

    if (styleSheet.hasId(componentId)) {
      styleSheet.remove(componentId);
    }
  };

  // TODO: overwrite in-place instead of remove+create?

  GlobalStyle.prototype.renderStyles = function renderStyles(executionContext, styleSheet) {
    this.removeStyles(styleSheet);
    this.createStyles(executionContext, styleSheet);
  };

  return GlobalStyle;
})();

//

// place our cache into shared context so it'll persist between HMRs
if (IS_BROWSER) {
  window.scCGSHMRCache = {};
}

function createGlobalStyle(strings) {
  for (
    var _len = arguments.length, interpolations = Array(_len > 1 ? _len - 1 : 0), _key = 1;
    _key < _len;
    _key++
  ) {
    interpolations[_key - 1] = arguments[_key];
  }

  var rules = css.apply(undefined, [strings].concat(interpolations));
  var id = 'sc-global-' + murmurhash(JSON.stringify(rules));
  var style = new GlobalStyle(rules, id);

  var GlobalStyleComponent = (function(_React$Component) {
    inherits(GlobalStyleComponent, _React$Component);

    function GlobalStyleComponent(props) {
      classCallCheck(this, GlobalStyleComponent);

      var _this = possibleConstructorReturn(this, _React$Component.call(this, props));

      var _this$constructor = _this.constructor,
        globalStyle = _this$constructor.globalStyle,
        styledComponentId = _this$constructor.styledComponentId;

      if (IS_BROWSER) {
        window.scCGSHMRCache[styledComponentId] =
          (window.scCGSHMRCache[styledComponentId] || 0) + 1;
      }

      /**
       * This fixes HMR compatibility. Don't ask me why, but this combination of
       * caching the closure variables via statics and then persisting the statics in
       * state works across HMR where no other combination did. ¯\_(ツ)_/¯
       */
      _this.state = {
        globalStyle: globalStyle,
        styledComponentId: styledComponentId,
      };
      return _this;
    }

    GlobalStyleComponent.prototype.componentWillUnmount = function componentWillUnmount() {
      if (window.scCGSHMRCache[this.state.styledComponentId]) {
        window.scCGSHMRCache[this.state.styledComponentId] -= 1;
      }
      /**
       * Depending on the order "render" is called this can cause the styles to be lost
       * until the next render pass of the remaining instance, which may
       * not be immediate.
       */
      if (window.scCGSHMRCache[this.state.styledComponentId] === 0) {
        this.state.globalStyle.removeStyles(this.styleSheet);
      }
    };

    GlobalStyleComponent.prototype.render = function render() {
      var _this2 = this;

      if (process.env.NODE_ENV !== 'production' && React.Children.count(this.props.children)) {
        // eslint-disable-next-line no-console
        console.warn(
          'The global style component ' +
            this.state.styledComponentId +
            ' was given child JSX. createGlobalStyle does not render children.'
        );
      }

      return React.createElement(StyleSheetConsumer, null, function(styleSheet) {
        _this2.styleSheet = styleSheet || StyleSheet.master;

        var globalStyle = _this2.state.globalStyle;

        if (globalStyle.isStatic) {
          globalStyle.renderStyles(STATIC_EXECUTION_CONTEXT, _this2.styleSheet);

          return null;
        } else {
          return React.createElement(ThemeConsumer, null, function(theme) {
            // $FlowFixMe
            var defaultProps = _this2.constructor.defaultProps;

            var context = _extends({}, _this2.props);

            if (typeof theme !== 'undefined') {
              context.theme = determineTheme(_this2.props, theme, defaultProps);
            }

            globalStyle.renderStyles(context, _this2.styleSheet);

            return null;
          });
        }
      });
    };

    return GlobalStyleComponent;
  })(React.Component);

  GlobalStyleComponent.globalStyle = style;
  GlobalStyleComponent.styledComponentId = id;

  return GlobalStyleComponent;
}

//

var replaceWhitespace = function replaceWhitespace(str) {
  return str.replace(/\s|\\n/g, '');
};

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
    var _len = arguments.length, interpolations = Array(_len > 1 ? _len - 1 : 0), _key = 1;
    _key < _len;
    _key++
  ) {
    interpolations[_key - 1] = arguments[_key];
  }

  var rules = css.apply(undefined, [strings].concat(interpolations));

  var name = generateAlphabeticName(murmurhash(replaceWhitespace(JSON.stringify(rules))));

  return new Keyframes(name, stringifyRules(rules, name, '@keyframes'));
}

//

var withTheme = function(Component$$1) {
  var WithTheme = React.forwardRef(function(props, ref) {
    return React.createElement(ThemeConsumer, null, function(theme) {
      // $FlowFixMe
      var defaultProps = Component$$1.defaultProps;

      var themeProp = determineTheme(props, theme, defaultProps);

      if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
        // eslint-disable-next-line no-console
        console.warn(
          '[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class "' +
            getComponentName(Component$$1) +
            '"'
        );
      }

      return React.createElement(Component$$1, _extends({}, props, { theme: themeProp, ref: ref }));
    });
  });

  hoistNonReactStatics(WithTheme, Component$$1);

  WithTheme.displayName = 'WithTheme(' + getComponentName(Component$$1) + ')';

  return WithTheme;
};

//

/* eslint-disable */
var __DO_NOT_USE_OR_YOU_WILL_BE_HAUNTED_BY_SPOOKY_GHOSTS = {
  StyleSheet: StyleSheet,
};

//

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
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test' &&
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  typeof navigator.userAgent === 'string' &&
  navigator.userAgent.indexOf('Node.js') === -1 &&
  navigator.userAgent.indexOf('jsdom') === -1
) {
  window['__styled-components-init__'] = window['__styled-components-init__'] || 0;

  if (window['__styled-components-init__'] === 1) {
    // eslint-disable-next-line no-console
    console.warn(
      "It looks like there are several instances of 'styled-components' initialized in this application. " +
        'This may cause dynamic styles not rendering properly, errors happening during rehydration process ' +
        'and makes your application bigger without a good reason.\n\n' +
        'See https://s-c.sh/2BAXzed for more info.'
    );
  }

  window['__styled-components-init__'] += 1;
}

//

export default styled;
export {
  createGlobalStyle,
  css,
  isStyledComponent,
  keyframes,
  ServerStyleSheet,
  StyleSheetConsumer,
  StyleSheetContext,
  StyleSheetManager,
  ThemeConsumer,
  ThemeContext,
  ThemeProvider,
  withTheme,
  __DO_NOT_USE_OR_YOU_WILL_BE_HAUNTED_BY_SPOOKY_GHOSTS,
};
//# sourceMappingURL=styled-components.browser.esm.js.map
