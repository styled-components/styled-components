import * as t from 'babel-types'
import { isStyled, isCSSHelper, isKeyframesHelper } from '../../utils/detectors'
import preprocess from '../../css/preprocess'
import preprocessKeyframes from '../../css/preprocessKeyframes'

export default (path, state) => {
  const _isStyled = isStyled(path.node.tag, state)
  const _isCSSHelper = isCSSHelper(path.node.tag, state)
  const _isKeyframesHelper = isKeyframesHelper(path.node.tag, state)

  if (
    _isStyled ||
    _isCSSHelper ||
    _isKeyframesHelper
  ) {
    const { tag: callee, quasi: { quasis, expressions }} = path.node
    const values = quasis.map(quasi => quasi.value.cooked)

    let result
    if (_isStyled || _isCSSHelper) {
      result = preprocess(values, expressions)
    } else {
      // _isKeyframesHelper
      result = preprocessKeyframes(values, expressions)
    }

    path.replaceWith(t.callExpression(callee, [ result ]))
  }
}
