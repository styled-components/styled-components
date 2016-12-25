import * as t from 'babel-types'
import { useMinify } from '../utils/options'
import { isStyled, isHelper } from '../utils/detectors'

export default (path, state, detector) => {
  if (useMinify(state) && (isStyled(path.node, state) || isHelper(path.node, state))) {
    const templateLiteral = path.node.quasi
    for (let element of templateLiteral.quasis) {
      element.value.raw = element.value.raw.replace(/(\\r|\\n|\r|\n)\s*/g, '')
      element.value.cooked = element.value.cooked.replace(/[\r\n]\s*/g, '')
    }
  }
}
