@{%
  const at = index => d => d[index];
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

  const combineAnyOrder = d => [].concat(d[0], d[2]).map(at(0));

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

number -> ([0-9]:+) {% d => Number(text(d)) %}

angle -> number ("deg" | "rad") {% text %}

ident -> ("-":? [_A-Za-z] [_A-Za-z0-9-]:*) {% text %}
# ident -> [^ ]:+ {% text %}

color
  -> "#" ([a-fA-F0-9]:*) {% text %}
   | ("rgb" | "hsl" | "hsv") ("a":?) "(" ([^)]:+) ")" {% text %}

_ -> [ \t\n\r]:* {% () => null %}
__ -> [ \t\n\r]:+ {% () => null %}

anyOrder2[a, b]
  -> $a __ $b {% d => [d[0][0][0], d[2][0][0]] %}
   | $b __ $a {% d => [d[2][0][0], d[0][0][0]] %}

anyOrder3[a, b, c]
  -> $a __ anyOrder2[$b, $c] {% combineAnyOrder %}
   | $b __ anyOrder2[$a, $c] {% combineAnyOrder %}
   | $c __ anyOrder2[$a, $b] {% combineAnyOrder %}

anyOrderOptional3[a, b, c]
  -> anyOrder3[$a, $b, $c] {% at(0) %}
   | anyOrder2[$a, $b] {% d => [d[0][0], d[0][1], null] %}
   | anyOrder2[$a, $c] {% d => [d[0][0], null, d[0][1]] %}
   | anyOrder2[$b, $c] {% d => [null, d[0][0], d[0][1]] %}
   | $a {% d => [d[0], null, null] %}
   | $b {% d => [null, d[0], null] %}
   | $c {% d => [null, null, d[0]] %}

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

fontVariant
  -> ident (__ ident):* {% combineHeadTail %}

fontWeight
  -> .:+ {% text %}

border
  -> anyOrderOptional3[number, ident, color] {% d => ({ $merge: {
       borderWidth: defaultOptional(d[0][0], 1),
       borderStyle: defaultOptional(d[0][1], 'solid'),
       borderColor: defaultOptional(d[0][2], 'black'),
     } }) %}

margin
  -> number (_ number):* {% combineClockwiseShorthand('margin') %}

padding
  -> number (_ number):* {% combineClockwiseShorthand('padding') %}

borderWidth
  -> number (_ number):* {% combineClockwiseShorthand('border', undefined, 'Width') %}

borderColor
  -> color (_ color):* {% combineClockwiseShorthand('border', undefined, 'Color') %}

borderRadius
  -> number (_ number):* {%
       combineClockwiseShorthand('border', ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'], 'Radius')
     %}
