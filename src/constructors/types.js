// @flow

import { PropTypes } from 'react'

const type = (checker) => Object.create(checker, {
  isPassed: { value: false, writable: true },
  passed: { get() {
    this.isPassed = true
    return this
  } },
})

const types = {
  get array() { return type(PropTypes.array) },
  get bool() { return type(PropTypes.bool) },
  get func() { return type(PropTypes.func) },
  get number() { return type(PropTypes.number) },
  get object() { return type(PropTypes.object) },
  get string() { return type(PropTypes.string) },
  get symbol() { return type(PropTypes.symbol) },
  get any() { return type(PropTypes.any) },
  get element() { return type(PropTypes.element) },
  get node() { return type(PropTypes.node) },

  arrayOf(...args: any) { return type(PropTypes.arrayOf(...args)) },
  instanceOf(...args: any) { return type(PropTypes.instanceOf(...args)) },
  objectOf(...args: any) { return type(PropTypes.objectOf(...args)) },
  oneOf(...args: any) { return type(PropTypes.oneOf(...args)) },
  oneOfType(...args: any) { return type(PropTypes.oneOfType(...args)) },
  shape(...args: any) { return type(PropTypes.shape(...args)) },
}

export default types
