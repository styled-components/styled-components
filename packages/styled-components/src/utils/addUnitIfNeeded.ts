/**
 * CSS properties that accept unitless numeric values.
 * Inlined from @emotion/unitless with IE-only entries removed
 * (boxFlex, boxFlexGroup, boxOrdinalGroup, flexPositive, flexNegative,
 * flexOrder, msGridRow, msGridRowSpan, msGridColumn, msGridColumnSpan),
 * plus gridArea and lineClamp, which React's inline styles also leave unitless.
 */
const unitless = new Set(
  'animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth columnCount columns flex flexGrow flexShrink gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom WebkitLineClamp fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth'.split(
    ' '
  )
);

// Taken from https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/shared/dangerousStyleValue.js
export default function addUnitIfNeeded(name: string, value: unknown) {
  // https://github.com/amilajack/eslint-plugin-flowtype-errors/issues/133
  if (value == null || typeof value === 'boolean' || value === '') {
    return '';
  }

  if (typeof value === 'number' && value !== 0 && !unitless.has(name) && !name.startsWith('--')) {
    return value + 'px'; // Presumes implicit 'px' suffix for unitless numbers except for CSS variables
  }

  return String(value).trim();
}
