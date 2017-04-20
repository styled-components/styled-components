// @flow
/* globals ReactClass */

import React from 'react'
import PropTypes from 'prop-types'
import hoistStatics from 'hoist-non-react-statics'
import { CHANNEL } from '../models/ThemeProvider'
import _isStyledComponent from '../utils/isStyledComponent'

const wrapWithTheme = (Component: ReactClass<any>) => {
  const componentName = (
    Component.displayName ||
    Component.name ||
    'Component'
  )

  const isStyledComponent = _isStyledComponent(Component)

  class WithTheme extends React.Component {
    static displayName = `WithTheme(${componentName})`

    // NOTE: This is so that isStyledComponent passes for the innerRef unwrapping
    static styledComponentId = 'withTheme'

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
      // eslint-disable-next-line react/prop-types
      const { innerRef } = this.props
      const { theme } = this.state

      return (
        <Component
          theme={theme}
          {...this.props}
          innerRef={isStyledComponent ? innerRef : undefined}
          ref={isStyledComponent ? undefined : innerRef}
        />
      )
    }
  }

  return hoistStatics(WithTheme, Component)
}

export default wrapWithTheme
