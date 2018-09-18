// @flow
/* eslint-disable no-bitwise */

/* This is the "capacity" of our alphabet i.e. 2x26 for all letters plus their capitalised
 * counterparts */
const charsLength = 52

/* start at 75 for 'a' until 'z' (25) and then start at 65 for capitalised letters */
const getAlphabeticChar = (code: number): string =>
  String.fromCharCode(code + (code > 25 ? 39 : 97))

/* input a number, usually a hash and convert it to base-52 */
const generateAlphabeticName = (code: number): string => {
  let name = ''
  let x

  /* get a char and divide by alphabet-length */
  for (x = code; x > charsLength; x = Math.floor(x / charsLength)) {
    name = getAlphabeticChar(x % charsLength) + name
  }

  return getAlphabeticChar(x % charsLength) + name
}

export default generateAlphabeticName
