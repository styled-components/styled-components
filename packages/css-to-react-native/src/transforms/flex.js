const { tokens } = require('../tokenTypes');

const { NONE, AUTO, NUMBER, LENGTH, SPACE } = tokens;

const defaultFlexGrow = 1;
const defaultFlexShrink = 1;
const defaultFlexBasis = 0;

module.exports = (tokenStream) => {
  let flexGrow;
  let flexShrink;
  let flexBasis;

  if (tokenStream.matches(NONE)) {
    tokenStream.expectEmpty();
    return { $merge: { flexGrow: 0, flexShrink: 0 } };
  } else if (tokenStream.matches(AUTO)) {
    tokenStream.expectEmpty();
    return { $merge: { flexGrow: 1, flexShrink: 1 } };
  }

  let partsParsed = 0;
  while (partsParsed < 2 && tokenStream.hasTokens()) {
    if (partsParsed !== 0) tokenStream.expect(SPACE);

    if (flexGrow === undefined && tokenStream.matches(NUMBER)) {
      flexGrow = tokenStream.lastValue;

      if (tokenStream.lookahead().matches(NUMBER)) {
        tokenStream.expect(SPACE);
        flexShrink = tokenStream.expect(NUMBER);
      }
    } else if (flexBasis === undefined && tokenStream.matches(LENGTH)) {
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
