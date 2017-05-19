/* global jest it, expect */
import transformCss, { getStylesForProperty } from '.';

const runTest = (inputCss, expectedStyles) => {
  const actualStyles = transformCss(inputCss);
  expect(actualStyles).toEqual(expectedStyles);
};

it('transforms numbers', () => runTest([
  ['top', '0'],
  ['left', '0'],
  ['right', '0'],
  ['bottom', '0'],
], { top: 0, left: 0, right: 0, bottom: 0 }));

it('allows pixels in unspecialized transform', () => runTest([
  ['top', '0px'],
], { top: 0 }));

it('allows boolean values values', () => runTest([
  ['boolTrue1', 'true'],
  ['boolTrue2', 'TRUE'],
  ['boolFalse1', 'false'],
  ['boolFalse2', 'FALSE'],
], {
  boolTrue1: true,
  boolTrue2: true,
  boolFalse1: false,
  boolFalse2: false,
}));

it('allows percent in unspecialized transform', () => runTest([
  ['top', '0%'],
], { top: '0%' }));

it('allows decimal values', () => {
  expect(getStylesForProperty('margin', '0.5px').marginTop).toBe(0.5);
  expect(getStylesForProperty('margin', '1.5px').marginTop).toBe(1.5);
  expect(getStylesForProperty('margin', '10.5px').marginTop).toBe(10.5);
  expect(getStylesForProperty('margin', '100.5px').marginTop).toBe(100.5);
  expect(getStylesForProperty('margin', '-0.5px').marginTop).toBe(-0.5);
  expect(getStylesForProperty('margin', '-1.5px').marginTop).toBe(-1.5);
  expect(getStylesForProperty('margin', '-10.5px').marginTop).toBe(-10.5);
  expect(getStylesForProperty('margin', '-100.5px').marginTop).toBe(-100.5);
  expect(getStylesForProperty('margin', '.5px').marginTop).toBe(0.5);
  expect(getStylesForProperty('margin', '-.5px').marginTop).toBe(-0.5);
});

it('allows decimal values in transformed values', () => runTest([
  ['border-radius', '1.5px'],
], {
  borderTopLeftRadius: 1.5,
  borderTopRightRadius: 1.5,
  borderBottomRightRadius: 1.5,
  borderBottomLeftRadius: 1.5,
}));

it('allows negative values in transformed values', () => runTest([
  ['border-radius', '-1.5px'],
], {
  borderTopLeftRadius: -1.5,
  borderTopRightRadius: -1.5,
  borderBottomRightRadius: -1.5,
  borderBottomLeftRadius: -1.5,
}));

it('allows percent values in transformed values', () => runTest([
  ['margin', '10%'],
], {
  marginTop: '10%',
  marginRight: '10%',
  marginBottom: '10%',
  marginLeft: '10%',
}));

it('allows color values in transformed border-color values', () => runTest([
  ['border-color', 'red'],
], {
  borderTopColor: 'red',
  borderRightColor: 'red',
  borderBottomColor: 'red',
  borderLeftColor: 'red',
}));

it('allows omitting units for 0', () => runTest([
  ['margin', '10px 0'],
], {
  marginTop: 10,
  marginRight: 0,
  marginBottom: 10,
  marginLeft: 0,
}));

it('transforms strings', () => runTest([
  ['color', 'red'],
], { color: 'red' }));

it('transforms hex colors', () => runTest([
  ['color', '#f00'],
], { color: '#f00' }));

it('transforms rgb colors', () => runTest([
  ['color', 'rgb(255, 0, 0)'],
], { color: 'rgb(255, 0, 0)' }));

it('converts to camel-case', () => runTest([
  ['background-color', 'red'],
], { backgroundColor: 'red' }));

it('transforms background to backgroundColor', () => runTest([
  ['background', '#f00'],
], { backgroundColor: '#f00' }));

it('transforms background to backgroundColor with rgb', () => runTest([
  ['background', 'rgb(255, 0, 0)'],
], { backgroundColor: 'rgb(255, 0, 0)' }));

it('transforms background to backgroundColor with named colour', () => runTest([
  ['background', 'red'],
], { backgroundColor: 'red' }));

it('transforms font weights as strings', () => runTest([
  ['font-weight', ' 400'],
], { fontWeight: '400' }));

it('transforms font variant as an array', () => runTest([
  ['font-variant', 'tabular-nums'],
], { fontVariant: ['tabular-nums'] }));

it('transforms shadow offsets', () => runTest([
  ['shadow-offset', '10px 5px'],
], { shadowOffset: { width: 10, height: 5 } }));

it('transforms text shadow offsets', () => runTest([
  ['text-shadow-offset', '10px 5px'],
], { textShadowOffset: { width: 10, height: 5 } }));

it('transforms a single transform value with number', () => runTest([
  ['transform', 'scaleX(5)'],
], { transform: [{ scaleX: 5 }] }));

