// @flow
/* eslint-disable camelcase */

declare var __VERSION__: string;
declare var __webpack_nonce__: string;

let SC_ATTR = 'data-styled';
if (typeof process !== 'undefined' && process.env.SC_ATTR) {
  SC_ATTR = process.env.SC_ATTR;
}

const SC_ATTR_VERSION = `${SC_ATTR  }-version`;
const SC_ATTR_STREAM = `${SC_ATTR  }-streamed`;
const SC_VERSION = __VERSION__;

let NONCE = '';
if (typeof __webpack_nonce__ !== 'undefined') {
  NONCE = __webpack_nonce__;
}

export {
  SC_ATTR,
  SC_ATTR_VERSION,
  SC_ATTR_STREAM,
  SC_VERSION,
  NONCE
};
