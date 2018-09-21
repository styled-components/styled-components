// @flow
/* eslint-disable valid-jsdoc */

const defaultRaw = {
  colon: ': ',
  indent: '    ',
  beforeDecl: '\n',
  beforeRule: '\n',
  beforeOpen: ' ',
  beforeClose: '\n',
  beforeComment: '\n',
  after: '\n',
  emptyBody: '',
  commentLeft: ' ',
  commentRight: ' ',
};

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

class Stringifier {
  constructor(builder) {
    this.builder = builder;
  }

  stringify(node, semicolon) {
    this[node.type](node, semicolon);
  }

  root(node) {
    this.body(node);
    if (node.raws.after) this.builder(node.raws.after);
  }

  comment(node) {
    const left = this.raw(node, 'left', 'commentLeft');
    const right = this.raw(node, 'right', 'commentRight');
    this.builder(`/*${left}${node.text}${right}*/`, node);
  }

  decl(node, semicolon) {
    const between = this.raw(node, 'between', 'colon');
    let string = node.prop + between + this.rawValue(node, 'value');

    if (node.important) {
      string += node.raws.important || ' !important';
    }

    if (semicolon) string += ';';
    this.builder(string, node);
  }

  rule(node) {
    this.block(node, this.rawValue(node, 'selector'));
  }

  atrule(node, semicolon) {
    let name = `@${node.name}`;
    const params = node.params ? this.rawValue(node, 'params') : '';

    if (typeof node.raws.afterName !== 'undefined') {
      name += node.raws.afterName;
    } else if (params) {
      name += ' ';
    }

    if (node.nodes) {
      this.block(node, name + params);
    } else {
      const end = (node.raws.between || '') + (semicolon ? ';' : '');
      this.builder(name + params + end, node);
    }
  }

  body(node) {
    let last = node.nodes.length - 1;
    while (last > 0) {
      if (node.nodes[last].type !== 'comment') break;
      last -= 1;
    }

    const semicolon = this.raw(node, 'semicolon');
    for (let i = 0; i < node.nodes.length; i++) {
      const child = node.nodes[i];
      const before = this.raw(child, 'before');
      if (before) this.builder(before);
      this.stringify(child, last !== i || semicolon);
    }
  }

  block(node, start) {
    const between = this.raw(node, 'between', 'beforeOpen');
    this.builder(`${start + between}{`, node, 'start');

    let after;
    if (node.nodes && node.nodes.length) {
      this.body(node);
      after = this.raw(node, 'after');
    } else {
      after = this.raw(node, 'after', 'emptyBody');
    }

    if (after) this.builder(after);
    this.builder('}', node, 'end');
  }

  raw(node, own, detect) {
    let value;
    if (!detect) detect = own;

    // Already had
    if (own) {
      value = node.raws[own];
      if (typeof value !== 'undefined') return value;
    }

    const parent = node.parent;

    // Hack for first rule in CSS
    if (detect === 'before') {
      if (!parent || (parent.type === 'root' && parent.first === node)) {
        return '';
      }
    }

    // Floating child without parent
    if (!parent) return defaultRaw[detect];

    // Detect style by other nodes
    const root = node.root();
    if (!root.rawCache) root.rawCache = {};
    if (typeof root.rawCache[detect] !== 'undefined') {
      return root.rawCache[detect];
    }

    if (detect === 'before' || detect === 'after') {
      return this.beforeAfter(node, detect);
    } else {
      const method = `raw${capitalize(detect)}`;
      if (this[method]) {
        value = this[method](root, node);
      } else {
        root.walk(i => {
          value = i.raws[own];
          if (typeof value !== 'undefined') return false;
        });
      }
    }

    if (typeof value === 'undefined') value = defaultRaw[detect];

    root.rawCache[detect] = value;
    return value;
  }

