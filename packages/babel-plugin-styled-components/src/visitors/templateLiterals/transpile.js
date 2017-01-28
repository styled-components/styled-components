import * as t from 'babel-types'
import { isStyled, isHelper } from '../../utils/detectors'

export default (path, state) => {
  if (
    isStyled(path.node.tag, state) ||
    isHelper(path.node.tag, state)
  ) {
    const { tag: callee, quasi: { quasis, expressions }} = path.node
    const values = t.arrayExpression(quasis.map(quasi => t.stringLiteral(quasi.value.cooked)))
    path.replaceWith(t.callExpression(callee, [ values, ...expressions ]))
  }
}
