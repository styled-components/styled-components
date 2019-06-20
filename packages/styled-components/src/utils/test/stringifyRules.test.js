import stringifyRules from '../stringifyRules';

it('stringifys @-ms-viewport correctly', () => {
  const result = stringifyRules(['@-ms-viewport { width: device-width; }'], '');

  expect(result).toEqual(['@-ms-viewport{width: device-width;}']);
});
