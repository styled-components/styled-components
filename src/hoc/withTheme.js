// @flow
/* globals ReactClass */
import hoistStatics from 'hoist-non-react-statics'
import React from 'react'
import { withTheme } from '../utils/theming'
import _isStyledComponent from '../utils/isStyledComponent'

export default (Component: ReactClass<any>) => {
  const isStyledComponent = _isStyledComponent(Component)
  const WithTheme = withTheme(({ innerRef, ...props }) => (
    <Component
      {...props}
      innerRef={isStyledComponent ? innerRef : undefined}
      ref={isStyledComponent ? undefined : innerRef}
    />
  ))
  return hoistStatics(WithTheme, Component)
}
