// @flow
/* eslint-disable camelcase, no-undef */

declare var window: { __webpack_nonce__: string };

const getNonce = () => {

  return typeof window !== 'undefined'
    ? typeof window.__webpack_nonce__ !== 'undefined'
      ? window.__webpack_nonce__
      : null
    : null;
};

export default getNonce;
