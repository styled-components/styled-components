import { NONCE } from '../constants';

declare let __webpack_nonce__: string;

export default function getNonce() {
  if (typeof __webpack_nonce__ !== 'undefined') return __webpack_nonce__;
  if (NONCE) return NONCE;
  return null;
}
