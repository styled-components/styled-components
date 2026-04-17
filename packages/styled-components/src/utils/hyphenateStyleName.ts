import { HYPHEN, UPPER_A, UPPER_Z, UPPER_TO_LOWER } from './charCodes';

/**
 * Hyphenates a camelcased CSS property name, for example:
 *
 *   > hyphenateStyleName('backgroundColor')
 *   < "background-color"
 *   > hyphenateStyleName('MozTransition')
 *   < "-moz-transition"
 *   > hyphenateStyleName('msTransition')
 *   < "-ms-transition"
 *
 * As Modernizr suggests (http://modernizr.com/docs/#prefixed), an `ms` prefix
 * is converted to `-ms-`.
 */
export default function hyphenateStyleName(string: string): string {
  // CSS variable prefix (`--*`) passes through untouched.
  if (string.charCodeAt(0) === HYPHEN && string.charCodeAt(1) === HYPHEN) {
    return string;
  }

  let output = '';
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code >= UPPER_A && code <= UPPER_Z) {
      output += '-' + String.fromCharCode(code + UPPER_TO_LOWER);
    } else {
      output += string[i];
    }
  }

  return output.startsWith('ms-') ? '-' + output : output;
}
