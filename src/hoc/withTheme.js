// @flow
/* globals ReactClass */
import React from 'react'
import hoistStatics from 'hoist-non-react-statics'
import { themeListener } from '../utils/theming'
import type { Theme } from '../models/ThemeProvider'
import _isStyledComponent from '../utils/isStyledComponent'
import getComponentName from '../utils/getComponentName'

export default (Component: ReactClass<mixed>) => {
  const isStyledComponent = _isStyledComponent(Component)

  class WithTheme extends React.Component {
    static displayName = `withTheme(${getComponentName(Component)})`
    static contextTypes = themeListener.contextTypes

    state: {
      theme: Theme
    }
    props: any

    setTheme: (Theme) => void
    unsubscribe: () => void

    constructor(props, context) {
      super(props, context)
      this.state = {
        theme: themeListener.initial(context),
      }
      this.setTheme = this.setTheme.bind(this)
    }

    setTheme(theme) {
      this.setState({ theme })
    }

    componentDidMount() {
      this.unsubscribe = themeListener.subscribe(this.context, this.setTheme)
    }

    componentWillUnmount() {
      if (typeof this.unsubscribe === 'function') {
        this.unsubscribe()
      }
    }

    render() {
      const { theme } = this.state
      const { innerRef, ...props } = this.props

      return (<Component
        theme={theme}
        {...props}
        ref={isStyledComponent ? undefined : innerRef}
        innerRef={isStyledComponent ? innerRef : undefined}
      />)
    }
  }
  return hoistStatics(WithTheme, Component)
}
