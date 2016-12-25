import * as t from 'babel-types'
import { useMinify } from '../utils/options'
import { isStyled, isHelper } from '../utils/detectors'

export default (path, state) => {
  if (useMinify(state) && (isStyled(path.node.tag, state) || isHelper(path.node.tag, state))) {
    const templateLiteral = path.node.quasi
    for (let element of templateLiteral.quasis) {
      element.value.raw = element.value.raw.replace(/(\\r|\\n|\r|\n)\s*/g, '')
      element.value.cooked = element.value.cooked.replace(/[\r\n]\s*/g, '')
    }
  }
}
