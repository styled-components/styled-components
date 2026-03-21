declare let SC_DISABLE_SPEEDY: boolean | null | undefined;
declare let __VERSION__: string;

import React from 'react';

export const SC_ATTR: string =
  (typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR)) ||
  'data-styled';

export const SC_ATTR_ACTIVE = 'active';
export const SC_ATTR_VERSION = 'data-styled-version';
export const SC_VERSION = __VERSION__;
export const SPLITTER = '/*!sc*/\n';

export const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * True when running in a React Server Component environment (createContext
 * is unavailable). In browser / standalone / native builds the entire
 * expression is replaced with the literal `false` via rollup-plugin-replace
 * with empty delimiters (exact string match), enabling rollup constant
 * inlining and terser dead-code elimination for all RSC branches.
 */
export const IS_RSC: boolean = typeof React.createContext === 'undefined';

function readSpeedyFlag(name: string): boolean | undefined {
  if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
    const val = process.env[name];
    if (val !== undefined && val !== '') {
      return val !== 'false';
    }
  }
  return undefined;
}

export const DISABLE_SPEEDY = Boolean(
  typeof SC_DISABLE_SPEEDY === 'boolean'
    ? SC_DISABLE_SPEEDY
    : (readSpeedyFlag('REACT_APP_SC_DISABLE_SPEEDY') ??
        readSpeedyFlag('SC_DISABLE_SPEEDY') ??
        process.env.NODE_ENV !== 'production')
);

export const KEYFRAMES_ID_PREFIX = 'sc-keyframes-';

// Shared empty execution context when generating static styles
export const STATIC_EXECUTION_CONTEXT = {};
