import * as t from 'babel-types'

const importLocalName = (name, state) => {
  const imports = state.file.metadata.modules.imports
  const styledImports = imports.find(x => x.source === 'styled-components')
  if (styledImports) {
    const specifier = styledImports.specifiers.find(x => x.imported === name)
    if (specifier) {
      return specifier.local
    }
  }
  // import not found - return default name
  return name === 'default' ? 'styled' : name
}

export const isStyled = (node, state) => {
  const { tag } = node
  return (
    (t.isMemberExpression(tag) && tag.object.name === importLocalName('default', state)) ||
    (t.isCallExpression(tag) && tag.callee.name === importLocalName('default', state))
  )
}

export const isHelper = (node, state) => {
  const { tag } = node
  return t.isIdentifier(tag) && (
    tag.name === importLocalName('css', state) ||
    tag.name === importLocalName('keyframes', state)
  )
}
