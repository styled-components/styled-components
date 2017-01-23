const { tokens } = require('../tokenTypes');
const border = require('./border');
const flex = require('./flex');
const flexFlow = require('./flexFlow');
const font = require('./font');
const transform = require('./transform');
const { directionFactory, shadowOffsetFactory } = require('./util');

const { WORD, COLOR } = tokens;

const background = tokenStream => ({ $merge: { backgroundColor: tokenStream.match(COLOR) } });
const borderColor = directionFactory({ type: 'word', prefix: 'border', suffix: 'Color' });
const borderRadius = directionFactory({
  directions: ['TopRight', 'BottomRight', 'BottomLeft', 'TopLeft'],
  prefix: 'border',
  suffix: 'Radius',
});
const borderWidth = directionFactory({ prefix: 'border', suffix: 'Width' });
const margin = directionFactory({ prefix: 'margin' });
const padding = directionFactory({ prefix: 'padding' });
const fontVariant = tokenStream => [tokenStream.match(WORD)];
const fontWeight = tokenStream => tokenStream.match(WORD);
const shadowOffset = shadowOffsetFactory();
const textShadowOffset = shadowOffsetFactory();

module.exports = {
  background,
  border,
  borderColor,
  borderRadius,
  borderWidth,
  flex,
  flexFlow,
  font,
  fontVariant,
  fontWeight,
  margin,
  padding,
  shadowOffset,
  textShadowOffset,
  transform,
};
