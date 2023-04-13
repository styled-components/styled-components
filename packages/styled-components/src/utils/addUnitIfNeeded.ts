import unitless from '@emotion/unitless';

// Taken from https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/shared/dangerousStyleValue.js
export default function addUnitIfNeeded(name: string, value: any) {
  // https://github.com/amilajack/eslint-plugin-flowtype-errors/issues/133
  if (value == null || typeof value === 'boolean' || value === '') {
    return '';
  }

  if (typeof value === 'number' && value !== 0 && !(name in unitless) && !name.startsWith('--')) {
    return `${value}px`; // Presumes implicit 'px' suffix for unitless numbers except for CSS variables
  }

  return String(value).trim();
}
