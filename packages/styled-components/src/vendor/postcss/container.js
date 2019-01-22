// @flow
import parse from './parse';
import Root from './root';
import Rule from './rule';
import AtRule from './at-rule';
import Declaration from './declaration';
import warnOnce from './warn-once';
import Comment from './comment';
import Node from './node';

function cleanSource(nodes) {
  return nodes.map(i => {
    if (i.nodes) i.nodes = cleanSource(i.nodes);
    delete i.source;
    return i;
  });
}

/**
 * @callback childCondition
 * @param {Node} node    - container child
 * @param {number} index - child index
 * @param {Node[]} nodes - all container children
 * @return {boolean}
 */

/**
 * @callback childIterator
 * @param {Node} node    - container child
 * @param {number} index - child index
 * @return {false|undefined} returning `false` will break iteration
 */

/**
 * The {@link Root}, {@link AtRule}, and {@link Rule} container nodes
 * inherit some common methods to help work with their children.
 *
 * Note that all containers can store any content. If you write a rule inside
 * a rule, PostCSS will parse it.
 *
 * @extends Node
 * @abstract
 */
class Container extends Node {
  push(child) {
    child.parent = this;
    this.nodes.push(child);
    return this;
  }

  /**
   * Iterates through the container’s immediate children,
   * calling `callback` for each child.
   *
   * Returning `false` in the callback will break iteration.
   *
   * This method only iterates through the container’s immediate children.
   * If you need to recursively iterate through all the container’s descendant
   * nodes, use {@link Container#walk}.
   *
   * Unlike the for `{}`-cycle or `Array#forEach` this iterator is safe
   * if you are mutating the array of child nodes during iteration.
   * PostCSS will adjust the current index to match the mutations.
   *
   * @param {childIterator} callback - iterator receives each node and index
   *
   * @return {false|undefined} returns `false` if iteration was broke
   *
   * @example
   * const root = postcss.parse('a { color: black; z-index: 1 }');
   * const rule = root.first;
   *
   * for ( let decl of rule.nodes ) {
   *     decl.cloneBefore({ prop: '-webkit-' + decl.prop });
   *     // Cycle will be infinite, because cloneBefore moves the current node
   *     // to the next index
   * }
   *
   * rule.each(decl => {
   *     decl.cloneBefore({ prop: '-webkit-' + decl.prop });
   *     // Will be executed only for color and z-index
   * });
   */
  each(callback) {
    if (!this.lastEach) this.lastEach = 0;
    if (!this.indexes) this.indexes = {};

    this.lastEach += 1;
    const id = this.lastEach;
    this.indexes[id] = 0;

    if (!this.nodes) return undefined;

    let index, result;
    while (this.indexes[id] < this.nodes.length) {
      index = this.indexes[id];
      result = callback(this.nodes[index], index);
      if (result === false) break;

      this.indexes[id] += 1;
    }

    delete this.indexes[id];

    return result;
  }

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each node.
   *
   * Like container.each(), this method is safe to use
   * if you are mutating arrays during iteration.
   *
   * If you only need to iterate through the container’s immediate children,
   * use {@link Container#each}.
   *
   * @param {childIterator} callback - iterator receives each node and index
   *
   * @return {false|undefined} returns `false` if iteration was broke
   *
   * @example
   * root.walk(node => {
   *   // Traverses all descendant nodes.
   * });
   */
  walk(callback) {
    return this.each((child, i) => {
      let result = callback(child, i);
      if (result !== false && child.walk) {
        result = child.walk(callback);
      }
      return result;
    });
  }

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each declaration node.
   *
   * If you pass a filter, iteration will only happen over declarations
   * with matching properties.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {string|RegExp} [prop]   - string or regular expression
   *                                   to filter declarations by property name
   * @param {childIterator} callback - iterator receives each node and index
   *
   * @return {false|undefined} returns `false` if iteration was broke
   *
   * @example
   * root.walkDecls(decl => {
   *   checkPropertySupport(decl.prop);
   * });
   *
   * root.walkDecls('border-radius', decl => {
   *   decl.remove();
   * });
   *
   * root.walkDecls(/^background/, decl => {
   *   decl.value = takeFirstColorFromGradient(decl.value);
   * });
   */
  walkDecls(prop, callback) {
    if (!callback) {
      callback = prop;
      return this.walk((child, i) => {
        if (child.type === 'decl') {
          return callback(child, i);
        }
      });
    } else if (prop instanceof RegExp) {
      return this.walk((child, i) => {
        if (child.type === 'decl' && prop.test(child.prop)) {
          return callback(child, i);
        }
      });
    } else {
      return this.walk((child, i) => {
        if (child.type === 'decl' && child.prop === prop) {
          return callback(child, i);
        }
      });
    }
  }

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each rule node.
   *
   * If you pass a filter, iteration will only happen over rules
   * with matching selectors.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {string|RegExp} [selector] - string or regular expression
   *                                     to filter rules by selector
   * @param {childIterator} callback   - iterator receives each node and index
   *
   * @return {false|undefined} returns `false` if iteration was broke
   *
   * @example
   * const selectors = [];
   * root.walkRules(rule => {
   *   selectors.push(rule.selector);
   * });
   * console.log(`Your CSS uses ${selectors.length} selectors`);
   */
  walkRules(selector, callback) {
    if (!callback) {
      callback = selector;

      return this.walk((child, i) => {
        if (child.type === 'rule') {
          return callback(child, i);
        }
      });
    } else if (selector instanceof RegExp) {
      return this.walk((child, i) => {
        if (child.type === 'rule' && selector.test(child.selector)) {
          return callback(child, i);
        }
      });
    } else {
      return this.walk((child, i) => {
        if (child.type === 'rule' && child.selector === selector) {
          return callback(child, i);
        }
      });
    }
  }

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each at-rule node.
   *
   * If you pass a filter, iteration will only happen over at-rules
   * that have matching names.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {string|RegExp} [name]   - string or regular expression
   *                                   to filter at-rules by name
   * @param {childIterator} callback - iterator receives each node and index
   *
   * @return {false|undefined} returns `false` if iteration was broke
   *
   * @example
   * root.walkAtRules(rule => {
   *   if ( isOld(rule.name) ) rule.remove();
   * });
   *
   * let first = false;
   * root.walkAtRules('charset', rule => {
   *   if ( !first ) {
   *     first = true;
   *   } else {
   *     rule.remove();
   *   }
   * });
   */
  walkAtRules(name, callback) {
    if (!callback) {
      callback = name;
      return this.walk((child, i) => {
        if (child.type === 'atrule') {
          return callback(child, i);
        }
      });
    } else if (name instanceof RegExp) {
      return this.walk((child, i) => {
        if (child.type === 'atrule' && name.test(child.name)) {
          return callback(child, i);
        }
      });
    } else {
      return this.walk((child, i) => {
        if (child.type === 'atrule' && child.name === name) {
          return callback(child, i);
        }
      });
    }
  }

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each comment node.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {childIterator} callback - iterator receives each node and index
   *
   * @return {false|undefined} returns `false` if iteration was broke
   *
   * @example
   * root.walkComments(comment => {
   *   comment.remove();
   * });
   */
  walkComments(callback) {
    return this.walk((child, i) => {
      if (child.type === 'comment') {
        return callback(child, i);
      }
    });
  }

  /**
   * Inserts new nodes to the start of the container.
   *
   * @param {...(Node|object|string|Node[])} children - new nodes
   *
   * @return {Node} this node for methods chain
   *
   * @example
   * const decl1 = postcss.decl({ prop: 'color', value: 'black' });
   * const decl2 = postcss.decl({ prop: 'background-color', value: 'white' });
   * rule.append(decl1, decl2);
   *
   * root.append({ name: 'charset', params: '"UTF-8"' });  // at-rule
   * root.append({ selector: 'a' });                       // rule
   * rule.append({ prop: 'color', value: 'black' });       // declaration
   * rule.append({ text: 'Comment' })                      // comment
   *
   * root.append('a {}');
   * root.first.append('color: black; z-index: 1');
   */
  append(...children) {
    children.forEach(child => {
      const nodes = this.normalize(child, this.last);
      nodes.forEach(node => this.nodes.push(node));
    });
    return this;
  }

  /**
   * Inserts new nodes to the end of the container.
   *
   * @param {...(Node|object|string|Node[])} children - new nodes
   *
   * @return {Node} this node for methods chain
   *
   * @example
   * const decl1 = postcss.decl({ prop: 'color', value: 'black' });
   * const decl2 = postcss.decl({ prop: 'background-color', value: 'white' });
   * rule.prepend(decl1, decl2);
   *
   * root.append({ name: 'charset', params: '"UTF-8"' });  // at-rule
   * root.append({ selector: 'a' });                       // rule
   * rule.append({ prop: 'color', value: 'black' });       // declaration
   * rule.append({ text: 'Comment' })                      // comment
   *
   * root.append('a {}');
   * root.first.append('color: black; z-index: 1');
   */
  prepend(...children) {
    children = children.reverse();
    children.forEach(child => {
      const nodes = this.normalize(child, this.first, 'prepend').reverse();
      nodes.forEach(node => this.nodes.unshift(node));
      for (const id in this.indexes) {
        this.indexes[id] = this.indexes[id] + nodes.length;
      }
    });
    return this;
  }

  cleanRaws(keepBetween) {
    super.cleanRaws(keepBetween);
    if (this.nodes) {
      this.nodes.forEach(node => node.cleanRaws(keepBetween));
    }
  }

  /**
   * Insert new node before old node within the container.
   *
   * @param {Node|number} exist             - child or child’s index.
   * @param {Node|object|string|Node[]} add - new node
   *
   * @return {Node} this node for methods chain
   *
   * @example
   * rule.insertBefore(decl, decl.clone({ prop: '-webkit-' + decl.prop }));
   */
  insertBefore(exist, add) {
    exist = this.index(exist);

    const type = exist === 0 ? 'prepend' : false;
    const nodes = this.normalize(add, this.nodes[exist], type).reverse();
    nodes.forEach(node => this.nodes.splice(exist, 0, node));

    let index;
    for (const id in this.indexes) {
      index = this.indexes[id];
      if (exist <= index) {
        this.indexes[id] = index + nodes.length;
      }
    }

    return this;
  }

  /**
   * Insert new node after old node within the container.
   *
   * @param {Node|number} exist             - child or child’s index
   * @param {Node|object|string|Node[]} add - new node
   *
   * @return {Node} this node for methods chain
   */
  insertAfter(exist, add) {
    exist = this.index(exist);

    const nodes = this.normalize(add, this.nodes[exist]).reverse();
    nodes.forEach(node => this.nodes.splice(exist + 1, 0, node));

    let index;
    for (const id in this.indexes) {
      index = this.indexes[id];
      if (exist < index) {
        this.indexes[id] = index + nodes.length;
      }
    }

    return this;
  }

  remove(child) {
    if (typeof child !== 'undefined') {
      warnOnce('Container#remove is deprecated. ' + 'Use Container#removeChild');
      this.removeChild(child);
    } else {
      super.remove();
    }
    return this;
  }

  /**
   * Removes node from the container and cleans the parent properties
   * from the node and its children.
   *
   * @param {Node|number} child - child or child’s index
   *
   * @return {Node} this node for methods chain
   *
   * @example
   * rule.nodes.length  //=> 5
   * rule.removeChild(decl);
   * rule.nodes.length  //=> 4
   * decl.parent        //=> undefined
   */
  removeChild(child) {
    child = this.index(child);
    this.nodes[child].parent = undefined;
    this.nodes.splice(child, 1);

    let index;
    for (const id in this.indexes) {
      index = this.indexes[id];
      if (index >= child) {
        this.indexes[id] = index - 1;
      }
    }

    return this;
  }

  /**
   * Removes all children from the container
   * and cleans their parent properties.
   *
   * @return {Node} this node for methods chain
   *
   * @example
   * rule.removeAll();
   * rule.nodes.length //=> 0
   */
  removeAll() {
    this.nodes.forEach(node => (node.parent = undefined));
    this.nodes = [];
    return this;
  }

  /**
     * Passes all declaration values within the container that match pattern
     * through callback, replacing those values with the returned result
     * of callback.
     *
     * This method is useful if you are using a custom unit or function
     * and need to iterate through all values.
     *
     * @param {string|RegExp} pattern      - replace pattern
     * @param {object} opts                - options to speed up the search
     * @param {string|string[]} opts.props - an array of property names
     * @param {string} opts.fast           - string that’s used
     *                                       to narrow down values and speed up
                                             the regexp search
     * @param {function|string} callback   - string to replace pattern
     *                                       or callback that returns a new
     *                                       value.
     *                                       The callback will receive
     *                                       the same arguments as those
     *                                       passed to a function parameter
     *                                       of `String#replace`.
     *
     * @return {Node} this node for methods chain
     *
     * @example
     * root.replaceValues(/\d+rem/, { fast: 'rem' }, string => {
     *   return 15 * parseInt(string) + 'px';
     * });
     */
  replaceValues(pattern, opts, callback) {
    if (!callback) {
      callback = opts;
      opts = {};
    }

    this.walkDecls(decl => {
      if (opts.props && opts.props.indexOf(decl.prop) === -1) return;
      if (opts.fast && decl.value.indexOf(opts.fast) === -1) return;

      decl.value = decl.value.replace(pattern, callback);
    });

    return this;
  }

  /**
   * Returns `true` if callback returns `true`
   * for all of the container’s children.
   *
   * @param {childCondition} condition - iterator returns true or false.
   *
   * @return {boolean} is every child pass condition
   *
   * @example
   * const noPrefixes = rule.every(i => i.prop[0] !== '-');
   */
  every(condition) {
    return this.nodes.every(condition);
  }

  /**
   * Returns `true` if callback returns `true` for (at least) one
   * of the container’s children.
   *
   * @param {childCondition} condition - iterator returns true or false.
   *
   * @return {boolean} is some child pass condition
   *
   * @example
   * const hasPrefix = rule.some(i => i.prop[0] === '-');
   */
  some(condition) {
    return this.nodes.some(condition);
  }

  /**
   * Returns a `child`’s index within the {@link Container#nodes} array.
   *
   * @param {Node} child - child of the current container.
   *
   * @return {number} child index
   *
   * @example
   * rule.index( rule.nodes[2] ) //=> 2
   */
  index(child) {
    if (typeof child === 'number') {
      return child;
    } else {
      return this.nodes.indexOf(child);
    }
  }

  /**
   * The container’s first child.
   *
   * @type {Node}
   *
   * @example
   * rule.first == rules.nodes[0];
   */
  get first() {
    if (!this.nodes) return undefined;
    return this.nodes[0];
  }

  /**
   * The container’s last child.
   *
   * @type {Node}
   *
   * @example
   * rule.last == rule.nodes[rule.nodes.length - 1];
   */
  get last() {
    if (!this.nodes) return undefined;
    return this.nodes[this.nodes.length - 1];
  }

  normalize(nodes, sample) {
    if (typeof nodes === 'string') {
      nodes = cleanSource(parse(nodes).nodes);
    } else if (!Array.isArray(nodes)) {
      if (nodes.type === 'root') {
        nodes = nodes.nodes;
      } else if (nodes.type) {
        nodes = [nodes];
      } else if (nodes.prop) {
        if (typeof nodes.value === 'undefined') {
          throw new Error('Value field is missed in node creation');
        } else if (typeof nodes.value !== 'string') {
          nodes.value = String(nodes.value);
        }
        nodes = [new Declaration(nodes)];
      } else if (nodes.selector) {
        nodes = [new Rule(nodes)];
      } else if (nodes.name) {
        nodes = [new AtRule(nodes)];
      } else if (nodes.text) {
        nodes = [new Comment(nodes)];
      } else {
        throw new Error('Unknown node type in node creation');
      }
    }

    const processed = nodes.map(i => {
      if (typeof i.raws === 'undefined') i = this.rebuild(i);

      if (i.parent) i = i.clone();
      if (typeof i.raws.before === 'undefined') {
        if (sample && typeof sample.raws.before !== 'undefined') {
          i.raws.before = sample.raws.before.replace(/[^\s]/g, '');
        }
      }
      i.parent = this;
      return i;
    });

    return processed;
  }

  rebuild(node, parent) {
    let fix;
    if (node.type === 'root') {
      fix = new Root();
    } else if (node.type === 'atrule') {
      fix = new AtRule();
    } else if (node.type === 'rule') {
      fix = new Rule();
    } else if (node.type === 'decl') {
      fix = new Declaration();
    } else if (node.type === 'comment') {
      fix = new Comment();
    }

    for (const i in node) {
      if (i === 'nodes') {
        fix.nodes = node.nodes.map(j => this.rebuild(j, fix));
      } else if (i === 'parent' && parent) {
        fix.parent = parent;
      } else if (node.hasOwnProperty(i)) {
        fix[i] = node[i];
      }
    }

    return fix;
  }

  eachInside(callback) {
    warnOnce('Container#eachInside is deprecated. ' + 'Use Container#walk instead.');
    return this.walk(callback);
  }

  eachDecl(prop, callback) {
    warnOnce('Container#eachDecl is deprecated. ' + 'Use Container#walkDecls instead.');
    return this.walkDecls(prop, callback);
  }

  eachRule(selector, callback) {
    warnOnce('Container#eachRule is deprecated. ' + 'Use Container#walkRules instead.');
    return this.walkRules(selector, callback);
  }

  eachAtRule(name, callback) {
    warnOnce('Container#eachAtRule is deprecated. ' + 'Use Container#walkAtRules instead.');
    return this.walkAtRules(name, callback);
  }

  eachComment(callback) {
    warnOnce('Container#eachComment is deprecated. ' + 'Use Container#walkComments instead.');
    return this.walkComments(callback);
  }

  get semicolon() {
    warnOnce('Node#semicolon is deprecated. Use Node#raws.semicolon');
    return this.raws.semicolon;
  }

  set semicolon(val) {
    warnOnce('Node#semicolon is deprecated. Use Node#raws.semicolon');
    this.raws.semicolon = val;
  }

  get after() {
    warnOnce('Node#after is deprecated. Use Node#raws.after');
    return this.raws.after;
  }

  set after(val) {
    warnOnce('Node#after is deprecated. Use Node#raws.after');
    this.raws.after = val;
  }

  /**
   * @memberof Container#
   * @member {Node[]} nodes - an array containing the container’s children
   *
   * @example
   * const root = postcss.parse('a { color: black }');
   * root.nodes.length           //=> 1
   * root.nodes[0].selector      //=> 'a'
   * root.nodes[0].nodes[0].prop //=> 'color'
   */
}

export default Container;
