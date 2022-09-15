/**
 * inlined version of
 * https://github.com/facebook/fbjs/blob/master/packages/fbjs/src/core/hyphenateStyleName.js
 */
const uppercaseCheck = /[A-Z]/;
const uppercasePattern = /[A-Z]/g;
const msPattern = /^ms-/;
const prefixAndLowerCase = (char: string): string => `-${char.toLowerCase()}`;

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
export default function hyphenateStyleName(string: string) {
  return uppercaseCheck.test(string) && !string.startsWith('--')
    ? string.replace(uppercasePattern, prefixAndLowerCase).replace(msPattern, '-ms-')
    : string;
}
