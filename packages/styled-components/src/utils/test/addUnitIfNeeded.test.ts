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

it('treats an Object.prototype key as a property that takes a unit', () => {
  // No prototype key is a CSS property, so only the listed names are unitless.
  expect(addUnitIfNeeded('constructor', 5)).toEqual('5px');
  expect(addUnitIfNeeded('toString', 2)).toEqual('2px');
  expect(addUnitIfNeeded('opacity', 0.5)).toEqual('0.5');
});

it('does not add a px prefix to grid-area and line-clamp integers', () => {
  // https://drafts.csswg.org/css-grid-2/#propdef-grid-area
  // "grid-area Value: <grid-line> [ / <grid-line> ]{0,3}"
  // "<grid-line> = auto | <custom-ident> | [ [ <integer [-∞,-1]> | <integer [1,∞]> ] && <custom-ident>? ] | [ span && [ <integer [1,∞]> || <custom-ident> ] ]"
  expect(addUnitIfNeeded('gridArea', 2)).toEqual('2');
  expect(addUnitIfNeeded('gridArea', -1)).toEqual('-1');

  // https://drafts.csswg.org/css-overflow-4/#propdef-line-clamp
  // "line-clamp Value: none | [<'max-lines'> || <'block-ellipsis'>] -webkit-legacy?"
  // https://drafts.csswg.org/css-overflow-4/#propdef-max-lines
  // "max-lines Value: auto || <integer [1,∞]>"
  expect(addUnitIfNeeded('lineClamp', 3)).toEqual('3');
});
