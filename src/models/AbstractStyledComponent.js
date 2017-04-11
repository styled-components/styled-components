// @flow
import { Component } from 'react'
import PropTypes from 'prop-types'

import { CHANNEL } from './ThemeProvider'

export default class AbstractStyledComponent extends Component {
  static isPrototypeOf: Function
  state: {
    theme: any,
    generatedClassName?: string,
    generatedStyles?: any
  }
  unsubscribe: () => void
}

AbstractStyledComponent.contextTypes = {
  [CHANNEL]: PropTypes.func,
}
