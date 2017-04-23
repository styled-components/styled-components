// @flow
import { Component } from 'react'
import PropTypes from 'prop-types'

import { CHANNEL } from './ThemeProvider'
import StyleSheet, { CONTEXT_KEY } from './StyleSheet'

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
  [CONTEXT_KEY]: PropTypes.instanceOf(StyleSheet),
}
