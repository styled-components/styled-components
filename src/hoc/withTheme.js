// @flow
import React, { type ComponentType } from 'react'
import hoistStatics from 'hoist-non-react-statics'
import { ThemeConsumer, type Theme } from '../models/ThemeProvider'
import getComponentName from '../utils/getComponentName'
import determineTheme from '../utils/determineTheme'

export default (Component: ComponentType<any>) => {
  class WithTheme extends React.Component<*, *> {
    static displayName = `WithTheme(${getComponentName(Component)})`
    static defaultProps: Object

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

            const { forwardedRef, ...props } = this.props

            props.theme = themeProp
            if (forwardedRef) props.ref = forwardedRef

            return React.createElement(Component, props)
          }}
        </ThemeConsumer>
      )
    }
  }

  const ForwardRef = React.forwardRef((props, ref) => (
    <WithTheme {...props} forwardedRef={ref} />
  ))

  hoistStatics(ForwardRef, Component)

  return ForwardRef
}
