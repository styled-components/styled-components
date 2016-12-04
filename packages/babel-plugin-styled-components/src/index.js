import hash from './utils/hash'
import getTarget from './utils/get-target'
import getName from './utils/get-name'

const blockName = (file) => {
  return file.opts.basename !== 'index' ?
    file.opts.basename :
    path.basename(path.dirname(file.opts.filename))
}

const getOption = (opts, name, defaultValue = true) => {
  return opts[name] === undefined || opts[name] === null ? defaultValue : opts[name]
}

let id = 0

export default function({ types: t }) {
  return {
    visitor: {
      Program(path, state) {
        // Default imported variable name to "styled", adjust based on import below
        let importedVariableName = 'styled'

        const isStyled = (tag) => (tag.object && tag.object.name === importedVariableName) || (tag.callee && tag.callee.name === importedVariableName)

        path.traverse({
          ImportDeclaration(path) {
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
        })

        const options = {
          displayName: getOption(state.opts, 'displayName'),
          ssr: getOption(state.opts, 'ssr'),
          fileName: getOption(state.opts, 'fileName'),
        }

        if (!options.ssr && !options.displayName) {
          return
        }

        path.traverse({
          TaggedTemplateExpression(path, { file }) {
            const tag = path.node.tag

            if (!isStyled(tag)) return

            // Get target
            const target = getTarget(path.node.tag)

            const componentName = getName(path)

            let displayName
            if (options.fileName) {
              displayName = componentName ? `${blockName(file)}__${componentName}` : blockName(file)
            } else {
              displayName = componentName
            }

            id++
            // Prefix the identifier with a character if no displayName exists because CSS classes cannot start with a number
            const identifier = `${displayName || 's'}-${hash(`${id}${displayName}`)}`

            // Put together the final code again
            const styledCallProps = [ t.objectProperty(t.identifier('target'), target) ]
            if (options.displayName && displayName) {
              styledCallProps.push(t.objectProperty(t.identifier('displayName'), t.stringLiteral(displayName)))
            }
            if (options.ssr && identifier) {
              styledCallProps.push(t.objectProperty(t.identifier('identifier'), t.stringLiteral(identifier)))
            }

            const call = t.callExpression(
              t.identifier(importedVariableName),
              [ t.objectExpression(styledCallProps) ]
            )

            // Put together the styled call with the template literal
            // to get the finished styled({ })`` form! 🎉
            path.node.tag = call
          }
        }, state)
      }
    }
  }
}
