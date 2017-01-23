/* eslint-disable no-param-reassign */
const { tokens, regExpToken } = require('../tokenTypes');

const { SPACE } = tokens;
const WRAP = regExpToken(/(nowrap|wrap|wrap-reverse)/);
const DIRECTION = regExpToken(/(row|row-reverse|column|column-reverse)/);

const defaultFlexWrap = 'nowrap';
const defaultFlexDirection = 'row';

module.exports = (tokenStream) => {
  let flexWrap;
  let flexDirection;

  let numParsed = 0;
  while (numParsed < 2 && tokenStream.hasTokens()) {
    if (numParsed) tokenStream.expect(SPACE);

    if (flexWrap === undefined && tokenStream.match(WRAP)) {
      flexWrap = tokenStream.lastValue;
    } else if (flexDirection === undefined && tokenStream.match(DIRECTION)) {
      flexDirection = tokenStream.lastValue;
    }

    numParsed += 1;
  }

  tokenStream.expectEmpty();

  if (flexWrap === undefined) flexWrap = defaultFlexWrap;
  if (flexDirection === undefined) flexDirection = defaultFlexDirection;

  return { $merge: { flexWrap, flexDirection } };
};
