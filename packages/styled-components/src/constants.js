// @flow

declare var SC_DISABLE_SPEEDY: ?boolean;
declare var __VERSION__: string;

export const SC_ATTR =
  (typeof process !== 'undefined' && (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR)) ||
  'data-styled';

// Allowing user to add class prefix to all generated class names to avoid class name collision.
// This is very handy when it comes to situation where different styled-components might co-exist
// in different JS bundles.
export const SC_CLASS_PREFIX =
  (typeof process !== 'undefined' && process.env.SC_CLASS_PREFIX) || '';

export const SC_ATTR_ACTIVE = 'active';
export const SC_ATTR_VERSION = 'data-styled-version';
export const SC_VERSION = __VERSION__;
export const SPLITTER = '/*!sc*/\n';

export const IS_BROWSER = typeof window !== 'undefined' && 'HTMLElement' in window;

export const DISABLE_SPEEDY =
  (typeof SC_DISABLE_SPEEDY === 'boolean' && SC_DISABLE_SPEEDY) ||
  (typeof process !== 'undefined' &&
    (process.env.REACT_APP_SC_DISABLE_SPEEDY || process.env.SC_DISABLE_SPEEDY)) ||
  process.env.NODE_ENV !== 'production';

// Shared empty execution context when generating static styles
export const STATIC_EXECUTION_CONTEXT = {};
