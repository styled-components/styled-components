import template from 'babel-template'

const buildWrapper = template(`(function() { var c = VALUE;  c.displayName = NAME; return c })()`)

export default function({types: t }) {
  return {
    visitor: {
      TaggedTemplateExpression: {
        enter(path) {
          const tag = path.node.tag
          if ((tag.object && tag.object.name == 'styled') || (tag.callee && tag.callee.name == 'styled')) {
            if (path.node._styledComponentsSeen) {
              return
            }
            let id = undefined;
            path.find((path) => {
              if (path.isAssignmentExpression()) {
                id = path.node.left;
              } else if (path.isObjectProperty()) {
                id = path.node.key;
              } else if (path.isVariableDeclarator()) {
                id = path.node.id;
              } else if (path.isStatement()) {
                // we've hit a statement, we should stop crawling up
                return true;
              }

              // we've got an id! no need to continue
              if (id) return true;
            });

            // ensure that we have an identifier we can inherit from
            if (!id) return;

            // foo.bar -> bar
            if (t.isMemberExpression(id)) {
              id = id.property;
            }

            // identifiers are the only thing we can reliably get a name from
            if (t.isIdentifier(id)) {
              const wrapper = buildWrapper({ VALUE: path.node, NAME: t.stringLiteral(id.name) })
              path.node._styledComponentsSeen = true
              path.replaceWith(wrapper)
            }
          }
        }
      }
    }
  }
}
