// @flow
/* eslint-disable camelcase, no-undef */

import { IS_BROWSER } from '../constants';

declare var __webpack_nonce__: string;

const getNonce = () => {
  if (IS_BROWSER) {
    const cspNonceMetaTag =
      document && document.head && document.head.querySelector("meta[property='csp-nonce']");
    if (cspNonceMetaTag) {
      // $FlowIgnore[prop-missing]
      return cspNonceMetaTag && cspNonceMetaTag.content;
    }
  }
  return typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null;
};

export default getNonce;