it('transforms a single transform value with string', () => runTest([
  ['transform', 'rotate(5deg)'],
], { transform: [{ rotate: '5deg' }] }));

it('transforms multiple transform values', () => runTest([
  ['transform', 'scaleX(5) skewX(1deg)'],
], { transform: [{ skewX: '1deg' }, { scaleX: 5 }] }));

it('transforms scale(number, number) to scaleX and scaleY', () => runTest([
  ['transform', 'scale(2, 3)'],
], { transform: [{ scaleY: 3 }, { scaleX: 2 }] }));

it('transforms scale(number) to scale', () => runTest([
  ['transform', 'scale(5)'],
], { transform: [{ scale: 5 }] }));

it('transforms translate(length, length) to translateX and translateY', () => runTest([
  ['transform', 'translate(2px, 3px)'],
], { transform: [{ translateY: 3 }, { translateX: 2 }] }));

it('transforms translate(length) to translateX and translateY', () => runTest([
  ['transform', 'translate(5px)'],
], { transform: [{ translateY: 0 }, { translateX: 5 }] }));

it('transforms skew(angle, angle) to skewX and skewY', () => runTest([
  ['transform', 'skew(2deg, 3deg)'],
], { transform: [{ skewY: '3deg' }, { skewX: '2deg' }] }));

it('transforms skew(angle) to skewX and skewY', () => runTest([
  ['transform', 'skew(5deg)'],
], { transform: [{ skewY: '0deg' }, { skewX: '5deg' }] }));

it('transforms border shorthand', () => runTest([
  ['border', '2px dashed #f00'],
], { borderWidth: 2, borderColor: '#f00', borderStyle: 'dashed' }));

it('transforms border shorthand in other order', () => runTest([
  ['border', '#f00 2px dashed'],
], { borderWidth: 2, borderColor: '#f00', borderStyle: 'dashed' }));

it('transforms border shorthand missing color', () => runTest([
  ['border', '2px dashed'],
], { borderWidth: 2, borderColor: 'black', borderStyle: 'dashed' }));

it('transforms border shorthand missing style', () => runTest([
  ['border', '2px #f00'],
], { borderWidth: 2, borderColor: '#f00', borderStyle: 'solid' }));

it('transforms border shorthand missing width', () => runTest([
  ['border', '#f00 dashed'],
], { borderWidth: 1, borderColor: '#f00', borderStyle: 'dashed' }));

it('transforms border shorthand missing color & width', () => runTest([
  ['border', 'dashed'],
], { borderWidth: 1, borderColor: 'black', borderStyle: 'dashed' }));

it('transforms border shorthand missing style & width', () => runTest([
  ['border', '#f00'],
], { borderWidth: 1, borderColor: '#f00', borderStyle: 'solid' }));

it('transforms border shorthand missing color & style', () => runTest([
  ['border', '2px'],
], { borderWidth: 2, borderColor: 'black', borderStyle: 'solid' }));

it('transforms margin shorthands using 4 values', () => runTest([
  ['margin', '10px 20px 30px 40px'],
], { marginTop: 10, marginRight: 20, marginBottom: 30, marginLeft: 40 }));

it('transforms margin shorthands using 3 values', () => runTest([
  ['margin', '10px 20px 30px'],
], { marginTop: 10, marginRight: 20, marginBottom: 30, marginLeft: 20 }));

it('transforms margin shorthands using 2 values', () => runTest([
  ['margin', '10px 20px'],
], { marginTop: 10, marginRight: 20, marginBottom: 10, marginLeft: 20 }));

it('transforms margin shorthands using 1 value', () => runTest([
  ['margin', '10px'],
], { marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 10 }));

it('shorthand with 1 value should override previous values', () => runTest([
  ['margin-top', '2px'],
  ['margin', '1px'],
], { marginTop: 1, marginRight: 1, marginBottom: 1, marginLeft: 1 }));

it('transforms flex shorthand with 3 values', () => runTest([
  ['flex', '1 2 3px'],
], { flexGrow: 1, flexShrink: 2, flexBasis: 3 }));

it('transforms flex shorthand with 3 values in reverse order', () => runTest([
  ['flex', '3px 1 2'],
], { flexGrow: 1, flexShrink: 2, flexBasis: 3 }));

it('transforms flex shorthand with 2 values of flex-grow and flex-shrink', () => runTest([
  ['flex', '1 2'],
], { flexGrow: 1, flexShrink: 2, flexBasis: 0 }));

it('transforms flex shorthand with 2 values of flex-grow and flex-basis', () => runTest([
  ['flex', '2 2px'],
], { flexGrow: 2, flexShrink: 1, flexBasis: 2 }));

it('transforms flex shorthand with 2 values of flex-grow and flex-basis (reversed)', () => runTest([
  ['flex', '2px 2'],
], { flexGrow: 2, flexShrink: 1, flexBasis: 2 }));

