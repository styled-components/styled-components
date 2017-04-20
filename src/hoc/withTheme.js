// @flow
/* globals ReactClass */

import React from 'react'
import PropTypes from 'prop-types'
import hoistStatics from 'hoist-non-react-statics'
import { CHANNEL } from '../models/ThemeProvider'

const wrapWithTheme = (Component: ReactClass<any>) => {
  const componentName = (
    Component.displayName ||
    Component.name ||
    'Component'
  )

  class WithTheme extends React.Component {
    static displayName = `WithTheme(${componentName})`

    static contextTypes = {
      [CHANNEL]: PropTypes.func,
    };

    state: { theme?: ?Object } = {};
    unsubscribe: () => void;

    componentWillMount() {
      if (!this.context[CHANNEL]) {
        throw new Error('[withTheme] Please use ThemeProvider to be able to use withTheme')
      }

      const subscribe = this.context[CHANNEL]
      this.unsubscribe = subscribe(theme => {
        this.setState({ theme })
      })
    }

    componentWillUnmount() {
      if (typeof this.unsubscribe === 'function') this.unsubscribe()
    }

    render() {
      const { theme } = this.state

      return <Component theme={theme} {...this.props} />
    }
  }

  return hoistStatics(WithTheme, Component)
}

export default wrapWithTheme
