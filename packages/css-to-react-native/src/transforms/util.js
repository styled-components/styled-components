const assertUptoNValuesOfType = (n, type, nodes) => {
  nodes.forEach((value) => {
    if (value.type !== type) throw new Error(`Expected all values to be of type ${type}`);
  });
  if (nodes.length > 4) throw new Error('Expected no more than four values');
  if (nodes.length === 0) throw new Error('Expected some values');
};
module.exports.assertUptoNValuesOfType = assertUptoNValuesOfType;

module.exports.directionFactory = ({
  type = 'number',
  directions = ['Top', 'Right', 'Bottom', 'Left'],
  prefix = '',
  suffix = '',
}) => (root) => {
  const { nodes } = root.first;
  assertUptoNValuesOfType(4, type, nodes);
  let values = nodes.map(node => node.value);
  if (type === 'number') values = values.map(Number);
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

module.exports.shadowOffsetFactory = () => (root) => {
  const { nodes } = root.first;
  assertUptoNValuesOfType(2, 'number', nodes);
  const [width, height = width] = nodes.map(node => Number(node.value));
  return { width, height };
};
