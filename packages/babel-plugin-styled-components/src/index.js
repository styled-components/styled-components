import minify from './visitors/minify'
import displayNameAndId from './visitors/displayNameAndId'

export default function({ types: t }) {
  return {
    visitor: {
      Program(path, state) {
        const importedVariableNames = {
          default: 'styled',
          css: 'css',
          keyframes: 'keyframes'
        }

        path.traverse({
          ImportDeclaration(path) {
            // Is the styled-components import!
            if (path.node.source.value === 'styled-components') {
              path.get('specifiers').forEach((specifier) => {
                let importedName
                if (specifier.isImportDefaultSpecifier()) {
                  importedName = 'default'
                } else if (specifier.isImportSpecifier()) {
                  importedName = specifier.node.imported.name
                }
                if (importedVariableNames.hasOwnProperty(importedName)) {
                  importedVariableNames[importedName] = specifier.node.local.name
                }
              })
            }
          }
        })

        const detector = {
          isStyled({ tag }) {
            return (
              (t.isMemberExpression(tag) && tag.object.name === importedVariableNames.default) ||
              (t.isCallExpression(tag) && tag.callee.name === importedVariableNames.default)
            )
          },
          isHelper({ tag }) {
            return t.isIdentifier(tag) && (
              tag.name === importedVariableNames.css ||
              tag.name === importedVariableNames.keyframes
            )
          }
        }

        path.traverse({
          TaggedTemplateExpression(path, state) {
            minify(path, state, detector)
            displayNameAndId(path, state, detector)
          }
        }, state)
      }
    }
  }
}
