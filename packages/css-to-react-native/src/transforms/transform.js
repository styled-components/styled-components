const { assertUptoNValuesOfType } = require('./util');

const singleNumber = nodes => Number(nodes[1].value);
const singleAngle = nodes => String(nodes[1]);
const xyTransformFactory = transform => (key, valueIfOmitted) => (nodes) => {
  const [
    /* paren */,
    xValue,
    /* comma */,
    yValue,
  ] = nodes;

  if (xValue.type !== 'number' || (yValue && yValue.type !== 'number')) {
    throw new Error('Expected values to be numbers');
  }

  const x = transform(xValue);

  if (valueIfOmitted === undefined && yValue === undefined) return x;

  const y = yValue !== undefined ? transform(yValue) : valueIfOmitted;
  return [{ [`${key}Y`]: y }, { [`${key}X`]: x }];
};
const xyNumber = xyTransformFactory(node => Number(node.value));
const xyAngle = xyTransformFactory(node => String(node).trim());

const partTransforms = {
  perspective: singleNumber,
  scale: xyNumber('scale'),
  scaleX: singleNumber,
  scaleY: singleNumber,
  translate: xyNumber('translate', 0),
  translateX: singleNumber,
  translateY: singleNumber,
  rotate: singleAngle,
  rotateX: singleAngle,
  rotateY: singleAngle,
  rotateZ: singleAngle,
  skewX: singleAngle,
  skewY: singleAngle,
  skew: xyAngle('skew', '0deg'),
};

module.exports = (root) => {
  const { nodes } = root.first;
  assertUptoNValuesOfType(Infinity, 'func', nodes);

  const transforms = nodes.reduce((accum, node) => {
    if (!(node.value in partTransforms)) throw new Error(`Unrecognised transform: ${node.value}`);

    let transformedValues = partTransforms[node.value](node.nodes);
    if (!Array.isArray(transformedValues)) {
      transformedValues = [{ [node.value]: transformedValues }];
    }

    return transformedValues.concat(accum);
  }, []);

  return transforms;
};
