// @flow
import css from './css'
import type { Interpolation, Target } from '../types'

export default (styledComponent: Function) => {
  const styled = (tag: Target) =>
    (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
      styledComponent(tag, css(strings, ...interpolations))

  const proxy = new Proxy(styled, {
    get(target: Function, name: string) {
      if (target.hasOwnProperty(name)) {
        return target[name]
      }

      return styled(name)
    },
  })

  return proxy
}
