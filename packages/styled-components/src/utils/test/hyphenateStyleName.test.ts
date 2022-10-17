import hyphenateStyleName from '../hyphenateStyleName';

test('hyphenateStyleName', () => {
  expect(hyphenateStyleName('backgroundColor')).toEqual('background-color');
  expect(hyphenateStyleName('MozTransition')).toEqual('-moz-transition');
  expect(hyphenateStyleName('msTransition')).toEqual('-ms-transition');
  // https://github.com/styled-components/styled-components/issues/3810
  expect(hyphenateStyleName('--MyColor')).toEqual('--MyColor');
});
