const { regExpToken, tokens } = require('../tokenTypes');
const flex = require('./flex');
const font = require('./font');
const fontFamily = require('./fontFamily');
const transform = require('./transform');
const { directionFactory, anyOrderFactory, shadowOffsetFactory } = require('./util');

const { IDENT, WORD, COLOR } = tokens;

const background = tokenStream => ({ $merge: { backgroundColor: tokenStream.expect(COLOR) } });
const border = anyOrderFactory({
  borderWidth: {
    token: tokens.LENGTH,
    default: 1,
  },
  borderColor: {
    token: COLOR,
    default: 'black',
  },
  borderStyle: {
    token: regExpToken(/^(solid|dashed|dotted)$/),
    default: 'solid',
  },
});
const borderColor = directionFactory({
  types: [WORD],
  prefix: 'border',
  suffix: 'Color',
});
const borderRadius = directionFactory({
  directions: ['TopRight', 'BottomRight', 'BottomLeft', 'TopLeft'],
  prefix: 'border',
  suffix: 'Radius',
});
const borderWidth = directionFactory({ prefix: 'border', suffix: 'Width' });
const margin = directionFactory({ prefix: 'margin' });
const padding = directionFactory({ prefix: 'padding' });
const flexFlow = anyOrderFactory({
  flexWrap: {
    token: regExpToken(/(nowrap|wrap|wrap-reverse)/),
    default: 'nowrap',
  },
  flexDirection: {
    token: regExpToken(/(row|row-reverse|column|column-reverse)/),
    default: 'row',
  },
});
const fontVariant = tokenStream => [tokenStream.expect(IDENT)];
const fontWeight = tokenStream => tokenStream.expect(WORD); // Also match numbers as strings
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
  fontFamily,
  fontVariant,
  fontWeight,
  margin,
  padding,
  shadowOffset,
  textShadowOffset,
  transform,
};
