/* This is the "capacity" of our alphabet i.e. 2x26 for all letters plus their capitalised
 * counterparts */
const charsLength = 52;

/* start at 75 for 'a' until 'z' (25) and then start at 65 for capitalised letters */
const getAlphabeticChar = (code: number) => String.fromCharCode(code + (code > 25 ? 39 : 97));

const D_LOWER_CHAR = 'd'.charCodeAt(0);
const D_CHAR = 'D'.charCodeAt(0);

const A_LOWER_CHAR = 'a'.charCodeAt(0);
const A_CHAR = 'A'.charCodeAt(0);

function ensureDashForAD(a: string, b: string) {
  if (a.length === 0 || b.length === 0) {
    return a + b;
  }

  // check b string first because d character is more frequent
  // Frequency for 1e8: { a: 7382933, A: 7515584, d: 14283437, D: 7515584 }
  const lastBChar = b.charCodeAt(0);

  if (lastBChar !== D_CHAR && lastBChar !== D_LOWER_CHAR) {
    return a + b;
  }

  const lastAChar = a.charCodeAt(a.length - 1);

  if (lastAChar !== A_CHAR && lastAChar !== A_LOWER_CHAR) {
    return a + b;
  }

  return a + '-' + b;
}

/* input a number, usually a hash and convert it to base-52 */
export default function generateAlphabeticName(code: number) {
  let name = '';
  let x;

  /* get a char and divide by alphabet-length */
  for (x = Math.abs(code); x > charsLength; x = (x / charsLength) | 0) {
    name = ensureDashForAD(getAlphabeticChar(x % charsLength), name);
  }

  return ensureDashForAD(getAlphabeticChar(x % charsLength), name);
}
