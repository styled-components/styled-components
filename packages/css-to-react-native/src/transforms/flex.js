const { tokens } = require('../tokenTypes');

const { NONE, NUMBER, LENGTH, SPACE } = tokens;

const defaultFlexGrow = 1;
const defaultFlexShrink = 1;
const defaultFlexBasis = 0;

module.exports = (tokenStream) => {
  let flexGrow;
  let flexShrink;
  let flexBasis;

  if (tokenStream.match(NONE)) {
    tokenStream.expectEmpty();
    return { $merge: { flexGrow: 0, flexShrink: 0 } };
  }

  let partsParsed = 0;
  while (partsParsed < 2 && tokenStream.hasTokens()) {
    if (partsParsed) tokenStream.expect(SPACE);

    if (flexGrow === undefined && tokenStream.match(NUMBER)) {
      flexGrow = tokenStream.lastValue;

      if (tokenStream.lookahead().match(NUMBER)) {
        tokenStream.expect(SPACE);
        flexShrink = tokenStream.match(NUMBER);
      }
    } else if (flexBasis === undefined && tokenStream.match(LENGTH)) {
      flexBasis = tokenStream.lastValue;
    } else {
      tokenStream.throw();
    }

    partsParsed += 1;
  }

  tokenStream.expectEmpty();

  if (flexGrow === undefined) flexGrow = defaultFlexGrow;
  if (flexShrink === undefined) flexShrink = defaultFlexShrink;
  if (flexBasis === undefined) flexBasis = defaultFlexBasis;

  return { $merge: { flexGrow, flexShrink, flexBasis } };
};
