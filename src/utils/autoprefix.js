// @flow
import camelizeStyleName from 'fbjs/lib/camelizeStyleName'
import hyphenateStyleName from 'fbjs/lib/hyphenateStyleName'

// eslint-disable-next-line
import prefixAll from 'inline-style-prefixer/static'
import type Container from '../vendor/postcss/container'

export default (root: Container) => {
  root.walkDecls(decl => {
    /* No point even checking custom props */
    if (/^--/.test(decl.prop)) return

    const objStyle = { [camelizeStyleName(decl.prop)]: decl.value }
    const prefixed = prefixAll(objStyle)
    Object.keys(prefixed).reverse().forEach(newProp => {
      const newVals = prefixed[newProp]
      const newValArray = Array.isArray(newVals) ? newVals : [newVals]
      newValArray.forEach(newVal => {
        decl.cloneBefore({
          prop: hyphenateStyleName(newProp),
          value: newVal,
        })
      })
    })
    decl.remove()
  })
}
