import template from 'babel-template'

import hash from './utils/hash'
import getTarget from './utils/get-target'

const buildStyledCall = template(`STYLED({
  target: TARGET,
  displayName: DISPLAYNAME,
  identifier: IDENTIFIER
})`)

// Default imported variable name to "styled", adjust based on import below
let importedVariableName = 'styled'

const isStyled = (tag) => (tag.object && tag.object.name === importedVariableName) || (tag.callee && tag.callee.name === importedVariableName)

let id = 0

export default function({ types: t }) {
  return {
    visitor: {
			ImportDeclaration: {
				enter(path) {
					// Is the styled-components import!
					if (path.node.source.value === 'styled-components') {
						// If the default is imported it's at defaultImport[0], otherwise defaultImport is empty
						const defaultImport = path.node.specifiers.filter((specifier) => t.isImportDefaultSpecifier(specifier))
						if (defaultImport.length > 0) {
							// Save the imported name
							importedVariableName = defaultImport[0].local.name
						}
					}
				}
			},
      TaggedTemplateExpression: {
        enter(path, { opts }) {
          const addDisplayName = (opts.displayName === undefined || opts.displayName === null) ? true : opts.displayName
          const addIdentifier = (opts.ssr === undefined || opts.ssr === null) ? true : opts.ssr
          const tag = path.node.tag

          if (!isStyled(tag)) return

          let displayName

          path.find((path) => {
            // const X = styled
            if (path.isAssignmentExpression()) {
              displayName = path.node.left
            // const X = { Y: styled }
            } else if (path.isObjectProperty()) {
              displayName = path.node.key
            // let X; X = styled
            } else if (path.isVariableDeclarator()) {
              displayName = path.node.id
            } else if (path.isStatement()) {
              // we've hit a statement, we should stop crawling up
              return true
            }

            // we've got an displayName (if we need it) no need to continue
            if (displayName) return true
          })

          // foo.bar -> bar
          if (t.isMemberExpression(displayName)) {
            displayName = displayName.property
          }

          // Get target
          const target = getTarget(path.node.tag)

          // identifiers are the only thing we can reliably get a name from
          if (!t.isIdentifier(displayName)) {
            displayName = undefined
          } else {
            displayName = displayName.name
          }

          id++
          // Prefix the identifier with a character if no displayName exists because CSS classes cannot start with a number
          const identifier = `${displayName || 's'}-${hash(`${id}${displayName}`)}`
          // Put together the final code again
          const call = buildStyledCall({
            STYLED: t.identifier(importedVariableName),
            TARGET: target,
            DISPLAYNAME: (addDisplayName && t.stringLiteral(displayName)) || t.identifier('undefined'),
            IDENTIFIER: (addIdentifier && t.stringLiteral(identifier)) || t.identifier('undefined')
          })
          // Put together the styled call with the template literal
          // to get the finished styled({ })`` form! 🎉
        	path.node.tag = call.expression
        }
      }
    }
  }
}
