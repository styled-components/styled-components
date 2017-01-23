const { stringify } = require('postcss-value-parser');
const cssColorKeywords = require('css-color-keywords');

const hexColorRe = /^(#(?:[0-9a-f]{3,4}){1,2})$/i;
const cssFunctionNameRe = /^(rgba?|hsla?|hwb|lab|lch|gray|color)$/;

const matchColor = (node) => {
  if (node.type === 'word' && (hexColorRe.test(node.value) || node.value in cssColorKeywords)) {
    return node.value;
  } else if (node.type === 'function' && cssFunctionNameRe.test(node.value)) {
    return stringify(node);
  }
  return null;
};

const noneRe = /^(none)$/;
const numberRe = /^([+-]?(?:\d*\.)?\d+(?:[Ee][+-]?\d+)?)$/;
const lengthRe = /^([+-]?(?:\d*\.)?\d+(?:[Ee][+-]?\d+)?)px$/;
const angleRe = /^([+-]?(?:\d*\.)?\d+(?:[Ee][+-]?\d+)?(?:deg|rad))$/;
const percentRe = /^([+-]?(?:\d*\.)?\d+(?:[Ee][+-]?\d+)?%)$/;

const noopToken = predicate => node => (predicate(node) ? '<token>' : null);

const valueForTypeToken = type => node => (node.type === type ? node.value : null);

const regExpToken = (regExp, transform = String) => (node) => {
  if (node.type !== 'word') return null;

  const match = node.value.match(regExp);
  if (!match) return null;

  const value = transform(match[1]);

  return value;
};

module.exports.regExpToken = regExpToken;

module.exports.tokens = {
  SPACE: noopToken(node => node.type === 'space'),
  SLASH: noopToken(node => node.type === 'div' && node.value === '/'),
  COMMA: noopToken(node => node.type === 'div' && node.value === ','),
  STRING: valueForTypeToken('string'),
  WORD: valueForTypeToken('word'),
  NONE: regExpToken(noneRe),
  NUMBER: regExpToken(numberRe, Number),
  LENGTH: regExpToken(lengthRe, Number),
  ANGLE: regExpToken(angleRe),
  PERCENT: regExpToken(percentRe),
  COLOR: matchColor,
};
