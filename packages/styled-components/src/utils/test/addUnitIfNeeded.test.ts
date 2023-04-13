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
