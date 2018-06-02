// @flow
import React, { Component, type Element } from 'react'
import PropTypes from 'prop-types'
import createBroadcast from '../utils/create-broadcast'
import type { Broadcast } from '../utils/create-broadcast'
import once from '../utils/once'

// NOTE: DO NOT CHANGE, changing this is a semver major change!
export const CHANNEL = '__styled-components__'
export const CHANNEL_NEXT = `${CHANNEL}next__`

export const CONTEXT_CHANNEL_SHAPE = PropTypes.shape({
  getTheme: PropTypes.func,
  subscribe: PropTypes.func,
  unsubscribe: PropTypes.func,
})

export type Theme = { [key: string]: mixed }
type ThemeProviderProps = {|
  children?: Element<any>,
  theme: Theme | ((outerTheme: Theme) => void),
|}

let warnChannelDeprecated
if (process.env.NODE_ENV !== 'production') {
  warnChannelDeprecated = once(() => {
    // eslint-disable-next-line no-console
    console.error(
      `Warning: Usage of \`context.${CHANNEL}\` as a function is deprecated. It will be replaced with the object on \`.context.${CHANNEL_NEXT}\` in a future version.`
    )
  })
}

const isFunction = test => typeof test === 'function'

/**
 * Provide a theme to an entire react component tree via context and event listeners (have to do
 * both context and event emitter as pure components block context updates)
 */
class ThemeProvider extends Component<ThemeProviderProps, void> {
  getTheme: (theme?: Theme | ((outerTheme: Theme) => void)) => Theme
  outerTheme: Theme
  unsubscribeToOuterId: string
  props: ThemeProviderProps
  broadcast: Broadcast
  unsubscribeToOuterId: number = -1

  constructor() {
    super()
    this.getTheme = this.getTheme.bind(this)
  }

  componentWillMount() {
    // If there is a ThemeProvider wrapper anywhere around this theme provider, merge this theme
    // with the outer theme
    const outerContext = this.context[CHANNEL_NEXT]
    if (outerContext !== undefined) {
      this.unsubscribeToOuterId = outerContext.subscribe(theme => {
        this.outerTheme = theme

        if (this.broadcast !== undefined) {
          this.publish(this.props.theme)
        }
      })
    }

    this.broadcast = createBroadcast(this.getTheme())
  }

  getChildContext() {
    return {
      ...this.context,
      [CHANNEL_NEXT]: {
        getTheme: this.getTheme,
        subscribe: this.broadcast.subscribe,
        unsubscribe: this.broadcast.unsubscribe,
      },
      [CHANNEL]: subscriber => {
        if (process.env.NODE_ENV !== 'production') {
          warnChannelDeprecated()
        }

        // Patch the old `subscribe` provide via `CHANNEL` for older clients.
        const unsubscribeId = this.broadcast.subscribe(subscriber)
        return () => this.broadcast.unsubscribe(unsubscribeId)
      },
    }
  }

  componentWillReceiveProps(nextProps: ThemeProviderProps) {
    if (this.props.theme !== nextProps.theme) {
      this.publish(nextProps.theme)
    }
  }

  componentWillUnmount() {
    if (this.unsubscribeToOuterId !== -1) {
      this.context[CHANNEL_NEXT].unsubscribe(this.unsubscribeToOuterId)
    }
  }

  // Get the theme from the props, supporting both (outerTheme) => {} as well as object notation
  getTheme(passedTheme: (outerTheme: Theme) => void | Theme) {
    const theme = passedTheme || this.props.theme
    if (isFunction(theme)) {
      const mergedTheme = theme(this.outerTheme)
      if (
        process.env.NODE_ENV !== 'production' &&
        (mergedTheme === null ||
          Array.isArray(mergedTheme) ||
          typeof mergedTheme !== 'object')
      ) {
        throw new Error(
          process.env.NODE_ENV !== 'production'
            ? '[ThemeProvider] Please return an object from your theme function, i.e. theme={() => ({})}!'
            : ''
        )
      }
      return mergedTheme
    }
    if (theme === null || Array.isArray(theme) || typeof theme !== 'object') {
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? '[ThemeProvider] Please make your theme prop an object'
          : ''
      )
    }
    return { ...this.outerTheme, ...(theme: Object) }
  }

  publish(theme: Theme | ((outerTheme: Theme) => void)) {
    this.broadcast.publish(this.getTheme(theme))
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
ThemeProvider.contextTypes = {
  [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
}

export default ThemeProvider
