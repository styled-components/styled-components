/* eslint-disable no-param-reassign */
const postcss = require('postcss');
const nearley = require('nearley');
const camelizeStyleName = require('fbjs/lib/camelizeStyleName');
const grammar = require('./grammar');

const transforms = [
  'background',
  'border',
  'borderColor',
  'borderRadius',
  'borderWidth',
  'flex',
  'flexFlow',
  'font',
  'fontVariant',
  'fontWeight',
  'margin',
  'padding',
  'shadowOffset',
  'textShadowOffset',
  'transform',
];

const transformRawValue = input => (
  (input !== '' && !isNaN(input))
    ? Number(input)
    : input
);

const getStylesForProperty = (propName, inputValue) => {
  const value = inputValue.trim();

  const propValue = (transforms.indexOf(propName) !== -1)
    ? (new nearley.Parser(grammar.ParserRules, propName).feed(value).results[0])
    : transformRawValue(value);

  return (propValue && propValue.$merge)
    ? propValue.$merge
    : { [propName]: propValue };
};

const getPropertyName = camelizeStyleName;

const getStylesForDecl = decl => getStylesForProperty(getPropertyName(decl.prop), decl.value);

module.exports = (css) => {
  const root = postcss.parse(css);

  const decls = [];
  root.walkDecls((decl) => { decls.push(decl); });

  const style = decls.reduce((accum, decl) => Object.assign(accum, getStylesForDecl(decl)), {});

  return style;
};
