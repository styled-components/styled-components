// @flow
import Container from './container';
import warnOnce from './warn-once';

/**
 * Represents an at-rule.
 *
 * If it’s followed in the CSS by a {} block, this node will have
 * a nodes property representing its children.
 *
 * @extends Container
 *
 * @example
 * const root = postcss.parse('@charset "UTF-8"; @media print {}');
 *
 * const charset = root.first;
 * charset.type  //=> 'atrule'
 * charset.nodes //=> undefined
 *
 * const media = root.last;
 * media.nodes   //=> []
 */
class AtRule extends Container {
  constructor(defaults) {
    super(defaults);
    this.type = 'atrule';
  }

  append(...children) {
    if (!this.nodes) this.nodes = [];
    return super.append(...children);
  }

  prepend(...children) {
    if (!this.nodes) this.nodes = [];
    return super.prepend(...children);
  }

  get afterName() {
    warnOnce('AtRule#afterName was deprecated. Use AtRule#raws.afterName');
    return this.raws.afterName;
  }

  set afterName(val) {
    warnOnce('AtRule#afterName was deprecated. Use AtRule#raws.afterName');
    this.raws.afterName = val;
  }

  get _params() {
    warnOnce('AtRule#_params was deprecated. Use AtRule#raws.params');
    return this.raws.params;
  }

  set _params(val) {
    warnOnce('AtRule#_params was deprecated. Use AtRule#raws.params');
    this.raws.params = val;
  }

  /**
   * @memberof AtRule#
   * @member {string} name - the at-rule’s name immediately follows the `@`
   *
   * @example
   * const root  = postcss.parse('@media print {}');
   * media.name //=> 'media'
   * const media = root.first;
   */

  /**
   * @memberof AtRule#
   * @member {string} params - the at-rule’s parameters, the values
   *                           that follow the at-rule’s name but precede
   *                           any {} block
   *
   * @example
   * const root  = postcss.parse('@media print, screen {}');
   * const media = root.first;
   * media.params //=> 'print, screen'
   */

  /**
   * @memberof AtRule#
   * @member {object} raws - Information to generate byte-to-byte equal
   *                         node string as it was in the origin input.
   *
   * Every parser saves its own properties,
   * but the default CSS parser uses:
   *
   * * `before`: the space symbols before the node. It also stores `*`
   *   and `_` symbols before the declaration (IE hack).
   * * `after`: the space symbols after the last child of the node
   *   to the end of the node.
   * * `between`: the symbols between the property and value
   *   for declarations, selector and `{` for rules, or last parameter
   *   and `{` for at-rules.
   * * `semicolon`: contains true if the last child has
   *   an (optional) semicolon.
   * * `afterName`: the space between the at-rule name and its parameters.
   *
   * PostCSS cleans at-rule parameters from comments and extra spaces,
   * but it stores origin content in raws properties.
   * As such, if you don’t change a declaration’s value,
   * PostCSS will use the raw value with comments.
   *
   * @example
   * const root = postcss.parse('  @media\nprint {\n}')
   * root.first.first.raws //=> { before: '  ',
   *                       //     between: ' ',
   *                       //     afterName: '\n',
   *                       //     after: '\n' }
   */
}

export default AtRule;
