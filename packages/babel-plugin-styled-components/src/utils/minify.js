import * as t from 'babel-types'

export default (teplateLiteral) => {
  for (let element of teplateLiteral.quasis) {
    element.value.raw = element.value.raw.replace(/(\\r|\\n|\r|\n)\s*/g, '')
    element.value.cooked = element.value.cooked.replace(/[\r\n]\s*/g, '')
  }
}
