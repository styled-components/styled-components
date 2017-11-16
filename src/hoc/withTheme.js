// @flow
/* globals ReactClass */

import React from 'react'
import PropTypes from 'prop-types'
import hoistStatics from 'hoist-non-react-statics'
import { CHANNEL, CHANNEL_NEXT, CONTEXT_CHANNEL_SHAPE } from '../models/ThemeProvider'
import _isStyledComponent from '../utils/isStyledComponent'
import determineTheme from '../utils/determineTheme'

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

    constructor(props, context) {
      super(props, context)
      const { defaultProps } = this.constructor
      const styledContext = context[CHANNEL_NEXT]
      const themeProp = determineTheme(props, undefined, defaultProps)

      if (
          styledContext === undefined &&
          themeProp === undefined &&
          process.env.NODE_ENV !== 'production'
      ) {
        // eslint-disable-next-line no-console
        console.warn('[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps')
      } else if (styledContext === undefined && themeProp !== undefined) {
        this.state = {
          theme: themeProp,
        }
      } else {
        const { subscribe, currentTheme } = styledContext
        this.state = {
          theme: currentTheme(),
        }

        this.unsubscribeId = subscribe(this.updateTheme)
      }
    }

    updateTheme = nextTheme => {
      const theme = determineTheme(this.props, nextTheme, this.constructor.defaultProps)
      if (theme !== this.state.theme) {
        this.setState({ theme })
      }
    }

    componentWillReceiveProps(nextProps: { theme?: Object, [key: string]: any }) {
      const { defaultProps } = this.constructor
      const theme = determineTheme(nextProps, this.state.theme, defaultProps)
      if (theme !== this.state.theme) {
        this.setState({ theme })
      }
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
