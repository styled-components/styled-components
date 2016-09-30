// @flow
import uuid from 'node-uuid'
import css from './css'
import GlobalStyle from '../models/GlobalStyle'
import type { Interpolation } from '../types'

export default (strings: Array<string>, ...interpolations: Array<Interpolation>) => {
  const name = uuid.v4()
  const rules = css(strings, ...interpolations)
  const keyframes = new GlobalStyle(rules, `@keyframes ${name}`)
  keyframes.generateAndInject()
  return name
}