it('transforms flex shorthand with 1 value of flex-grow', () => runTest([
  ['flex', '2'],
], { flexGrow: 2, flexShrink: 1, flexBasis: 0 }));

it('transforms flex shorthand with 1 value of flex-basis', () => runTest([
  ['flex', '10px'],
], { flexGrow: 1, flexShrink: 1, flexBasis: 10 }));

/*
A unitless zero that is not already preceded by two flex factors must be interpreted as a flex
factor. To avoid misinterpretation or invalid declarations, authors must specify a zero
<‘flex-basis’> component with a unit or precede it by two flex factors.
*/
it('transforms flex shorthand with flex-grow/shrink taking priority over basis', () => runTest([
  ['flex', '0 1 0'],
], { flexGrow: 0, flexShrink: 1, flexBasis: 0 }));

it('transforms flexFlow shorthand with two values', () => runTest([
  ['flex-flow', 'column wrap'],
], { flexDirection: 'column', flexWrap: 'wrap' }));

it('transforms flexFlow shorthand missing flexDirection', () => runTest([
  ['flex-flow', 'wrap'],
], { flexDirection: 'row', flexWrap: 'wrap' }));

it('transforms flexFlow shorthand missing flexWrap', () => runTest([
  ['flex-flow', 'column'],
], { flexDirection: 'column', flexWrap: 'nowrap' }));

it('transforms font', () => runTest([
  ['font', 'bold italic small-caps 16px/18px "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'bold',
  fontStyle: 'italic',
  fontVariant: ['small-caps'],
  lineHeight: 18,
}));

it('transforms font missing font-variant', () => runTest([
  ['font', 'bold italic 16px/18px "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'bold',
  fontStyle: 'italic',
  fontVariant: [],
  lineHeight: 18,
}));

it('transforms font missing font-style', () => runTest([
  ['font', 'bold small-caps 16px/18px "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'bold',
  fontStyle: 'normal',
  fontVariant: ['small-caps'],
  lineHeight: 18,
}));

it('transforms font missing font-weight', () => runTest([
  ['font', 'italic small-caps 16px/18px "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'italic',
  fontVariant: ['small-caps'],
  lineHeight: 18,
}));

it('transforms font with font-weight normal', () => runTest([
  ['font', 'normal 16px/18px "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontVariant: [],
  lineHeight: 18,
}));

it('transforms font with font-weight and font-style normal', () => runTest([
  ['font', 'normal normal 16px/18px "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontVariant: [],
  lineHeight: 18,
}));

it('transforms font with no font-weight, font-style, and font-variant', () => runTest([
  ['font', '16px/18px "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontVariant: [],
  lineHeight: 18,
}));

it('omits line height if not specified', () => runTest([
  ['font', '16px "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontVariant: [],
}));

it('allows line height as multiple', () => runTest([
  ['font', '16px/1.5 "Helvetica"'],
], {
  fontFamily: 'Helvetica',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontVariant: [],
  lineHeight: 24,
}));

it('transforms font without quotes', () => runTest([
  ['font', 'bold italic small-caps 16px/18px Helvetica Neue'],
], {
  fontFamily: 'Helvetica Neue',
  fontSize: 16,
  fontWeight: 'bold',
  fontStyle: 'italic',
  fontVariant: ['small-caps'],
  lineHeight: 18,
}));

it('transforms font-family with double quotes', () => runTest([
  ['font-family', '"Helvetica Neue"'],
], {
  fontFamily: 'Helvetica Neue',
}));

it('transforms font-family with single quotes', () => runTest([
  ['font-family', '\'Helvetica Neue\''],
], {
  fontFamily: 'Helvetica Neue',
}));

it('transforms font-family without quotes', () => runTest([
  ['font-family', 'Helvetica Neue'],
], {
  fontFamily: 'Helvetica Neue',
}));

it('transforms font-family with quotes with otherwise invalid values', () => runTest([
  ['font-family', '"Goudy Bookletter 1911"'],
], {
  fontFamily: 'Goudy Bookletter 1911',
}));

it('transforms font-family with quotes with escaped values', () => runTest([
  ['font-family', '"test\\A test"'],
], {
  fontFamily: 'test\ntest',
}));

it('transforms font-family with quotes with escaped quote', () => runTest([
  ['font-family', '"test\\"test"'],
], {
  fontFamily: 'test"test',
}));

it('does not transform invalid unquoted font-family', () => {
  expect(() => transformCss([['font-family', 'Goudy Bookletter 1911']])).toThrow();
});

it('does not transform invalid flex', () => {
  expect(() => transformCss([['flex', '1 2px 3']])).toThrow();
});

it('allows blacklisting shorthands', () => {
  const actualStyles = transformCss([['border-radius', '50']], ['borderRadius']);
  expect(actualStyles).toEqual({ borderRadius: 50 });
});

it('throws useful errors', () => {
  expect(() => transformCss([['margin', '10']]))
    .toThrow('Failed to parse declaration "margin: 10"');
});
