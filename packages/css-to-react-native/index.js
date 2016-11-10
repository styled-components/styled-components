/* eslint-disable no-param-reassign */
const postcss = require('postcss');
const nearley = require('nearley');
const camelizeStyleName = require('fbjs/lib/camelizeStyleName');
const grammar = require('./grammar');

const transforms = [
  'border',
  'borderColor',
  'borderRadius',
  'borderWidth',
  'fontVariant',
  'fontWeight',
  'margin',
  'padding',
  'shadowOffset',
  'transform',
];

const transformRawValue = input => (
  (input !== '' && !isNaN(input))
    ? Number(input)
    : input
);

module.exports = (css) => {
  const root = postcss.parse(css);

  const decls = [];
  root.walkDecls((decl) => { decls.push(decl); });

  const style = decls.reduce((accum, decl) => {
    const propName = camelizeStyleName(decl.prop);

    const { value } = decl;
    const propValue = (transforms.indexOf(propName) !== -1)
      ? (new nearley.Parser(grammar.ParserRules, propName).feed(value).results[0])
      : transformRawValue(value);

    if (propValue && propValue.$merge) {
      Object.assign(accum, propValue.$merge);
    } else {
      accum[propName] = propValue;
    }

    return accum;
  }, {});

  return style;
};
