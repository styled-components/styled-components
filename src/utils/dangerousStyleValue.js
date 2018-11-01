// @flow
import unitless from '@emotion/unitless';

// Taken from https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/shared/dangerousStyleValue.js
export default function dangerousStyleValue(name: string, value: any): any {
  // https://github.com/amilajack/eslint-plugin-flowtype-errors/issues/133
  // $FlowFixMe
  if (typeof value === 'symbol') {
    return value;
  }

  const isEmpty = value == null || typeof value === 'boolean' || value === '';
  if (isEmpty) {
    return '';
  }

  if (
    typeof value === 'number' &&
    value !== 0 &&
    !(unitless.hasOwnProperty(name) && unitless[name] === 1)
  ) {
    return `${value}px`; // Presumes implicit 'px' suffix for unitless numbers
  }

  return String(value).trim();
}
