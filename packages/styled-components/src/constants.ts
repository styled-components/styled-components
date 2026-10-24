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

/**
 * A development warning fires once a single styled component or global style
 * emits this many `<style>` tags in one server render. Set well above any
 * hand-written page, so only generated lists reach it.
 */
export const RSC_REDUNDANT_EMIT_WARN_THRESHOLD = 1000;

// Shared empty execution context when generating static styles
export const STATIC_EXECUTION_CONTEXT = {};
