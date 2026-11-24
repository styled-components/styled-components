/**
 * CSS properties that accept unitless numeric values.
 * Inlined from @emotion/unitless with IE-only entries removed
 * (boxFlex, boxFlexGroup, boxOrdinalGroup, flexPositive, flexNegative,
 * flexOrder, msGridRow, msGridRowSpan, msGridColumn, msGridColumnSpan),
 * plus fontSizeAdjust, hyphenateLimitChars, initialLetter, mathDepth,
 * shapeImageThreshold, and the maskBorder* aliases of the borderImage* entries.
 */
const unitless = new Set(
  'WebkitLineClamp animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth columnCount columns fillOpacity flex flexGrow flexShrink floodOpacity fontSizeAdjust fontWeight gridColumn gridColumnEnd gridColumnSpan gridColumnStart gridRow gridRowEnd gridRowSpan gridRowStart hyphenateLimitChars initialLetter lineHeight maskBorderOutset maskBorderSlice maskBorderWidth mathDepth opacity order orphans scale shapeImageThreshold stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth tabSize widows zIndex zoom'.split(
    ' '
  )
);

// Taken from https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/shared/dangerousStyleValue.js
export default function addUnitIfNeeded(name: string, value: any) {
  // https://github.com/amilajack/eslint-plugin-flowtype-errors/issues/133
  if (value == null || typeof value === 'boolean' || value === '') {
    return '';
  }

  if (typeof value === 'number' && value !== 0 && !unitless.has(name) && !name.startsWith('--')) {
    return value + 'px'; // Presumes implicit 'px' suffix for unitless numbers except for CSS variables
  }

  return String(value).trim();
}
