/* eslint-disable flowtype/require-valid-file-annotation */
import { createMacro } from 'babel-plugin-macros'
import minify from 'babel-plugin-styled-components/lib/visitors/minify'
import displayNameAndId from 'babel-plugin-styled-components/lib/visitors/displayNameAndId'
import templateLiteral from 'babel-plugin-styled-components/lib/visitors/templateLiterals'

function styledComponentsMacro({
  references,
  state,
  babel: { types: t, template },
  config = {},
}) {
  // create a node for : 'import styled from styled-components'
  // and add it to top of the document
  const program = state.file.path
  const id = program.scope.generateUidIdentifier('styled')
  const declaration = template(`import VAR from 'styled-components'`, {
    sourceType: 'module',
  })({
    VAR: id,
  })
  program.node.body.unshift(declaration)

  // iterate over each call of the default import of 'styled-components/macro'
  references.default.forEach(referencePath => {
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
  })
}

const configName = 'styledComponents'

export default createMacro(styledComponentsMacro, { configName })
