// @flow
/* eslint-disable camelcase */

declare var __VERSION__: string;
declare var __webpack_nonce__: string;
declare var SC_DISABLE_SPEEDY: ?boolean;

let SC_ATTR = 'data-styled';
if (typeof process !== 'undefined' && process.env.SC_ATTR) {
  SC_ATTR = process.env.SC_ATTR;
}

let SC_VERSION = '';
if (typeof __VERSION__ !== 'undefined') {
  SC_VERSION = __VERSION__;
}

let NONCE = '';
if (typeof __webpack_nonce__ !== 'undefined') {
  NONCE = __webpack_nonce__;
}

// This is used to indicate the version of styled-sheet / styled-components
// so that only this version's style tags are rehydrated
const SC_ATTR_VERSION = `${SC_ATTR}-version`;

// This is used to indicate which tags were created during runtime
// When rehydrating these tags are then not touched
const SC_ACTIVE = 'active';

const IS_BROWSER = typeof window !== 'undefined' && 'HTMLElement' in window;

const DISABLE_SPEEDY =
  (typeof SC_DISABLE_SPEEDY === 'boolean' && SC_DISABLE_SPEEDY) ||
  process.env.NODE_ENV !== 'production';

export {
  SC_ATTR,
  SC_ATTR_VERSION,
  SC_VERSION,
  SC_ACTIVE,
  NONCE,
  IS_BROWSER,
  DISABLE_SPEEDY
};
