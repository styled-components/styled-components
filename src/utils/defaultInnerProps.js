// @flow

/* This is used for taking a component's PropTypes and turning into
 * an innerProps mask. */
import type { Target } from '../types'
import isTag from './isTag'

export default (target: Target) => {
  const obj = { default: false }
  if (!isTag(target)) Object.keys(target.propTypes || {}).forEach(k => { obj[k] = true })
  return obj
}
