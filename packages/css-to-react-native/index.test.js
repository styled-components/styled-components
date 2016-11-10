/* global jest it, expect */
const transformCss = require('.');

const runTest = (inputCss, expectedStyles) => {
  const actualStyles = transformCss(inputCss);
  expect(actualStyles).toEqual(expectedStyles);
};

it('transforms numbers', () => runTest(`
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`, { top: 0, left: 0, right: 0, bottom: 0 }));

it('allows decimal values', () => runTest(`
  top: 1.5;
`, { top: 1.5 }));

it('transforms strings', () => runTest(`
  color: red;
`, { color: 'red' }));

it('transforms hex colors', () => runTest(`
  color: #f00;
`, { color: '#f00' }));

it('transforms rgb colors', () => runTest(`
  color: rgb(255, 0, 0);
`, { color: 'rgb(255, 0, 0)' }));

it('converts to camel-case', () => runTest(`
  background-color: red;
`, { backgroundColor: 'red' }));

it('transforms font weights as strings', () => runTest(`
  font-weight: 400;
`, { fontWeight: '400' }));

it('transforms font variant as an array', () => runTest(`
  font-variant: tabular-nums;
`, { fontVariant: ['tabular-nums'] }));

it('transforms shadow offsets', () => runTest(`
  shadow-offset: 10 5;
`, { shadowOffset: { width: 10, height: 5 } }));

it('transforms a single transform value with number', () => runTest(`
  transform: scaleX(5);
`, { transform: [{ scaleX: 5 }] }));

it('transforms a single transform value with string', () => runTest(`
  transform: rotate(5deg);
`, { transform: [{ rotate: '5deg' }] }));

it('transforms multiple transform values', () => runTest(`
  transform: scaleX(5) skewX(1deg);
`, { transform: [{ skewX: '1deg' }, { scaleX: 5 }] }));

it('transforms scale(number, number) to scaleX and scaleY', () => runTest(`
  transform: scale(2, 3);
`, { transform: [{ scaleY: 3 }, { scaleX: 2 }] }));

it('transforms scale(number) to scale', () => runTest(`
  transform: scale(5);
`, { transform: [{ scale: 5 }] }));

it('transforms translate(number, number) to translateX and translateY', () => runTest(`
  transform: translate(2, 3);
`, { transform: [{ translateY: 3 }, { translateX: 2 }] }));

it('transforms translate(number) to translateX and translateY', () => runTest(`
  transform: translate(5);
`, { transform: [{ translateY: 0 }, { translateX: 5 }] }));

it('transforms skew(angle, angle) to skewX and skewY', () => runTest(`
  transform: skew(2deg, 3deg);
`, { transform: [{ skewY: '3deg' }, { skewX: '2deg' }] }));

it('transforms skew(angle) to skewX and skewY', () => runTest(`
  transform: skew(5deg);
`, { transform: [{ skewY: '0deg' }, { skewX: '5deg' }] }));

it('transforms border shorthand', () => runTest(`
  border: 2 dashed #f00;
`, { borderWidth: 2, borderColor: '#f00', borderStyle: 'dashed' }));

it('transforms border shorthand missing color', () => runTest(`
  border: 2 dashed;
`, { borderWidth: 2, borderColor: 'black', borderStyle: 'dashed' }));

it('transforms border shorthand missing style', () => runTest(`
  border: 2 #f00;
`, { borderWidth: 2, borderColor: '#f00', borderStyle: 'solid' }));

it('transforms border shorthand missing width', () => runTest(`
  border: #f00 dashed;
`, { borderWidth: 1, borderColor: '#f00', borderStyle: 'dashed' }));

it('transforms margin shorthands using 4 values', () => runTest(`
  margin: 1 2 3 4;
`, { marginTop: 1, marginRight: 2, marginBottom: 3, marginLeft: 4 }));

it('transforms margin shorthands using 3 values', () => runTest(`
  margin: 1 2 3;
`, { marginTop: 1, marginRight: 2, marginBottom: 3, marginLeft: 2 }));

it('transforms margin shorthands using 2 values', () => runTest(`
  margin: 1 2;
`, { marginTop: 1, marginRight: 2, marginBottom: 1, marginLeft: 2 }));

it('transforms margin shorthands using 1 value', () => runTest(`
  margin: 1;
`, { marginTop: 1, marginRight: 1, marginBottom: 1, marginLeft: 1 }));

it('shorthand with 1 value should override previous values', () => runTest(`
  margin-top: 2;
  margin: 1;
`, { marginTop: 1, marginRight: 1, marginBottom: 1, marginLeft: 1 }));
