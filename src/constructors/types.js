// @flow

import { PropTypes } from 'react'

const type = checker => ({
  checker,
  opts: {},
  get passed() {
    this.opts = { ...this.opts, passed: true }
    return this
  },
})

export default {
  any: type(PropTypes.any),
  bool: type(PropTypes.bool),
}
