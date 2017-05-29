const { tokens } = require('../tokenTypes');

const { LENGTH, PERCENT, SPACE } = tokens;

module.exports.directionFactory = ({
  types = [LENGTH, PERCENT],
  directions = ['Top', 'Right', 'Bottom', 'Left'],
  prefix = '',
  suffix = '',
}) => (tokenStream) => {
  const values = [];

  // borderWidth doesn't currently allow a percent value, but may do in the future
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

module.exports.anyOrderFactory = (properties, delim = SPACE) => (tokenStream) => {
  const propertyNames = Object.keys(properties);
  const values = propertyNames.reduce((accum, propertyName) => {
    accum[propertyName] === undefined; // eslint-disable-line
    return accum;
  }, {});

  let numParsed = 0;
  while (numParsed < propertyNames.length && tokenStream.hasTokens()) {
    if (numParsed) tokenStream.expect(delim);

    const matchedPropertyName = propertyNames.find(propertyName => (
      values[propertyName] === undefined && tokenStream.matches(properties[propertyName].token)
    ));

    if (!matchedPropertyName) {
      tokenStream.throw();
    } else {
      values[matchedPropertyName] = tokenStream.lastValue;
    }

    numParsed += 1;
  }

  tokenStream.expectEmpty();

  propertyNames.forEach((propertyName) => {
    if (values[propertyName] === undefined) values[propertyName] = properties[propertyName].default;
  });

  return { $merge: values };
};

module.exports.shadowOffsetFactory = () => (tokenStream) => {
  const width = tokenStream.expect(LENGTH);
  const height = tokenStream.matches(SPACE)
    ? tokenStream.expect(LENGTH)
    : width;
  tokenStream.expectEmpty();
  return { width, height };
};
