// @flow
import React, { type ComponentType } from 'react'
import hoistStatics from 'hoist-non-react-statics'
import { ThemeConsumer, type Theme } from '../models/ThemeProvider'
import getComponentName from '../utils/getComponentName'
import determineTheme from '../utils/determineTheme'

export default (Component: ComponentType<any>) => {
  const WithTheme = React.forwardRef((props, ref) => (
    <ThemeConsumer>
      {(theme?: Theme) => {
        // $FlowFixMe
        const { defaultProps } = WithTheme
        const themeProp = determineTheme(props, theme, defaultProps)

        if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
          // eslint-disable-next-line no-console
          console.warn(
            `[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class ${getComponentName(
              Component
            )}`
          )
        }

        return <Component {...props} theme={themeProp} ref={ref} />
      }}
    </ThemeConsumer>
  ))

  hoistStatics(WithTheme, Component)

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`

  return WithTheme
}
