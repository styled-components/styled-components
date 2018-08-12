// @flow
import React, { type ComponentType } from 'react'
import hoistStatics from 'hoist-non-react-statics'
import { ThemeConsumer, type Theme } from '../models/ThemeProvider'
import getComponentName from '../utils/getComponentName'
import _isStyledComponent from '../utils/isStyledComponent'
import determineTheme from '../utils/determineTheme'

export default (Component: ComponentType<any>) => {
  const isStatelessFunctionalComponent =
    typeof Component === 'function' &&
    // $FlowFixMe TODO: flow for prototype
    !(Component.prototype && 'isReactComponent' in Component.prototype)

  // NOTE: We can't pass a ref to a stateless functional component
  const shouldSetInnerRef =
    _isStyledComponent(Component) || isStatelessFunctionalComponent

  class WithTheme extends React.Component<*, *> {
    static displayName = `WithTheme(${getComponentName(Component)})`
    static defaultProps: Object

    // NOTE: This is so that isStyledComponent passes for the innerRef unwrapping
    static styledComponentId = 'withTheme'

    render() {
      return (
        <ThemeConsumer>
          {(theme?: Theme) => {
            const { defaultProps } = this.constructor
            const themeProp = determineTheme(this.props, theme, defaultProps)

            if (
              themeProp === undefined &&
              process.env.NODE_ENV !== 'production'
            ) {
              // eslint-disable-next-line no-console
              console.warn(
                '[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps'
              )
            }

            const props = {
              theme: themeProp,
              ...this.props,
            }

            if (!shouldSetInnerRef) {
              props.ref = props.innerRef
              delete props.innerRef
            }

            return React.createElement(Component, props)
          }}
        </ThemeConsumer>
      )
    }
  }

  return hoistStatics(WithTheme, Component)
}
