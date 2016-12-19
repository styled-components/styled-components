import hash from './utils/hash'
import getTarget from './utils/get-target'
import getName from './utils/get-name'
import minify from './utils/minify'

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
        const importedVariableNames = {
          default: 'styled',
          css: 'css',
          keyframes: 'keyframes'
        }

        const isStyled = (tag) => (
          (t.isMemberExpression(tag) && tag.object.name === importedVariableNames.default) ||
          (t.isCallExpression(tag) && tag.callee.name === importedVariableNames.default)
        )

        const isHelper = (tag) => (
          t.isIdentifier(tag) && (
            tag.name === importedVariableNames.css ||
            tag.name === importedVariableNames.keyframes
          )
        )

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

        const options = {
          displayName: getOption(state.opts, 'displayName'),
          ssr: getOption(state.opts, 'ssr'),
          fileName: getOption(state.opts, 'fileName'),
          minify: getOption(state.opts, 'minify')
        }

        path.traverse({
          TaggedTemplateExpression(path, { file }) {
            const tag = path.node.tag
            if (options.minify && (isStyled(tag) || isHelper(tag))) {
              minify(path.node.quasi)
            }

            if (!(isStyled(tag) && (options.ssr || options.displayName))) return

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
              t.identifier(importedVariableNames.default),
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
