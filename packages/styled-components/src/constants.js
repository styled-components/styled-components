// @flow

declare var SC_DISABLE_SPEEDY: ?boolean;
declare var __VERSION__: string;

export const SC_ATTR =
  (typeof process !== 'undefined' && (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR)) ||
  'data-styled';

export const SC_ATTR_ACTIVE = 'active';
export const SC_ATTR_VERSION = 'data-styled-version';
export const SC_VERSION = __VERSION__;

export const IS_BROWSER = typeof window !== 'undefined' && 'HTMLElement' in window;

function isSpeedyDisabled() {
  if (typeof SC_DISABLE_SPEEDY === 'boolean') {
    return SC_DISABLE_SPEEDY;
  }
  if (typeof process !== 'undefined') {
    if (process.env.REACT_APP_SC_DISABLE_SPEEDY) {
      return process.env.REACT_APP_SC_DISABLE_SPEEDY.toLowerCase() === 'true';
    }
    if (process.env.SC_DISABLE_SPEEDY) {
      return process.env.SC_DISABLE_SPEEDY.toLowerCase() === 'true';
    }

    return process.env.NODE_ENV !== 'production';
  }

  return false;
}

export const DISABLE_SPEEDY = isSpeedyDisabled();

// Shared empty execution context when generating static styles
export const STATIC_EXECUTION_CONTEXT = {};
