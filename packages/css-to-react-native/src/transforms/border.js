/* eslint-disable no-param-reassign */
const defaultWidth = 1;
const defaultStyle = 'solid';
const defaultColor = 'black';

const styles = ['solid', 'dotted', 'dashed'];

module.exports = (root) => {
  const { nodes } = root.first;
  const values = nodes.reduce((accum, node) => {
    if (accum.width === undefined && node.type === 'number') {
      accum.width = Number(node.value);
    } else if (accum.style === undefined && node.type === 'word' && styles.indexOf(node.value) !== -1) {
      accum.style = node.value;
    } else if (accum.color === undefined && node.type === 'word' && node.isColor) {
      accum.color = node.value;
    } else {
      throw new Error(`Unexpected value: ${node}`);
    }
    return accum;
  }, {
    width: undefined,
    style: undefined,
    color: undefined,
  });

  const {
    width: borderWidth = defaultWidth,
    style: borderStyle = defaultStyle,
    color: borderColor = defaultColor,
  } = values;

  return { $merge: { borderWidth, borderStyle, borderColor } };
};
