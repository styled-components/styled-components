// @flow
import { createMacro } from 'babel-macros'
import minify from 'babel-plugin-styled-components/lib/visitors/minify'
import displayNameAndId from 'babel-plugin-styled-components/lib/visitors/displayNameAndId'
import templateLiteral from 'babel-plugin-styled-components/lib/visitors/templateLiterals'

const configName = 'styledComponents'

function styledComponentsMacro({ references, state, babel, config = {} }) {
  const t = babel.types
  // add 'import styled from styled-components'
  const literal = config.preprocess ? 'styled-components/no-parser' : 'styled-components'
  state.file.path.parent.program.body.unshift(
    t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('styled'))],
      t.stringLiteral(literal),
    ),
  )
  // iterate over each call and modify the TaggedTemplateExpression
  references.default.forEach(referencePath => {
    const templatePath = referencePath.parentPath.parentPath
    const basePath = referencePath
    basePath.node.name = 'styled'
    const newState = {
      ...state,
      opts: config,
    }
    if (templatePath.type === 'TaggedTemplateExpression') {
      minify(templatePath, newState)
      displayNameAndId(templatePath, newState)
      templateLiteral(templatePath, newState)
    }
  })
}

module.exports = createMacro(styledComponentsMacro, { configName })
