/* eslint-disable */
import { createMacro } from 'babel-macros'
import * as t from 'babel-types'
import minify from './visitors/minify'
import displayNameAndId from './visitors/displayNameAndId'
import templateLiteral from './visitors/templateLiterals'

const configName = 'styledComponents'

function styledComponentsMacro({ references, state, babel, config = {} }) {
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
    const path = referencePath.parentPath.parentPath
    referencePath.node.name = 'styled'
    state.opts = config
    if (path.type === 'TaggedTemplateExpression') {
      minify(path, state)
      displayNameAndId(path, state)
      templateLiteral(path, state)
    }
  })
}

module.exports = createMacro(styledComponentsMacro, { configName })