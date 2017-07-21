// @flow
import { Component } from 'react'
import PropTypes from 'prop-types'

import { CHANNEL, CHANNEL_NEXT, CONTEXT_CHANNEL_SHAPE } from './ThemeProvider'
import StyleSheet, { CONTEXT_KEY } from './StyleSheet'

export default class AbstractStyledComponent extends Component {
  static isPrototypeOf: Function
  state: {
    theme: any,
    generatedClassName?: string,
    generatedStyles?: any
  }

  unsubscribeId: number = -1

  unsubscribeFromContext() {
    const styledContext = this.context[CHANNEL_NEXT]
    if (styledContext) {
      styledContext.unsubscribe(this.unsubscribeId)
    }
  }
}

AbstractStyledComponent.contextTypes = {
  [CHANNEL]: PropTypes.func,
  [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
  [CONTEXT_KEY]: PropTypes.instanceOf(StyleSheet),
}
