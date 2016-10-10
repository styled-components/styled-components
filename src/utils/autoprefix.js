import camelizeStyleName from 'fbjs/lib/camelizeStyleName'
import hyphenateStyleName from 'fbjs/lib/hyphenateStyleName'
import { autoprefix } from 'glamor/lib/autoprefix'

export default root => {
  root.walkDecls(decl => {
    const objStyle = { [camelizeStyleName(decl.prop)]: decl.value }
    const prefixed = autoprefix(objStyle)
    Object.keys(prefixed).reverse().forEach(newProp => {
      decl.cloneBefore({
        prop: hyphenateStyleName(newProp),
        value: prefixed[newProp],
      })
    })
    decl.remove()
  })
}
