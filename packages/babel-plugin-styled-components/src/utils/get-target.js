import * as t from 'babel-types'

/**
 * Get the target (i.e. tagname or component variable) from a styled call
 *
 * @param  {Node} node
 *
 * @return {String}   The target
 */
const getTarget = (node) => {
  // styled.div`` => "div"
  if (t.isMemberExpression(node)) {
    return t.stringLiteral(node.property.name)
  }
  // styled(Bla) => Bla
  if (t.isCallExpression(node)) {
    return node.arguments[0]
  }
}

export default getTarget
