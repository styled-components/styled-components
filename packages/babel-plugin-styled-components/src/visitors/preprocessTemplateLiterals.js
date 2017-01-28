import * as t from 'babel-types'
import { isStyled, isHelper } from '../utils/detectors'
import preprocess from '../css/preprocess'

export default (path, state) => {
  if (isStyled(path.node.tag, state)) {
    const { tag: callee, quasi: { quasis, expressions }} = path.node
    const values = quasis.map(quasi => quasi.value.cooked)
    const result = preprocess(values, expressions)

    path.replaceWith(t.callExpression(callee, result))
  }
}
