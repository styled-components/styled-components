// @flow
/* eslint-disable camelcase, no-undef */

import { IS_BROWSER } from '../constants';

declare var window: { __webpack_nonce__: string };

const getNonce = () => {
  if (IS_BROWSER) {
    const cspNonceMetaTag =
      document && document.head && document.head.querySelector("meta[property='csp-nonce']");
    if (cspNonceMetaTag) {
      // $FlowIgnore[prop-missing]
      return cspNonceMetaTag && cspNonceMetaTag.content;
    }
  }
  
  return typeof window !== 'undefined'
    ? typeof window.__webpack_nonce__ !== 'undefined'
      ? window.__webpack_nonce__
      : null
    : null;
};

export default getNonce;
