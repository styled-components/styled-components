// @flow
import React, { type ComponentType } from 'react'
import PropTypes from 'prop-types'
import hoistStatics from 'hoist-non-react-statics'
import {
  CHANNEL,
  CHANNEL_NEXT,
  CONTEXT_CHANNEL_SHAPE,
} from '../models/ThemeProvider'
import _isStyledComponent from '../utils/isStyledComponent'
import determineTheme from '../utils/determineTheme'

const wrapWithTheme = (Component: ComponentType<any>) => {
  const componentName = Component.displayName || Component.name || 'Component'
  const isStatelessFunctionalComponent =
    typeof Component === 'function' &&
    // $FlowFixMe TODO: flow for prototype
    !(Component.prototype && 'isReactComponent' in Component.prototype)

  // NOTE: We can't pass a ref to a stateless functional component
  const shouldSetInnerRef =
    _isStyledComponent(Component) || isStatelessFunctionalComponent

  class WithTheme extends React.Component<*, *> {
    static displayName = `WithTheme(${componentName})`
    static defaultProps: Object

    // NOTE: This is so that isStyledComponent passes for the innerRef unwrapping
    static styledComponentId = 'withTheme'

    static contextTypes = {
      [CHANNEL]: PropTypes.func,
      [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
    }

    state: { theme?: ?Object } = {}
    unsubscribeId: number = -1

    componentWillMount() {
      const { defaultProps } = this.constructor
      const styledContext = this.context[CHANNEL_NEXT]
      const themeProp = determineTheme(this.props, undefined, defaultProps)
      if (
        styledContext === undefined &&
        themeProp === undefined &&
        process.env.NODE_ENV !== 'production'
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          '[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps'
        )
      } else if (styledContext === undefined && themeProp !== undefined) {
        this.setState({ theme: themeProp })
      } else {
        const { subscribe } = styledContext
        this.unsubscribeId = subscribe(nextTheme => {
          const theme = determineTheme(this.props, nextTheme, defaultProps)
          this.setState({ theme })
        })
      }
    }

    componentWillReceiveProps(nextProps: {
      theme?: ?Object,
      [key: string]: any,
    }) {
      const { defaultProps } = this.constructor
      this.setState(oldState => {
        const theme = determineTheme(nextProps, oldState.theme, defaultProps)

        return { theme }
      })
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

  return hoistStatics(WithTheme, Component)
}

export default wrapWithTheme
