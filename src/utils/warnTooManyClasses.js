import styleSheet from '../models/StyleSheet'

const components = WeakMap ? new WeakMap() : undefined
const limit = 200

export default (ref, generatedClassName) => {
  // No support for WeakMap? Too bad.
  if (!components) return

  if (!components[ref]) {
    components[ref] = { generatedClasses: {}, warningSeen: false }
  }

  const state = components[ref]

  if (state.warningSeen) return

  state.generatedClasses[generatedClassName] = true
  if (Object.keys(state.generatedClasses).length > limit) {
    /* eslint-disable no-console */
    console.warn(`Over ${limit} classes was generated for component ${ref.displayName}. ` +
       'Consider using React\'s style property for styling based on frequently changed. ' +
       `Last generated style: ${styleSheet.rules().find(s => s.selectorText === `.${generatedClassName}`).cssText}`)
    state.generatedClasses = null
    state.warningSeen = true
  }
}
