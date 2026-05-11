declare let __VERSION__: string;

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

export const KEYFRAMES_ID_PREFIX = 'sc-keyframes-';

// Shared empty execution context when generating static styles
export const STATIC_EXECUTION_CONTEXT = {};
