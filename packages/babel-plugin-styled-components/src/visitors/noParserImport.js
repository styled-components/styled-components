import * as t from 'babel-types'
import { useCSSPreprocessor } from '../utils/options'

export const noParserImportDeclaration = (path, state) => {
  if (
    useCSSPreprocessor(state) &&
    path.node.source.value === 'styled-components'
  ) {
    path.node.source = t.stringLiteral('styled-components/no-parser')
  }
}

export const noParserRequireCallExpression = (path, state) => {
  if (
    useCSSPreprocessor(state) &&
    path.node.callee.name === 'require' &&
    path.node.arguments &&
    path.node.arguments.length === 1 &&
    t.isStringLiteral(path.node.arguments[0]) &&
    path.node.arguments[0].value === 'styled-components'
  ) {
    path.node.arguments = [t.stringLiteral('styled-components/no-parser')]
  }
}
