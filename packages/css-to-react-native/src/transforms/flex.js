const { assertUptoNValuesOfType } = require('./util');

module.exports = (root) => {
  const { nodes } = root.first;
  assertUptoNValuesOfType(3, 'number', nodes);

  const [flexGrow, flexShrink = 1, flexBasis = 0] = nodes.map(node => Number(node.value));

  return { $merge: { flexGrow, flexShrink, flexBasis } };
};
