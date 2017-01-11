const border = require('./border');
const flex = require('./flex');
const flexFlow = require('./flexFlow');
const font = require('./font');
const transform = require('./transform');
const { directionFactory, shadowOffsetFactory } = require('./util');

const background = root => ({ $merge: { backgroundColor: String(root) } });
const borderColor = directionFactory({ type: 'word', prefix: 'border', suffix: 'Color' });
const borderRadius = directionFactory({
  directions: ['TopRight', 'BottomRight', 'BottomLeft', 'TopLeft'],
  prefix: 'border',
  suffix: 'Radius',
});
const borderWidth = directionFactory({ prefix: 'border', suffix: 'Width' });
const margin = directionFactory({ prefix: 'margin' });
const padding = directionFactory({ prefix: 'padding' });
const fontVariant = root => root.first.nodes.map(String);
const fontWeight = root => String(root);
const shadowOffset = shadowOffsetFactory('textShadowOffset');
const textShadowOffset = shadowOffsetFactory();

// const transforms = [
//   'background',
//   'border',
//   'borderColor',
//   'borderRadius',
//   'borderWidth',
//   'flex',
//   'flexFlow',
//   'font',
//   'fontVariant',
//   'fontWeight',
//   'margin',
//   'padding',
//   'shadowOffset',
//   'textShadowOffset',
//   'transform',
// ];

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
