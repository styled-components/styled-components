import addUnitIfNeeded from '../addUnitIfNeeded';

it('adds a px prefix if needed for properties that require a unit', () => {
  const pairs: Array<[string, number]> = [
    ['marginLeft', 1],
    ['top', -1],
    ['flexBasis', 100],
    ['gridTemplateColumns', 200],
    ['fontSize', 10],
  ];
  pairs.forEach(([key, value]) => expect(addUnitIfNeeded(key, value)).toEqual(`${value}px`));
});

it('does not add a px prefix for unitless properties', () => {
  const pairs: Array<[string, number]> = [
    ['lineHeight', 1],
    ['flex', 2],
    ['fontWeight', 400],
    ['--tooltip-z-index', 1000],
  ];
  pairs.forEach(([key, value]) => expect(addUnitIfNeeded(key, value)).toEqual(String(value)));
});

it('does not add a px prefix to properties whose grammar takes a bare number', () => {
  // https://drafts.csswg.org/css-fonts-5/#propdef-font-size-adjust
  // "font-size-adjust Value: none | [ ex-height | cap-height | ch-width | ic-width | ic-height ]? [ from-font | <number [0,∞]> ]"
  expect(addUnitIfNeeded('fontSizeAdjust', 0.5)).toEqual('0.5');

  // https://drafts.csswg.org/css-inline-3/#propdef-initial-letter
  // "initial-letter Value: normal | <number [1,∞]> <integer [1,∞]> | <number [1,∞]> && [ drop | raise ]?"
  expect(addUnitIfNeeded('initialLetter', 3)).toEqual('3');

  // https://w3c.github.io/mathml-core/#propdef-math-depth
  // "math-depth Value: auto-add | add(<integer>) | <integer>"
  expect(addUnitIfNeeded('mathDepth', 2)).toEqual('2');

  // https://drafts.csswg.org/css-shapes-1/#propdef-shape-image-threshold
  // "shape-image-threshold Value: <opacity-value>"
  expect(addUnitIfNeeded('shapeImageThreshold', 0.5)).toEqual('0.5');

  // https://drafts.csswg.org/css-text-4/#propdef-hyphenate-limit-chars
  // "hyphenate-limit-chars Value: [ auto | <integer [0,∞]> ]{1,3}"
  expect(addUnitIfNeeded('hyphenateLimitChars', 3)).toEqual('3');

  // https://drafts.csswg.org/css-masking-1/#propdef-mask-border-slice
  // "mask-border-slice Value: <'border-image-slice'>"
  // "mask-border-width Value: <'border-image-width'>"
  // "mask-border-outset Value: <'border-image-outset'>"
  expect(addUnitIfNeeded('maskBorderSlice', 30)).toEqual('30');
  expect(addUnitIfNeeded('maskBorderWidth', 2)).toEqual('2');
  expect(addUnitIfNeeded('maskBorderOutset', 1)).toEqual('1');
});
