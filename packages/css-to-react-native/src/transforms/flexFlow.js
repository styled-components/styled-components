/* eslint-disable no-param-reassign */
const { assertUptoNValuesOfType } = require('./util');

const defaultWrap = 'nowrap';
const defaultDirection = 'row';

const wraps = ['nowrap', 'wrap', 'wrap-reverse'];
const directions = ['row', 'row-reverse', 'column', 'column-reverse'];

module.exports = (root) => {
  const { nodes } = root.first;
  assertUptoNValuesOfType(2, 'word', nodes);

  const values = nodes.reduce((accum, node) => {
    if (accum.wrap === undefined && wraps.indexOf(node.value) !== -1) {
      accum.wrap = node.value;
    } else if (accum.direction === undefined && directions.indexOf(node.value) !== -1) {
      accum.direction = node.value;
    } else {
      throw new Error(`Unexpected value: ${node}`);
    }
    return accum;
  }, {
    wrap: undefined,
    direction: undefined,
  });

  const {
    wrap: flexWrap = defaultWrap,
    direction: flexDirection = defaultDirection,
  } = values;

  return { $merge: { flexWrap, flexDirection } };
};
