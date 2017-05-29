/* eslint-disable no-param-reassign */
const parse = require('postcss-value-parser');
const camelizeStyleName = require('fbjs/lib/camelizeStyleName');
const transforms = require('./transforms');
const TokenStream = require('./TokenStream');

// Note if this is wrong, you'll need to change tokenTypes.js too
const numberOrLengthRe = /^([+-]?(?:\d*\.)?\d+(?:[Ee][+-]?\d+)?)(?:px)?$/i;
const boolRe = /^true|false$/i;

// Undocumented export
export const transformRawValue = (input) => {
  const value = input.trim();

  const numberMatch = value.match(numberOrLengthRe);
  if (numberMatch !== null) return Number(numberMatch[1]);

  const boolMatch = input.match(boolRe);
  if (boolMatch !== null) return boolMatch[0].toLowerCase() === 'true';

  return value;
};

const baseTransformShorthandValue = (propName, inputValue) => {
  const ast = parse(inputValue.trim());
  const tokenStream = new TokenStream(ast.nodes);
  return transforms[propName](tokenStream);
};

const transformShorthandValue = (process.env.NODE_ENV === 'production')
  ? baseTransformShorthandValue
  : (propName, inputValue) => {
    try {
      return baseTransformShorthandValue(propName, inputValue);
    } catch (e) {
      throw new Error(`Failed to parse declaration "${propName}: ${inputValue}"`);
    }
  };

export const getStylesForProperty = (propName, inputValue, allowShorthand) => {
  const isRawValue = (allowShorthand === false) || !(propName in transforms);
  const propValue = isRawValue
    ? transformRawValue(inputValue)
    : transformShorthandValue(propName, inputValue.trim());

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
