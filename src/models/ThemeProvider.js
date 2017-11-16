// @flow
/* globals React$Element */
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import createBroadcast from '../utils/create-broadcast'
import type { Broadcast } from '../utils/create-broadcast'
import once from '../utils/once'

// NOTE: DO NOT CHANGE, changing this is a semver major change!
export const CHANNEL = '__styled-components__'
export const CHANNEL_NEXT = `${CHANNEL}next__`

export const CONTEXT_CHANNEL_SHAPE = PropTypes.shape({
  getTheme: PropTypes.func, // slow, please avoid using
  subscribe: PropTypes.func,
  unsubscribe: PropTypes.func,
  currentTheme: PropTypes.func,
})

export type Theme = {[key: string]: mixed}
type ThemeProviderProps = {|
  children?: React$Element<any>,
  theme: Theme | (outerTheme: Theme) => void,
|}


const warnChannelDeprecated = once(() => {
  // eslint-disable-next-line no-console
  console.error(`Warning: Usage of \`context.${CHANNEL}\` as a function is deprecated. It will be replaced with the object on \`.context.${CHANNEL_NEXT}\` in a future version.`)
})
/**
 * Provide a theme to an entire react component tree via context and event listeners (have to do
 * both context and event emitter as pure components block context updates)
 */
class ThemeProvider extends Component {
  getTheme: (theme?: Theme | (outerTheme: Theme) => void) => Theme
  outerTheme: Theme
  unsubscribeToOuterId: string
  props: ThemeProviderProps
  broadcast: Broadcast
  unsubscribeToOuterId: number = -1

  constructor(props) {
    super(props)
    this.getTheme = this.getTheme.bind(this)
    this.broadcast = createBroadcast(this.getTheme(props.theme))
  }

  getChildContext() {
    return {
      ...this.context,
      [CHANNEL_NEXT]: {
        getTheme: this.getTheme,
        subscribe: this.broadcast.subscribe,
        unsubscribe: this.broadcast.unsubscribe,
        currentTheme: this.broadcast.currentState,
      },
      [CHANNEL]: (subscriber) => {
        warnChannelDeprecated()

        // Patch the old `subscribe` provide via `CHANNEL` for older clients.
        const unsubscribeId = this.broadcast.subscribe(subscriber)
        return () => this.broadcast.unsubscribe(unsubscribeId)
      },
    }
  }

  componentWillReceiveProps(nextProps: ThemeProviderProps) {
    if (this.props.theme !== nextProps.theme) this.broadcast.publish(this.getTheme(nextProps.theme))
  }

  // Get the theme from the props, supporting both (outerTheme) => {} as well as object notation
  getTheme(passedTheme: (outerTheme: Theme) => void | Theme) {
    const theme = passedTheme || this.props.theme
    return theme
  }

  render() {
    if (!this.props.children) {
      return null
    }
    return React.Children.only(this.props.children)
  }
}

ThemeProvider.childContextTypes = {
  [CHANNEL]: PropTypes.func, // legacy
  [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
}

export default ThemeProvider
