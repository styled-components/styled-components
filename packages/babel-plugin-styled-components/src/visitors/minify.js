import * as t from 'babel-types'
import { useMinify } from '../utils/options'

export default (path, state, detector) => {
  if (useMinify(state) && (detector.isStyled(path.node) || detector.isHelper(path.node))) {
    const templateLiteral = path.node.quasi
    for (let element of templateLiteral.quasis) {
      element.value.raw = element.value.raw.replace(/(\\r|\\n|\r|\n)\s*/g, '')
      element.value.cooked = element.value.cooked.replace(/[\r\n]\s*/g, '')
    }
  }
}
