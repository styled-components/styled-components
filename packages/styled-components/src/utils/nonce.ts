import { NONCE } from '../constants';

declare let __webpack_nonce__: string;

export default function getNonce() {
  if (NONCE) return NONCE;
  return typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null;
}
