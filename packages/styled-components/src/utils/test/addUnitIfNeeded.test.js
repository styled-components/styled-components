import addUnitIfNeeded from '../addUnitIfNeeded';

it('adds a px prefix if needed for properties that require a unit', () => {
  [
    ['marginLeft', 1],
    ['top', -1],
    ['flexBasis', 100],
    ['gridTemplateColumns', 200],
    ['fontSize', 10],
  ].forEach(([key, value]) => expect(addUnitIfNeeded(key, value)).toEqual(`${value}px`));
});

it('does not add a px prefix for unitless properties', () => {
  [['lineHeight', 1], ['flex', 2], ['fontWeight', 400]].forEach(([key, value]) =>
    expect(addUnitIfNeeded(key, value)).toEqual(String(value))
  );
});
