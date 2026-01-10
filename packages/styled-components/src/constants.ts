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
 * Detect if we're running in a React Server Component environment.
 * RSC environments lack createContext, making this a reliable indicator.
 */
export const IS_RSC = typeof React.createContext === 'undefined';

export const DISABLE_SPEEDY = Boolean(
  typeof SC_DISABLE_SPEEDY === 'boolean'
    ? SC_DISABLE_SPEEDY
    : typeof process !== 'undefined' &&
        typeof process.env !== 'undefined' &&
        typeof process.env.REACT_APP_SC_DISABLE_SPEEDY !== 'undefined' &&
        process.env.REACT_APP_SC_DISABLE_SPEEDY !== ''
      ? process.env.REACT_APP_SC_DISABLE_SPEEDY === 'false'
        ? false
        : process.env.REACT_APP_SC_DISABLE_SPEEDY
      : typeof process !== 'undefined' &&
          typeof process.env !== 'undefined' &&
          typeof process.env.SC_DISABLE_SPEEDY !== 'undefined' &&
          process.env.SC_DISABLE_SPEEDY !== ''
        ? process.env.SC_DISABLE_SPEEDY === 'false'
          ? false
          : process.env.SC_DISABLE_SPEEDY
        : process.env.NODE_ENV !== 'production'
);

// Shared empty execution context when generating static styles
export const STATIC_EXECUTION_CONTEXT = {};
