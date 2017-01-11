/* eslint-disable no-param-reassign */
const parser = require('postcss-values-parser/lib/index');
const camelizeStyleName = require('fbjs/lib/camelizeStyleName');
const transforms = require('./transforms');

const transformRawValue = input => (
  (input !== '' && !isNaN(input))
    ? Number(input)
    : input
);

export const parseProp = (propName, value) => {
  const ast = parser(value).parse();
  return transforms[propName](ast);
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
