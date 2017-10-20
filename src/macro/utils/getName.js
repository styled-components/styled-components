/* eslint-disable */

import * as t from 'babel-types'

/**
 * Get the name of variable that contains node
 *
 * @param  {Path} path to the node
 *
 * @return {String}   The target
 */

export default (path) => {
  let namedNode

  path.find((path) => {
    // const X = styled
    if (path.isAssignmentExpression()) {
      namedNode = path.node.left
    // const X = { Y: styled }
    } else if (path.isObjectProperty()) {
      namedNode = path.node.key
    // let X; X = styled
    } else if (path.isVariableDeclarator()) {
      namedNode = path.node.id
    } else if (path.isStatement()) {
      // we've hit a statement, we should stop crawling up
      return true
    }

    // we've got an displayName (if we need it) no need to continue
    if (namedNode) return true
  })

  // foo.bar -> bar
  if (t.isMemberExpression(namedNode)) {
    namedNode = namedNode.property
  }

  // identifiers are the only thing we can reliably get a name from
  return t.isIdentifier(namedNode) ? namedNode.name : undefined
}
