'use strict';

/* global jest it, expect */
var transformCss = require('.');

var runTest = function runTest(inputCss, expectedStyles) {
  var actualStyles = transformCss(inputCss);
  expect(actualStyles).toEqual(expectedStyles);
};

it('transforms numbers', function () {
  return runTest('\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n', { top: 0, left: 0, right: 0, bottom: 0 });
});

it('allows decimal values', function () {
  return runTest('\n  top: 1.5;\n', { top: 1.5 });
});

it('transforms strings', function () {
  return runTest('\n  color: red;\n', { color: 'red' });
});

it('transforms hex colors', function () {
  return runTest('\n  color: #f00;\n', { color: '#f00' });
});

it('transforms rgb colors', function () {
  return runTest('\n  color: rgb(255, 0, 0);\n', { color: 'rgb(255, 0, 0)' });
});

it('converts to camel-case', function () {
  return runTest('\n  background-color: red;\n', { backgroundColor: 'red' });
});

it('transforms background to backgroundColor', function () {
  return runTest('\n  background: #f00;\n', { backgroundColor: '#f00' });
});

it('transforms background to backgroundColor with rgb', function () {
  return runTest('\n  background: rgb(255, 0, 0);\n', { backgroundColor: 'rgb(255, 0, 0)' });
});

it('transforms background to backgroundColor with named colour', function () {
  return runTest('\n  background: red;\n', { backgroundColor: 'red' });
});

it('transforms font weights as strings', function () {
  return runTest('\n  font-weight: 400;\n', { fontWeight: '400' });
});

it('transforms font variant as an array', function () {
  return runTest('\n  font-variant: tabular-nums;\n', { fontVariant: ['tabular-nums'] });
});

it('transforms shadow offsets', function () {
  return runTest('\n  shadow-offset: 10 5;\n', { shadowOffset: { width: 10, height: 5 } });
});

it('transforms text shadow offsets', function () {
  return runTest('\n  text-shadow-offset: 10 5;\n', { textShadowOffset: { width: 10, height: 5 } });
});

it('transforms a single transform value with number', function () {
  return runTest('\n  transform: scaleX(5);\n', { transform: [{ scaleX: 5 }] });
});

it('transforms a single transform value with string', function () {
  return runTest('\n  transform: rotate(5deg);\n', { transform: [{ rotate: '5deg' }] });
});

it('transforms multiple transform values', function () {
  return runTest('\n  transform: scaleX(5) skewX(1deg);\n', { transform: [{ skewX: '1deg' }, { scaleX: 5 }] });
});

it('transforms scale(number, number) to scaleX and scaleY', function () {
  return runTest('\n  transform: scale(2, 3);\n', { transform: [{ scaleY: 3 }, { scaleX: 2 }] });
});

it('transforms scale(number) to scale', function () {
  return runTest('\n  transform: scale(5);\n', { transform: [{ scale: 5 }] });
});

it('transforms translate(number, number) to translateX and translateY', function () {
  return runTest('\n  transform: translate(2, 3);\n', { transform: [{ translateY: 3 }, { translateX: 2 }] });
});

it('transforms translate(number) to translateX and translateY', function () {
  return runTest('\n  transform: translate(5);\n', { transform: [{ translateY: 0 }, { translateX: 5 }] });
});

it('transforms skew(angle, angle) to skewX and skewY', function () {
  return runTest('\n  transform: skew(2deg, 3deg);\n', { transform: [{ skewY: '3deg' }, { skewX: '2deg' }] });
});

it('transforms skew(angle) to skewX and skewY', function () {
  return runTest('\n  transform: skew(5deg);\n', { transform: [{ skewY: '0deg' }, { skewX: '5deg' }] });
});

it('transforms border shorthand', function () {
  return runTest('\n  border: 2 dashed #f00;\n', { borderWidth: 2, borderColor: '#f00', borderStyle: 'dashed' });
});

it('transforms border shorthand in other order', function () {
  return runTest('\n  border: #f00 2 dashed;\n', { borderWidth: 2, borderColor: '#f00', borderStyle: 'dashed' });
});

it('transforms border shorthand missing color', function () {
  return runTest('\n  border: 2 dashed;\n', { borderWidth: 2, borderColor: 'black', borderStyle: 'dashed' });
});

it('transforms border shorthand missing style', function () {
  return runTest('\n  border: 2 #f00;\n', { borderWidth: 2, borderColor: '#f00', borderStyle: 'solid' });
});

