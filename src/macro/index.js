/* eslint-disable flowtype/require-valid-file-annotation */
import { createMacro, MacroError } from 'babel-plugin-macros'
import minify from 'babel-plugin-styled-components/lib/visitors/minify'
import displayNameAndId from 'babel-plugin-styled-components/lib/visitors/displayNameAndId'
import templateLiteral from 'babel-plugin-styled-components/lib/visitors/templateLiterals'
import pureAnnotation from 'babel-plugin-styled-components/lib/visitors/pure'

const allowedImports = ['default', 'css', 'keyframes']

function styledComponentsMacro({
  references,
  state,
  babel: { types: t },
  config = {},
}) {
  // create a node for styled-components's imports
  const program = state.file.path
  const imports = t.importDeclaration([], t.stringLiteral('styled-components'))
  // and add it to top of the document
  program.node.body.unshift(imports)

  // references looks like this
  // { default: [path, path], css: [path], ... }
  Object.keys(references).forEach(refName => {
    if (!allowedImports.includes(refName)) {
      throw new MacroError(
        `Invalid import: ${refName}. You can only import ${allowedImports.join(
          ', '
        )} from 'styled-components/macro'.`
      )
    }

    // add imports
    let id
    if (refName === 'default') {
      id = program.scope.generateUidIdentifier('styled')
      imports.specifiers.push(t.importDefaultSpecifier(id))
    } else {
      id = program.scope.generateUidIdentifier(refName)
      imports.specifiers.push(t.importSpecifier(id, t.identifier(refName)))
    }

    references[refName].forEach(referencePath => {
      // transform the variable imported for the macro
      // into the new id generated
      // eslint-disable-next-line no-param-reassign
      referencePath.node.name = id.name

      // find the TaggedTemplateExpression
      const templatePath = referencePath.findParent(path =>
        path.isTaggedTemplateExpression()
      )
      // merge config into the state
      const stateWithOpts = { ...state, opts: config }
      // run babel-plugin-styled-components appropriate visitors
      minify(t)(templatePath, stateWithOpts)
      displayNameAndId(t)(templatePath, stateWithOpts)
      templateLiteral(t)(templatePath, stateWithOpts)
      pureAnnotation(t)(templatePath, stateWithOpts)
    })
  })
}

const configName = 'styledComponents'

export default createMacro(styledComponentsMacro, { configName })
