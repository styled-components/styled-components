// @flow
const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const charsLength = chars.length

/* Some high number, usually 9-digit base-10. Map it to base-😎 */
const generateAlphabeticName = (code: number): string => {
  let name = ''
  let x

  for (
    x = code;
    x > charsLength;
    x = Math.floor(x / chars.length)
  ) {
    name = chars[x % charsLength] + name
  }

  return chars[x % charsLength] + name
}

export default generateAlphabeticName
