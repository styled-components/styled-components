@{%
  const cssColorList = require('css-color-list')();

  const at = index => d => d && d[index];
  const pick = indices => d => indices.map(index => d[index]);
  const text = d => Array.isArray(d) ? d.map(text).join('') : d;
  const transformArg1 = d => ({ [d[0].join('')]: d[2][0] });
  const defaultOptional = (value, defaultValue) => value === null ? defaultValue : value;

  const combineHeadTail = ([head, tail]) => {
    const tailValues = tail.reduce((accum, value) => (
      accum.concat(value[1])
    ), []);
    return [].concat(head, tailValues);
  };

  const combineAnyOrder = index => d => {
    const array = d[2].slice();
    array.splice(index, 0, d[0][0]);
    return array;
  }

  const combineClockwiseShorthand = (
    prefix,
    keys = ['Top', 'Right', 'Bottom', 'Left'],
    suffix = ''
  ) => (d, location, reject) => {
    const values = combineHeadTail(d);

    if (values.length > 4) return reject;

    const [top, right = top, bottom = top, left = right] = values;
    return { $merge: {
      [prefix + keys[0] + suffix]: top,
      [prefix + keys[1] + suffix]: right,
      [prefix + keys[2] + suffix]: bottom,
      [prefix + keys[3] + suffix]: left,
    } };
  }

  const transformArg1XY = yValue => d => {
    const fn = d[0];
    return [{ [`${fn}X`]: d[2][0] }, { [`${fn}Y`]: yValue }];
  };
  const transformArg2 = d => {
    const fn = d[0];
    const [arg1, arg2] = d[2];
    return [{ [`${fn}X`]: arg1[0] }, { [`${fn}Y`]: arg2[0] }];
  };
%}

int
  -> "0" | [1-9] [0-9]:*

decimal
  -> "." [0-9]:+

number
  -> "-":? (int decimal | int | decimal) {% d => Number(text(d)) %}

angle -> number ("deg" | "rad") {% text %}

ident -> ("-":? [_A-Za-z] [_A-Za-z0-9-]:*) {% text %}
# ident -> [^ ]:+ {% text %}

color
  -> "#" ([a-fA-F0-9]:*) {% text %}
   | ("rgb" | "hsl" | "hsv") ("a":?) "(" ([^)]:+) ")" {% text %}
   | ([A-Za-z]:+) {% (d, location, reject) => {
       const name = text(d).toLowerCase();
       return cssColorList.indexOf(name) !== -1 ? name : reject;
     } %}

_ -> [ \t\n\r]:* {% () => null %}
__ -> [ \t\n\r]:+ {% () => null %}

anyOrder2[a, b]
  -> $a __ $b {% d => [d[0][0][0], d[2][0][0]] %}
   | $b __ $a {% d => [d[2][0][0], d[0][0][0]] %}

anyOrder3[a, b, c]
  -> $a __ anyOrder2[$b, $c] {% combineAnyOrder(0) %}
   | $b __ anyOrder2[$a, $c] {% combineAnyOrder(1) %}
   | $c __ anyOrder2[$a, $b] {% combineAnyOrder(2) %}

anyOrderOptional2[a, b]
  -> anyOrder2[$a, $b] {% at(0) %}
   | $a {% d => [d[0][0], null] %}
   | $b {% d => [null, d[0][0]] %}

anyOrderOptional3[a, b, c]
  -> anyOrder3[$a, $b, $c] {% d => d[0].map(at(0)) %}
   | anyOrder2[$a, $b] {% d => [d[0][0], d[0][1], null] %}
   | anyOrder2[$a, $c] {% d => [d[0][0], null, d[0][1]] %}
   | anyOrder2[$b, $c] {% d => [null, d[0][0], d[0][1]] %}
   | $a {% d => [d[0][0], null, null] %}
   | $b {% d => [null, d[0][0], null] %}
   | $c {% d => [null, null, d[0][0]] %}

anyOrderOptional3AllowNull[a, b, c]
  -> anyOrderOptional3[$a, $b, $c]:? {% d => (d[0] ? d[0].map(at(0)) : [null, null, null]) %}

