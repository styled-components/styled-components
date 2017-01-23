const { regExpToken, tokens } = require('../tokenTypes');

const { SPACE, COLOR, LENGTH } = tokens;
const BORDER_STYLE = regExpToken(/^(solid|dashed|dotted)$/);

/* eslint-disable no-param-reassign */
const defaultWidth = 1;
const defaultStyle = 'solid';
const defaultColor = 'black';

module.exports = (tokenStream) => {
  let borderWidth;
  let borderColor;
  let borderStyle;

  let numParsed = 0;
  while (numParsed < 3 && tokenStream.hasTokens()) {
    if (numParsed) tokenStream.expect(SPACE);

    if (borderWidth === undefined && tokenStream.match(LENGTH)) {
      borderWidth = tokenStream.lastValue;
    } else if (borderColor === undefined && tokenStream.match(COLOR)) {
      borderColor = tokenStream.lastValue;
    } else if (borderStyle === undefined && tokenStream.match(BORDER_STYLE)) {
      borderStyle = tokenStream.lastValue;
    } else {
      tokenStream.throw();
    }

    numParsed += 1;
  }

  tokenStream.expectEmpty();

  if (borderWidth === undefined) borderWidth = defaultWidth;
  if (borderColor === undefined) borderColor = defaultColor;
  if (borderStyle === undefined) borderStyle = defaultStyle;

  return { $merge: { borderWidth, borderStyle, borderColor } };
};
