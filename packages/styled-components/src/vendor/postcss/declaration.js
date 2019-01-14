// @flow
import warnOnce from './warn-once';
import Node from './node';

/**
 * Represents a CSS declaration.
 *
 * @extends Node
 *
 * @example
 * const root = postcss.parse('a { color: black }');
 * const decl = root.first.first;
 * decl.type       //=> 'decl'
 * decl.toString() //=> ' color: black'
 */
class Declaration extends Node {
  constructor(defaults) {
    super(defaults);
    this.type = 'decl';
  }

  get _value() {
    warnOnce('Node#_value was deprecated. Use Node#raws.value');
    return this.raws.value;
  }

  set _value(val) {
    warnOnce('Node#_value was deprecated. Use Node#raws.value');
    this.raws.value = val;
  }

  get _important() {
    warnOnce('Node#_important was deprecated. Use Node#raws.important');
    return this.raws.important;
  }

  set _important(val) {
    warnOnce('Node#_important was deprecated. Use Node#raws.important');
    this.raws.important = val;
  }

  /**
   * @memberof Declaration#
   * @member {string} prop - the declaration’s property name
   *
   * @example
   * const root = postcss.parse('a { color: black }');
   * const decl = root.first.first;
   * decl.prop //=> 'color'
   */

  /**
   * @memberof Declaration#
   * @member {string} value - the declaration’s value
   *
   * @example
   * const root = postcss.parse('a { color: black }');
   * const decl = root.first.first;
   * decl.value //=> 'black'
   */

  /**
   * @memberof Declaration#
   * @member {boolean} important - `true` if the declaration
   *                               has an !important annotation.
   *
   * @example
   * const root = postcss.parse('a { color: black !important; color: red }');
   * root.first.first.important //=> true
   * root.first.last.important  //=> undefined
   */

  /**
   * @memberof Declaration#
   * @member {object} raws - Information to generate byte-to-byte equal
   *                         node string as it was in the origin input.
   *
   * Every parser saves its own properties,
   * but the default CSS parser uses:
   *
   * * `before`: the space symbols before the node. It also stores `*`
   *   and `_` symbols before the declaration (IE hack).
   * * `between`: the symbols between the property and value
   *   for declarations, selector and `{` for rules, or last parameter
   *   and `{` for at-rules.
   * * `important`: the content of the important statement,
   *   if it is not just `!important`.
   *
   * PostCSS cleans declaration from comments and extra spaces,
   * but it stores origin content in raws properties.
   * As such, if you don’t change a declaration’s value,
   * PostCSS will use the raw value with comments.
   *
   * @example
   * const root = postcss.parse('a {\n  color:black\n}')
   * root.first.first.raws //=> { before: '\n  ', between: ':' }
   */
}

export default Declaration;
