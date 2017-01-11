/* eslint-disable no-param-reassign */
const PARSE_STYLE_WEIGHT_VARIANT = 0;
const PARSE_SIZE = 1;
const PARSE_MAYBE_LINE_HEIGHT = 2;
const PARSE_LINE_HEIGHT = 3;
const PARSE_FONT_FAMILY = 4;
const PARSE_FINISHED = 5;

const styles = ['italic'];
const weights = ['bold'];
const numericWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const variants = ['small-caps'];

module.exports = (root) => {
  const { nodes } = root.first;

  const values = nodes.reduce((accum, node) => {
    if (accum.parseMode === PARSE_STYLE_WEIGHT_VARIANT) {
      let didMatchStyleWeightVariant = true;
      const { type, value } = node;

      if (type === 'word' && value === 'normal') {
        /* pass */
      } else if (accum.style === undefined && type === 'word' && styles.indexOf(value) !== -1) {
        accum.style = value;
      } else if (accum.weight === undefined && type === 'number' && numericWeights.indexOf(Number(value)) !== -1) {
        accum.weight = String(value);
      } else if (accum.weight === undefined && type === 'word' && weights.indexOf(value) !== -1) {
        accum.weight = value;
      } else if (accum.variant === undefined && type === 'word' && variants.indexOf(value) !== -1) {
        accum.variant = [value];
      } else {
        didMatchStyleWeightVariant = false;
      }

      if (didMatchStyleWeightVariant) {
        accum.numStyleWeightVariantMatched += 1;
        if (accum.numStyleWeightVariantMatched === 3) accum.parseMode = PARSE_SIZE;
        return accum;
      }

      accum.parseMode = PARSE_SIZE; // fallthrough
    }

    if (accum.parseMode === PARSE_SIZE) {
      if (accum.size === undefined && node.type === 'number') {
        accum.size = Number(node.value);
        accum.parseMode = PARSE_MAYBE_LINE_HEIGHT;
        return accum;
      }
    }

    if (accum.parseMode === PARSE_MAYBE_LINE_HEIGHT) {
      if (node.type === 'operator' && node.value === '/') {
        accum.parseMode = PARSE_LINE_HEIGHT;
        return accum;
      }
      accum.parseMode = PARSE_FONT_FAMILY; // fallthrough
    }

    if (accum.parseMode === PARSE_LINE_HEIGHT) {
      if (accum.lineHeight === undefined && node.type === 'number') {
        accum.lineHeight = Number(node.value);
        accum.parseMode = PARSE_FONT_FAMILY;
        return accum;
      }
    }

    if (accum.parseMode === PARSE_FONT_FAMILY) {
      if (accum.family === undefined && node.type === 'string') {
        accum.family = node.value;
        accum.parseMode = PARSE_FINISHED;
        return accum;
      } else if (node.type === 'word') {
        accum.family = `${(accum.family || '')} ${node.value}`;
        return accum;
      }
    }

    throw new Error(`Unexpected value: ${node}`);
  }, {
    numStyleWeightVariantMatched: 0,
    parseMode: PARSE_STYLE_WEIGHT_VARIANT,
    style: undefined,
    weight: undefined,
    variant: undefined,
    size: undefined,
    lineHeight: undefined,
    family: undefined,
  });

  const {
    style: fontStyle = 'normal',
    weight: fontWeight = 'normal',
    variant: fontVariant = [],
    size: fontSize,
    family: fontFamily,
  } = values;

  if (fontSize === undefined || fontFamily === undefined) throw new Error('Unexpected error');

  const out = { fontStyle, fontWeight, fontVariant, fontSize, fontFamily };
  if (values.lineHeight !== undefined) out.lineHeight = values.lineHeight;

  return { $merge: out };
};
