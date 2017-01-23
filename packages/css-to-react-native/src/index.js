/* eslint-disable no-param-reassign */
const parse = require('postcss-value-parser');
const camelizeStyleName = require('fbjs/lib/camelizeStyleName');
const transforms = require('./transforms');
const TokenStream = require('./TokenStream');

// Note if this is wrong, you'll need to change tokenTypes.js too
const numberOrLengthRe = /^([+-]?(?:\d*\.)?\d+(?:[Ee][+-]?\d+)?)(?:px)?$/;

// Undocumented export
export const transformRawValue = (input) => {
  const value = input.trim().match(numberOrLengthRe);
  return value ? Number(value[1]) : input;
};

export const getStylesForProperty = (propName, inputValue, allowShorthand) => {
  // Undocumented: allow ast to be passed in
  let propValue;

  const isRawValue = (allowShorthand === false) || !(propName in transforms);
  if (isRawValue) {
    const value = typeof inputValue === 'string' ? inputValue : parse.stringify(inputValue);
    propValue = transformRawValue(value);
  } else {
    const ast = typeof inputValue === 'string' ? parse(inputValue.trim()) : inputValue;
    const tokenStream = new TokenStream(ast.nodes);
    propValue = transforms[propName](tokenStream);
  }

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
