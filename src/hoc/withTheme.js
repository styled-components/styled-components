// @flow
/* globals ReactClass */

import React from 'react'
import PropTypes from 'prop-types'
import hoistStatics from 'hoist-non-react-statics'
import { CHANNEL, CHANNEL_NEXT, CONTEXT_CHANNEL_SHAPE } from '../models/ThemeProvider'
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
      [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
    };

    state: { theme?: ?Object } = {};
    unsubscribeId: number = -1

    componentWillMount() {
      const styledContext = this.context[CHANNEL_NEXT]
      if (styledContext === undefined) {
        // eslint-disable-next-line no-console
        console.error('[withTheme] Please use ThemeProvider to be able to use withTheme')
        return
      }


      const { subscribe } = styledContext
      this.unsubscribeId = subscribe(theme => {
        this.setState({ theme })
      })
    }

    componentWillUnmount() {
      if (this.unsubscribeId !== -1) {
        this.context[CHANNEL_NEXT].unsubscribe(this.unsubscribeId)
      }
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
