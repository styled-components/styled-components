// @flow
import warnOnce from './warn-once';
import Node from './node';

/**
 * Represents a comment between declarations or statements (rule and at-rules).
 *
 * Comments inside selectors, at-rule parameters, or declaration values
 * will be stored in the `raws` properties explained above.
 *
 * @extends Node
 */
class Comment extends Node {
  constructor(defaults) {
    super(defaults);
    this.type = 'comment';
  }

  get left() {
    warnOnce('Comment#left was deprecated. Use Comment#raws.left');
    return this.raws.left;
  }

  set left(val) {
    warnOnce('Comment#left was deprecated. Use Comment#raws.left');
    this.raws.left = val;
  }

  get right() {
    warnOnce('Comment#right was deprecated. Use Comment#raws.right');
    return this.raws.right;
  }

  set right(val) {
    warnOnce('Comment#right was deprecated. Use Comment#raws.right');
    this.raws.right = val;
  }

  /**
   * @memberof Comment#
   * @member {string} text - the comment’s text
   */

  /**
   * @memberof Comment#
   * @member {object} raws - Information to generate byte-to-byte equal
   *                         node string as it was in the origin input.
   *
   * Every parser saves its own properties,
   * but the default CSS parser uses:
   *
   * * `before`: the space symbols before the node.
   * * `left`: the space symbols between `/*` and the comment’s text.
   * * `right`: the space symbols between the comment’s text.
   */
}

export default Comment;
