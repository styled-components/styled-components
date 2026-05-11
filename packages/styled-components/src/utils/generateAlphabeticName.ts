/* base-52 alphabet: lowercase then uppercase. Precomputed so the hot path
 * is a single string index rather than `String.fromCharCode` + a ternary. */
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const AD_REPLACER_R = /(a)(d)/gi;

/* Char codes for the cheap "could output contain 'ad'?" gate. */
const CC_A_LOWER = 97;
const CC_A_UPPER = 65;
const CC_D_LOWER = 100;
const CC_D_UPPER = 68;

/* input a number, usually a hash and convert it to base-52 */
export default function generateAlphabeticName(code: number) {
  let name = '';
  let x = Math.abs(code);

  /* get a char and divide by alphabet-length. Strict `>`: when x equals
   * 52 we want a single final char (`CHARS[0]` = 'a'), matching the
   * pre-refactor loop's `for (...; x > charsLength; ...)` semantics. */
  while (x > 52) {
    name = CHARS[x % 52] + name;
    x = (x / 52) | 0;
  }
  name = CHARS[x % 52] + name;

  /* "ad" runs in the encoded name would render as a literal ad-blocker
   * heuristic; we break them with a dash. The regex/replace is by far the
   * costliest step in this function, so first do a cheap two-char scan:
   * skip allocation entirely when no `a`/`A` is followed by a `d`/`D`. */
  for (let i = 0; i < name.length - 1; i++) {
    const c1 = name.charCodeAt(i);
    if (c1 === CC_A_LOWER || c1 === CC_A_UPPER) {
      const c2 = name.charCodeAt(i + 1);
      if (c2 === CC_D_LOWER || c2 === CC_D_UPPER) {
        return name.replace(AD_REPLACER_R, '$1-$2');
      }
    }
  }
  return name;
}
