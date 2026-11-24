/**
 * CSS properties that accept unitless numeric values.
 * Inlined from @emotion/unitless with IE-only entries removed
 * (boxFlex, boxFlexGroup, boxOrdinalGroup, flexPositive, flexNegative,
 * flexOrder, msGridRow, msGridRowSpan, msGridColumn, msGridColumnSpan),
 * plus fontSizeAdjust, hyphenateLimitChars, initialLetter, mathDepth,
 * shapeImageThreshold, and the maskBorder* aliases of the borderImage* entries.
 */
const unitless: Record<string, 1> = {
  animationIterationCount: 1,
  aspectRatio: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexShrink: 1,
  fontSizeAdjust: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  fontWeight: 1,
  hyphenateLimitChars: 1,
  initialLetter: 1,
  lineHeight: 1,
  maskBorderOutset: 1,
  maskBorderSlice: 1,
  maskBorderWidth: 1,
  mathDepth: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  scale: 1,
  shapeImageThreshold: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1,
};

// Taken from https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/shared/dangerousStyleValue.js
export default function addUnitIfNeeded(name: string, value: any) {
  // https://github.com/amilajack/eslint-plugin-flowtype-errors/issues/133
  if (value == null || typeof value === 'boolean' || value === '') {
    return '';
  }

  if (typeof value === 'number' && value !== 0 && !(name in unitless) && !name.startsWith('--')) {
    return value + 'px'; // Presumes implicit 'px' suffix for unitless numbers except for CSS variables
  }

  return String(value).trim();
}
