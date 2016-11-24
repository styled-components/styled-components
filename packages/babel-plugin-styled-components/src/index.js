import template from 'babel-template'

import hash from './utils/hash'
import getTarget from './utils/get-target'

const buildStyledCall = template(`styled({
  target: TARGET,
  displayName: DISPLAYNAME,
  identifier: IDENTIFIER
})`)

const isStyled = (tag) => (tag.object && tag.object.name == 'styled') || (tag.callee && tag.callee.name == 'styled')

let id = 0

export default function({ types: t }) {
  return {
    visitor: {
      TaggedTemplateExpression: {
        enter(path, { opts }) {
          const addDisplayName = (opts.displayName === undefined || opts.displayName === null) ? true : opts.displayName
          const addIdentifier = (opts.ssr === undefined || opts.ssr === null) ? true : opts.ssr
          const tag = path.node.tag

          if (!isStyled(tag)) return
          if (path._styledComponentsSeen) {
            return
          }

          let displayName, target

          path.find((path) => {
            // const X = styled
            if (path.isAssignmentExpression()) {
              target = getTarget(path.node.right.tag)
              displayName = path.node.left
            // const X = { Y: styled }
            } else if (path.isObjectProperty()) {
              target = getTarget(path.node.value.tag)
              displayName = path.node.key
            // let X; X = styled
            } else if (path.isVariableDeclarator()) {
              target = getTarget(path.node.init.tag)
              displayName = path.node.id
            } else if (path.isStatement()) {
              // we've hit a statement, we should stop crawling up
              return true
            }

            // we've got an displayName (if we need it) and a target! no need to continue
            if ((!addDisplayName || displayName) && target) return true
          })

          // foo.bar -> bar
          if (t.isMemberExpression(displayName)) {
            displayName = displayName.property
          }

          // styled call without variable
          if (!target) {
            target = getTarget(path.node.tag)
          }

          // identifiers are the only thing we can reliably get a name from
          if (!t.isIdentifier(displayName)) {
            displayName = undefined
          } else {
            displayName = displayName.name
          }

          id++
          // Prefix the identifier with a character if no displayName exists because CSS classes cannot start with a number
          const identifier = `${displayName || 's'}-${hash(`${id}${displayName}`)}`
          // Put together the final code again
          // Create the styled({ }) call
          const call = buildStyledCall({
            TARGET: target,
            DISPLAYNAME: (addDisplayName && t.stringLiteral(displayName)) || t.identifier('undefined'),
            IDENTIFIER: (addIdentifier && t.stringLiteral(identifier)) || t.identifier('undefined')
          })
          // Put together the styled call with the template literal
          // to get the finished styled({ })`` form! 🎉
          const styledCall = t.taggedTemplateExpression(
            call.expression,
            path.node.quasi
          )
          path._styledComponentsSeen = true

          path.replaceWith(styledCall)
        }
      }
    }
  }
}
