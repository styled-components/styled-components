declare let __webpack_nonce__: string;

export default function getNonce() {
  let nonce: string | null = null;
  if (process.env.styled_component_nonce) {
    nonce = process.env.styled_component_nonce;
  } else if (typeof __webpack_nonce__ !== 'undefined') {
    nonce = __webpack_nonce__;
  }
  return nonce;
}