transformArg1[t] -> "(" _ $t _ ")" {% at(2) %}
transformArg2[t] -> "(" _ $t _ "," _ $t _ ")" {% pick([2, 6]) %}

transformPart
  -> ("perspective" | "scale" [XY]:? | "translate" [XY]) _ transformArg1[number] {% transformArg1 %}
   | ("rotate" [XYZ]:? | "skew" [XY]) _ transformArg1[angle] {% transformArg1 %}
   | ("translate") _ transformArg1[number] {% transformArg1XY(0) %}
   | ("skew") _ transformArg1[angle] {% transformArg1XY('0deg') %}
   | ("scale" | "translate") _ transformArg2[number] {% transformArg2 %}
   | ("skew") _ transformArg2[angle] {% transformArg2 %}

transform
  -> transformPart (_ transformPart):* {% d => combineHeadTail(d).reverse() %}

shadowOffset
  -> number __ number {% d => ({ width: d[0], height: d[2] }) %}

textShadowOffset
  -> shadowOffset {% at(0) %}

fontVariant
  -> ident (__ ident):* {% combineHeadTail %}

fontWeight
  -> .:+ {% text %}

background
  -> color {% d => ({ $merge: { backgroundColor: d[0] } }) %}

border
  -> anyOrderOptional3[number, ident, color] {% d => ({ $merge: {
       borderWidth: defaultOptional(d[0][0], 1),
       borderStyle: defaultOptional(d[0][1], 'solid'),
       borderColor: defaultOptional(d[0][2], 'black'),
     } }) %}

margin
  -> number (__ number):* {% combineClockwiseShorthand('margin') %}

padding
  -> number (__ number):* {% combineClockwiseShorthand('padding') %}

borderWidth
  -> number (__ number):* {% combineClockwiseShorthand('border', undefined, 'Width') %}

borderColor
  -> color (__ color):* {% combineClockwiseShorthand('border', undefined, 'Color') %}

borderRadius
  -> number (__ number):* {%
       combineClockwiseShorthand('border', ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'], 'Radius')
     %}

flexFlowFlexWrap -> ("nowrap" | "wrap" | "wrap-reverse") {% text %}
flexFlowFlexDirection -> ("row" | "row-reverse" | "column" | "column-reverse") {% text %}

flexFlow
  -> anyOrderOptional2[flexFlowFlexWrap, flexFlowFlexDirection] {% d => ({ $merge: {
       flexWrap: defaultOptional(d[0][0], 'nowrap'),
       flexDirection: defaultOptional(d[0][1], 'row'),
     } }) %}

flex
  -> number (__ number):* {% (d, location, reject) => {
       const values = combineHeadTail(d);
       if (values.length > 3) return reject;
       const [flexGrow, flexShrink = 1, flexBasis = 0] = values;
       return { $merge: { flexGrow, flexShrink, flexBasis } };
     } %}

fontFontStyle -> ("normal" | "italic") {% text %}
fontFontVariantCss21 -> "normal" {% () => [] %} | "small-caps" {% () => ['small-caps'] %}
fontFontWeight -> ("normal" | "bold" | [1-9] "00") {% text %}
fontFontFamily
  -> "\"" ("\\" . | [^"]):* "\"" {% d => text(d[1]) %}
   | "'" ("\\" . | [^']):* "'" {% d => text(d[1]) %}

font
  -> anyOrderOptional3AllowNull[fontFontStyle, fontFontVariantCss21, fontFontWeight] _
     number (_ "/" _ number):? __
     fontFontFamily {% d => {
       const options = {
        fontStyle: defaultOptional(d[0][0], 'normal'),
        fontVariant: defaultOptional(d[0][1], []),
        fontWeight: defaultOptional(d[0][2], 'normal'),
        fontSize: d[2],
        fontFamily: d[5]
       };
       // In CSS, line-height defaults to normal, but we can't set it to that
       const lineHeight = d[3] && d[3][3];
       if (lineHeight) options.lineHeight = lineHeight;

       return { $merge: options };
     } %}
