// @flow
/* eslint-disable camelcase, no-undef */

declare var __webpack_nonce__: string;

const getNonce = () => {
  return typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null;
};

export default getNonce;
