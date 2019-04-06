// @flow
/* eslint-disable camelcase, no-undef, no-nested-ternary */

declare var __webpack_nonce__: string;

export default (global => () => {
  if (typeof global.__webpack_nonce__ !== 'undefined') {
    return global.__webpack_nonce__;
  } else if (typeof __webpack_nonce__ !== 'undefined') {
    return __webpack_nonce__;
  }
  return null;
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : {});