  rawSemicolon(root) {
    let value;
    root.walk(i => {
      if (i.nodes && i.nodes.length && i.last.type === 'decl') {
        value = i.raws.semicolon;
        if (typeof value !== 'undefined') return false;
      }
    });
    return value;
  }

  rawEmptyBody(root) {
    let value;
    root.walk(i => {
      if (i.nodes && i.nodes.length === 0) {
        value = i.raws.after;
        if (typeof value !== 'undefined') return false;
      }
    });
    return value;
  }

  rawIndent(root) {
    if (root.raws.indent) return root.raws.indent;
    let value;
    root.walk(i => {
      const p = i.parent;
      if (p && p !== root && p.parent && p.parent === root) {
        if (typeof i.raws.before !== 'undefined') {
          const parts = i.raws.before.split('\n');
          value = parts[parts.length - 1];
          value = value.replace(/[^\s]/g, '');
          return false;
        }
      }
    });
    return value;
  }

  rawBeforeComment(root, node) {
    let value;
    root.walkComments(i => {
      if (typeof i.raws.before !== 'undefined') {
        value = i.raws.before;
        if (value.indexOf('\n') !== -1) {
          value = value.replace(/[^\n]+$/, '');
        }
        return false;
      }
    });
    if (typeof value === 'undefined') {
      value = this.raw(node, null, 'beforeDecl');
    }
    return value;
  }

  rawBeforeDecl(root, node) {
    let value;
    root.walkDecls(i => {
      if (typeof i.raws.before !== 'undefined') {
        value = i.raws.before;
        if (value.indexOf('\n') !== -1) {
          value = value.replace(/[^\n]+$/, '');
        }
        return false;
      }
    });
    if (typeof value === 'undefined') {
      value = this.raw(node, null, 'beforeRule');
    }
    return value;
  }

  rawBeforeRule(root) {
    let value;
    root.walk(i => {
      if (i.nodes && (i.parent !== root || root.first !== i)) {
        if (typeof i.raws.before !== 'undefined') {
          value = i.raws.before;
          if (value.indexOf('\n') !== -1) {
            value = value.replace(/[^\n]+$/, '');
          }
          return false;
        }
      }
    });
    return value;
  }

  rawBeforeClose(root) {
    let value;
    root.walk(i => {
      if (i.nodes && i.nodes.length > 0) {
        if (typeof i.raws.after !== 'undefined') {
          value = i.raws.after;
          if (value.indexOf('\n') !== -1) {
            value = value.replace(/[^\n]+$/, '');
          }
          return false;
        }
      }
    });
    return value;
  }

  rawBeforeOpen(root) {
    let value;
    root.walk(i => {
      if (i.type !== 'decl') {
        value = i.raws.between;
        if (typeof value !== 'undefined') return false;
      }
    });
    return value;
  }

  rawColon(root) {
    let value;
    root.walkDecls(i => {
      if (typeof i.raws.between !== 'undefined') {
        value = i.raws.between.replace(/[^\s:]/g, '');
        return false;
      }
    });
    return value;
  }

  beforeAfter(node, detect) {
    let value;
    if (node.type === 'decl') {
      value = this.raw(node, null, 'beforeDecl');
    } else if (node.type === 'comment') {
      value = this.raw(node, null, 'beforeComment');
    } else if (detect === 'before') {
      value = this.raw(node, null, 'beforeRule');
    } else {
      value = this.raw(node, null, 'beforeClose');
    }

    let buf = node.parent;
    let depth = 0;
    while (buf && buf.type !== 'root') {
      depth += 1;
      buf = buf.parent;
    }

    if (value.indexOf('\n') !== -1) {
      const indent = this.raw(node, null, 'indent');
      if (indent.length) {
        for (let step = 0; step < depth; step++) value += indent;
      }
    }

    return value;
  }

  rawValue(node, prop) {
    const value = node[prop];
    const raw = node.raws[prop];
    if (raw && raw.value === value) {
      return raw.raw;
    } else {
      return value;
    }
  }
}

export default Stringifier;
