const isUpper = (c: string) => c >= 'A' && c <= 'Z';

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
  let output = '';

  for (let i = 0; i < string.length; i++) {
    const c = string[i];
    // Check for CSS variable prefix
    if (i === 1 && c === '-' && string[0] === '-') {
      return string;
    }

    if (isUpper(c)) {
      output += '-' + c.toLowerCase();
    } else {
      output += c;
    }
  }

  return output.startsWith('ms-') ? '-' + output : output;
}