it('transforms border shorthand missing width', function () {
  return runTest('\n  border: #f00 dashed;\n', { borderWidth: 1, borderColor: '#f00', borderStyle: 'dashed' });
});

it('transforms border shorthand missing color & width', function () {
  return runTest('\n  border: dashed;\n', { borderWidth: 1, borderColor: 'black', borderStyle: 'dashed' });
});

it('transforms border shorthand missing style & width', function () {
  return runTest('\n  border: #f00;\n', { borderWidth: 1, borderColor: '#f00', borderStyle: 'solid' });
});

it('transforms border shorthand missing color & style', function () {
  return runTest('\n  border: 2;\n', { borderWidth: 2, borderColor: 'black', borderStyle: 'solid' });
});

it('transforms margin shorthands using 4 values', function () {
  return runTest('\n  margin: 1 2 3 4;\n', { marginTop: 1, marginRight: 2, marginBottom: 3, marginLeft: 4 });
});

it('transforms margin shorthands using 3 values', function () {
  return runTest('\n  margin: 1 2 3;\n', { marginTop: 1, marginRight: 2, marginBottom: 3, marginLeft: 2 });
});

it('transforms margin shorthands using 2 values', function () {
  return runTest('\n  margin: 1 2;\n', { marginTop: 1, marginRight: 2, marginBottom: 1, marginLeft: 2 });
});

it('transforms margin shorthands using 1 value', function () {
  return runTest('\n  margin: 1;\n', { marginTop: 1, marginRight: 1, marginBottom: 1, marginLeft: 1 });
});

it('shorthand with 1 value should override previous values', function () {
  return runTest('\n  margin-top: 2;\n  margin: 1;\n', { marginTop: 1, marginRight: 1, marginBottom: 1, marginLeft: 1 });
});

it('transforms flex shorthand with 3 values', function () {
  return runTest('\n  flex: 1 2 3;\n', { flexGrow: 1, flexShrink: 2, flexBasis: 3 });
});

it('transforms flex shorthand with 2 values', function () {
  return runTest('\n  flex: 1 2;\n', { flexGrow: 1, flexShrink: 2, flexBasis: 0 });
});

it('transforms flex shorthand with 1 values', function () {
  return runTest('\n  flex: 1;\n', { flexGrow: 1, flexShrink: 1, flexBasis: 0 });
});

it('transforms flexFlow shorthand with two values', function () {
  return runTest('\n  flex-flow: column wrap;\n', { flexDirection: 'column', flexWrap: 'wrap' });
});

it('transforms flexFlow shorthand missing flexDirection', function () {
  return runTest('\n  flex-flow: wrap;\n', { flexDirection: 'row', flexWrap: 'wrap' });
});

it('transforms flexFlow shorthand missing flexWrap', function () {
  return runTest('\n  flex-flow: column;\n', { flexDirection: 'column', flexWrap: 'nowrap' });
});

it('transforms font', function () {
  return runTest('\n  font: bold italic small-caps 16/18 "Helvetica";\n', {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontVariant: ['small-caps'],
    lineHeight: 18
  });
});

it('transforms font missing font-variant', function () {
  return runTest('\n  font: bold italic 16/18 "Helvetica";\n', {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontVariant: [],
    lineHeight: 18
  });
});

it('transforms font missing font-style', function () {
  return runTest('\n  font: bold small-caps 16/18 "Helvetica";\n', {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'normal',
    fontVariant: ['small-caps'],
    lineHeight: 18
  });
});

it('transforms font missing font-weight', function () {
  return runTest('\n  font: italic small-caps 16/18 "Helvetica";\n', {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'italic',
    fontVariant: ['small-caps'],
    lineHeight: 18
  });
});

it('transforms font with font-weight normal', function () {
  return runTest('\n  font: normal 16/18 "Helvetica";\n', {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontVariant: [],
    lineHeight: 18
  });
});

it('transforms font with font-weight and font-style normal', function () {
  return runTest('\n  font: normal normal 16/18 "Helvetica";\n', {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontVariant: [],
    lineHeight: 18
  });
});

it('transforms font with no font-weight, font-style, and font-variant', function () {
  return runTest('\n  font: 16/18 "Helvetica";\n', {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontVariant: [],
    lineHeight: 18
  });
});

it('omits line height if not specified', function () {
  return runTest('\n  font: 16 "Helvetica";\n', {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontVariant: []
  });
});