import isPlainObject from 'lodash/isPlainObject'

import ThemeAdapter from '../models/ThemeAdapter'

const adaptTheme = (adapter, components) => {
  /* Allow a single component but wrap it in an object */
  if (!isPlainObject(components)) {
    return adaptTheme(adapter, { component: components }).component
  }

  const result = {}
  Object.keys(components).forEach(key => {
    Object.defineProperty(result, key, {
      get() {
        return new ThemeAdapter(adapter, components[key])
      },
    })
  })
  return result
}

export default adaptTheme
