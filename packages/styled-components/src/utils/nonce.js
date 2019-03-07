// @flow
/* eslint-disable camelcase, no-undef */

declare var __webpack_nonce__: string;

export const nonce = () => (typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null);
