// @flow
/**
 * Contains helpers for working with vendor prefixes.
 *
 * @example
 * const vendor = postcss.vendor;
 *
 * @namespace vendor
 */
const vendor = {
  /**
   * Returns the vendor prefix extracted from an input string.
   *
   * @param {string} prop - string with or without vendor prefix
   *
   * @return {string} vendor prefix or empty string
   *
   * @example
   * postcss.vendor.prefix('-moz-tab-size') //=> '-moz-'
   * postcss.vendor.prefix('tab-size')      //=> ''
   */
  prefix(prop) {
    if (prop[0] === '-') {
      const sep = prop.indexOf('-', 1);
      return prop.substr(0, sep + 1);
    } else {
      return '';
    }
  },

  /**
   * Returns the input string stripped of its vendor prefix.
   *
   * @param {string} prop - string with or without vendor prefix
   *
   * @return {string} string name without vendor prefixes
   *
   * @example
   * postcss.vendor.unprefixed('-moz-tab-size') //=> 'tab-size'
   */
  unprefixed(prop) {
    if (prop[0] === '-') {
      const sep = prop.indexOf('-', 1);
      return prop.substr(sep + 1);
    } else {
      return prop;
    }
  },
};

export default vendor;
