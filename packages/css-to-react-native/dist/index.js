'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/* eslint-disable no-param-reassign */
var postcss = require('postcss');
var nearley = require('nearley');
var camelizeStyleName = require('fbjs/lib/camelizeStyleName');
var grammar = require('./grammar');

var transforms = ['background', 'border', 'borderColor', 'borderRadius', 'borderWidth', 'flex', 'flexFlow', 'font', 'fontVariant', 'fontWeight', 'margin', 'padding', 'shadowOffset', 'textShadowOffset', 'transform'];

var transformRawValue = function transformRawValue(input) {
  return input !== '' && !isNaN(input) ? Number(input) : input;
};

var getStylesForProperty = function getStylesForProperty(propName, inputValue) {
  var value = inputValue.trim();

  var propValue = transforms.indexOf(propName) !== -1 ? new nearley.Parser(grammar.ParserRules, propName).feed(value).results[0] : transformRawValue(value);

  return propValue && propValue.$merge ? propValue.$merge : _defineProperty({}, propName, propValue);
};

var getPropertyName = camelizeStyleName;

var getStylesForDecl = function getStylesForDecl(decl) {
  return getStylesForProperty(getPropertyName(decl.prop), decl.value);
};

module.exports = function (css) {
  var root = postcss.parse(css);

  var decls = [];
  root.walkDecls(function (decl) {
    decls.push(decl);
  });

  var style = decls.reduce(function (accum, decl) {
    return Object.assign(accum, getStylesForDecl(decl));
  }, {});

  return style;
};