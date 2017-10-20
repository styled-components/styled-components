/* eslint-disable */

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

export const isStyled = (tag, state) => {
  if (t.isCallExpression(tag) && t.isMemberExpression(tag.callee)) {
    // styled.something()
    return isStyled(tag.callee.object, state)
  } else {
    return (
      (t.isMemberExpression(tag) && tag.object.name === importLocalName('default', state)) ||
      (t.isCallExpression(tag) && tag.callee.name === importLocalName('default', state))
    )
  }
}

export const isCSSHelper = (tag, state) => (
  t.isIdentifier(tag) &&
  tag.name === importLocalName('css', state)
)

export const isInjectGlobalHelper = (tag, state) => (
  t.isIdentifier(tag) &&
  tag.name === importLocalName('injectGlobal', state)
)

export const isKeyframesHelper = (tag, state) => (
  t.isIdentifier(tag) &&
  tag.name === importLocalName('keyframes', state)
)

export const isHelper = (tag, state) => (
  isCSSHelper(tag, state) ||
  isKeyframesHelper(tag, state)
)

