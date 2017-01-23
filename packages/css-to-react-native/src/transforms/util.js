const { tokens } = require('../tokenTypes');

const { LENGTH, SPACE } = tokens;

module.exports.directionFactory = ({
  types = [LENGTH],
  directions = ['Top', 'Right', 'Bottom', 'Left'],
  prefix = '',
  suffix = '',
}) => (tokenStream) => {
  const values = [];

  values.push(tokenStream.expect(...types));

  while (values.length < 4 && tokenStream.hasTokens()) {
    tokenStream.expect(SPACE);
    values.push(tokenStream.expect(...types));
  }

  tokenStream.expectEmpty();

  const [top, right = top, bottom = top, left = right] = values;

  const keyFor = n => `${prefix}${directions[n]}${suffix}`;

  const output = {
    [keyFor(0)]: top,
    [keyFor(1)]: right,
    [keyFor(2)]: bottom,
    [keyFor(3)]: left,
  };

  return { $merge: output };
};

module.exports.shadowOffsetFactory = () => (tokenStream) => {
  const width = tokenStream.expect(LENGTH);
  const height = tokenStream.match(SPACE)
    ? tokenStream.expect(LENGTH)
    : width;
  tokenStream.expectEmpty();
  return { width, height };
};
