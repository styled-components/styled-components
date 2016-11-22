import template from 'babel-template'

const buildNodeWithDisplayName = template(`(function() { var c = VALUE;  c.displayName = DISPLAYNAME; return c })()`)
const buildNodeWithIdentifier = template(`(function() { var c = VALUE;  c.identifier = IDENTIFIER; return c })()`)

const isStyled = (tag) => (tag.object && tag.object.name == 'styled') || (tag.callee && tag.callee.name == 'styled')

let id = 0

export default function({types: t }) {
  return {
    visitor: {
      TaggedTemplateExpression: {
        enter(path, { opts }) {
          const addDisplayName = (opts.displayName === undefined || opts.displayName === null) ? true : opts.displayName
					const addIdentifier = (opts.ssr === undefined || opts.ssr === null) ? true : opts.ssr
          const tag = path.node.tag

          if (!isStyled(tag)) return
          if (path.node._styledComponentsSeen) {
            return
          }

          let displayName

          if (addDisplayName) {
            path.find((path) => {
              if (path.isAssignmentExpression()) {
                displayName = path.node.left
              } else if (path.isObjectProperty()) {
                displayName = path.node.key
              } else if (path.isVariableDeclarator()) {
                displayName = path.node.id
              } else if (path.isStatement()) {
                // we've hit a statement, we should stop crawling up
                return true
              }

              // we've got an displayName! no need to continue
              if (displayName) return true
            })

            // ensure that we have an displayName we can inherit from
            if (!displayName) return

            // foo.bar -> bar
            if (t.isMemberExpression(displayName)) {
              displayName = displayName.property
            }

            // identifiers are the only thing we can reliably get a name from
            if (!t.isIdentifier(displayName)) {
              displayName = undefined
            } else {
              displayName = displayName.name
            }
          }

          let newNode
          if (addDisplayName) {
            newNode = buildNodeWithDisplayName({
              VALUE: path.node,
              DISPLAYNAME: t.stringLiteral(displayName),
            })
          } else if (addIdentifier) {
            id++
            newNode = buildNodeWithIdentifier({
              VALUE: path.node,
              IDENTIFIER: t.numericLiteral(id),
            })
          }

          path.node._styledComponentsSeen = true
          if (!newNode) return
          path.replaceWith(newNode)
        }
      }
    }
  }
}
