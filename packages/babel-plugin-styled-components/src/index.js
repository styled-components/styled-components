import template from 'babel-template'

import hash from './utils/hash'
import getTarget from './utils/get-target'

const buildStyledCall = template(`STYLED({
  target: TARGET,
  displayName: DISPLAYNAME,
  identifier: IDENTIFIER
})`)

let id = 0

export default function({ types: t }) {
  return {
    visitor: {
      Program(path, state) {
        // Default imported variable name to "styled", adjust based on import below
        let importedVariableName = 'styled'

        const isStyled = (tag) => (tag.object && tag.object.name === importedVariableName) || (tag.callee && tag.callee.name === importedVariableName)

        path.traverse({
          ImportDeclaration: {
            enter(path) {
              // Is the styled-components import!
              if (path.node.source.value === 'styled-components') {
                // If the default is imported it's at defaultImport[0], otherwise defaultImport is empty
                const defaultImport = path.get('specifiers').find((specifier) => {
                  return specifier.isImportDefaultSpecifier() || specifier.isImportSpecifier() && specifier.node.imported.name === 'default'
                })
                if (defaultImport) {
                  // Save the imported name
                  importedVariableName = defaultImport.node.local.name
                }
              }
            }
          }
        })

        path.traverse({
          TaggedTemplateExpression(path, { opts, file }) {
            const addDisplayName = (opts.displayName === undefined || opts.displayName === null) ? true : opts.displayName
            const addIdentifier = (opts.ssr === undefined || opts.ssr === null) ? true : opts.ssr
            const useFileName = (opts.fileName === undefined || opts.fileName === null) ? true : opts.fileName

            const tag = path.node.tag

            if (!isStyled(tag)) return

            let namedNode

            path.find((path) => {
              // const X = styled
              if (path.isAssignmentExpression()) {
                namedNode = path.node.left
              // const X = { Y: styled }
              } else if (path.isObjectProperty()) {
                namedNode = path.node.key
              // let X; X = styled
              } else if (path.isVariableDeclarator()) {
                namedNode = path.node.id
              } else if (path.isStatement()) {
                // we've hit a statement, we should stop crawling up
                return true
              }

              // we've got an displayName (if we need it) no need to continue
              if (namedNode) return true
            })

            // foo.bar -> bar
            if (t.isMemberExpression(namedNode)) {
              namedNode = namedNode.property
            }

            // Get target
            const target = getTarget(path.node.tag)

            // identifiers are the only thing we can reliably get a name from
            const componentName = t.isIdentifier(namedNode) ? namedNode.name : undefined

            let displayName

            if (!useFileName) {
              displayName = componentName
            } else {
              let blockName = file.opts.basename
              if (blockName === 'index') {
                blockName = path.basename(path.dirname(file.opts.filename))
              }
              displayName = componentName ? `${blockName}__${namedNode.name}` : blockName
            }

            id++
            // Prefix the identifier with a character if no displayName exists because CSS classes cannot start with a number
            const identifier = `${displayName || 's'}-${hash(`${id}${displayName}`)}`
            // Put together the final code again
            const call = buildStyledCall({
              STYLED: t.identifier(importedVariableName),
              TARGET: target,
              DISPLAYNAME: (addDisplayName && displayName && t.stringLiteral(displayName)) || t.identifier('undefined'),
              IDENTIFIER: (addIdentifier && identifier && t.stringLiteral(identifier)) || t.identifier('undefined')
            })
            // Put together the styled call with the template literal
            // to get the finished styled({ })`` form! 🎉
            path.node.tag = call.expression
          }
        }, state)
      }
    }
  }
}
