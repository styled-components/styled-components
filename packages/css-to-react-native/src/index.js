/* eslint-disable no-param-reassign */
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

export const getStylesForProperty = (propName, inputValue, allowShorthand) => {
  const value = inputValue.trim();

  const propValue = (allowShorthand && transforms.indexOf(propName) !== -1)
    ? (new nearley.Parser(grammar.ParserRules, propName).feed(value).results[0])
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
