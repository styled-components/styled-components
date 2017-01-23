/* eslint-disable no-param-reassign */
const parse = require('postcss-value-parser');
const camelizeStyleName = require('fbjs/lib/camelizeStyleName');
const transforms = require('./transforms');
const TokenStream = require('./TokenStream');

const transformRawValue = input => (
  (input !== '' && !isNaN(input))
    ? Number(input)
    : input
);

export const parseProp = (propName, value) => {
  const ast = parse(value).nodes;
  const tokenStream = new TokenStream(ast);
  return transforms[propName](tokenStream);
};

export const getStylesForProperty = (propName, inputValue, allowShorthand) => {
  const value = inputValue.trim();

  const propValue = (allowShorthand && (propName in transforms))
    ? parseProp(propName, value)
    : transformRawValue(value);

  return (propValue && propValue.$merge)
    ? propValue.$merge
    : { [propName]: propValue };
};

export const getPropertyName = camelizeStyleName;

export default (rules, shorthandBlacklist = []) => rules.reduce((accum, rule) => {
  const propertyName = getPropertyName(rule[0]);
  const value = rule[1];
  const allowShorthand = shorthandBlacklist.indexOf(propertyName) === -1;
  return Object.assign(accum, getStylesForProperty(propertyName, value, allowShorthand));
}, {});
