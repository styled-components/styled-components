// @flow
/* globals ReactClass */

import React from 'react'
import { polyfill } from 'react-lifecycles-compat'
import PropTypes from 'prop-types'
import hoistStatics from 'hoist-non-react-statics'
import {
  CHANNEL,
  CHANNEL_NEXT,
  CONTEXT_CHANNEL_SHAPE,
} from '../models/ThemeProvider'
import _isStyledComponent from '../utils/isStyledComponent'
import determineTheme from '../utils/determineTheme'

type State = {
  theme?: ?Object,
}

const wrapWithTheme = (Component: ReactClass<any>) => {
  const componentName = Component.displayName || Component.name || 'Component'
  const isStatelessFunctionalComponent =
    typeof Component === 'function' &&
    !(Component.prototype && 'isReactComponent' in Component.prototype)

  // NOTE: We can't pass a ref to a stateless functional component
  const shouldSetInnerRef =
    _isStyledComponent(Component) || isStatelessFunctionalComponent

  class WithTheme extends React.Component {
    static displayName = `WithTheme(${componentName})`

    // NOTE: This is so that isStyledComponent passes for the innerRef unwrapping
    static styledComponentId = 'withTheme'

    static contextTypes = {
      [CHANNEL]: PropTypes.func,
      [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
    }

    static getDerivedStateFromProps(
      nextProps: {
        theme?: ?Object,
        [key: string]: any,
      },
      prevState: State
    ) {
      const theme = determineTheme(
        nextProps,
        prevState.theme,
        WithTheme.defaultProps
      )

      return { theme }
    }

    styledContext = this.context[CHANNEL_NEXT]

    state: State = {
      theme:
        this.styledContext !== undefined
          ? this.styledContext.getTheme()
          : undefined,
    }
    unsubscribeId: number = -1

    componentDidMount() {
      if (
        this.state.theme === undefined &&
        process.env.NODE_ENV !== 'production'
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          '[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps'
        )
      } else if (this.styledContext !== undefined) {
        const { subscribe } = this.styledContext
        this.unsubscribeId = subscribe(nextTheme => {
          const theme = determineTheme(
            this.props,
            nextTheme,
            WithTheme.defaultProps
          )

          // Don't perform any actions if the actual resolved theme didn't change
          if (theme === this.state.theme) {
            return
          }

          this.setState({ theme })
        })
      }
    }

    componentWillUnmount() {
      if (this.unsubscribeId !== -1) {
        this.context[CHANNEL_NEXT].unsubscribe(this.unsubscribeId)
      }
    }

    render() {
      const props = {
        theme: this.state.theme,
        ...this.props,
      }

      if (!shouldSetInnerRef) {
        props.ref = props.innerRef
        delete props.innerRef
      }

      return <Component {...props} />
    }
  }

  polyfill(WithTheme)
  hoistStatics(WithTheme, Component)

  return WithTheme
}

export default wrapWithTheme
