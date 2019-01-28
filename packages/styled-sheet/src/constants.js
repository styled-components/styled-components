// @flow
/* eslint-disable camelcase */

declare var __VERSION__: string;
declare var __webpack_nonce__: string;

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

const SC_ATTR_VERSION = `${SC_ATTR}-version`;
const SC_ATTR_STREAM = `${SC_ATTR}-streamed`;

export {
  SC_ATTR,
  SC_ATTR_VERSION,
  SC_ATTR_STREAM,
  SC_VERSION,
  NONCE
};
