// @flow

import { PropTypes } from 'react'

const type = (checker, opts = {}) => ({
  checker,
  opts,
  get passed() {
    return type(checker, { ...opts, passed: true })
  },

  get array() { return type(PropTypes.array, opts) },
  get bool() { return type(PropTypes.bool, opts) },
  get func() { return type(PropTypes.func, opts) },
  get number() { return type(PropTypes.number, opts) },
  get object() { return type(PropTypes.object, opts) },
  get string() { return type(PropTypes.string, opts) },
  // $FlowFixMe nfi why it doesn't realise this exists.
  get symbol() { return type(PropTypes.symbol, opts) },
  get any() { return type(PropTypes.any, opts) },
  get element() { return type(PropTypes.element, opts) },
  get node() { return type(PropTypes.node, opts) },
  arrayOf(...args: any) { return type(PropTypes.arrayOf(...args), opts) },
  instanceOf(...args: any) { return type(PropTypes.instanceOf(...args), opts) },
  objectOf(...args: any) { return type(PropTypes.objectOf(...args), opts) },
  oneOf(...args: any) { return type(PropTypes.oneOf(...args), opts) },
  oneOfType(...args: any) { return type(PropTypes.oneOfType(...args), opts) },
  shape(...args: any) { return type(PropTypes.shape(...args), opts) },
})

export default type({ checker: PropTypes.any })
