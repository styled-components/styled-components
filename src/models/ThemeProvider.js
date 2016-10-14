import React, { PropTypes, Component } from 'react'
import isFunction from 'lodash/isFunction'
import isPlainObject from 'lodash/isPlainObject'
import createBroadcast from '../utils/create-broadcast'

export const CHANNEL = '__styled-components__'

/**
 * Provide a theme to an entire react component tree via context and event listeners (have to do
 * both context and event emitter as pure components block context updates)
 */
class ThemeProvider extends Component {
  constructor() {
    super()
    this.getTheme = this.getTheme.bind(this)
    this.getBroadcastsContext = this.getBroadcastsContext.bind(this)
  }

  componentWillMount() {
    // If there is a ThemeProvider wrapper anywhere around this theme provider, merge this theme
    // with the outer theme
    if (this.context.broadcasts && this.context.broadcasts[CHANNEL]) {
      const subscribe = this.context.broadcasts[CHANNEL]
      this.unsubscribeToOuter = subscribe(theme => {
        this.outerTheme = theme
      })
    }
    this.broadcast = createBroadcast(this.getTheme())
  }

  getChildContext() {
    return {
      broadcasts: this.getBroadcastsContext(),
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.theme !== nextProps.theme) this.broadcast.publish(this.getTheme(nextProps.theme))
  }

  componentWillUnmount() {
    this.unsubscribeToOuter()
  }

  // Merge new broadcast with existing ones
  getBroadcastsContext() {
    return Object.assign({}, this.context.broadcasts, { [CHANNEL]: this.broadcast.subscribe })
  }

  // Get the theme from the props, supporting both (outerTheme) => {} as well as object notation
  getTheme(passedTheme) {
    const theme = passedTheme || this.props.theme
    if (isFunction(theme)) {
      const mergedTheme = theme(this.outerTheme)
      if (!isPlainObject(mergedTheme)) {
        throw new Error('[ThemeProvider] Please return an object from your theme function, i.e. theme={() => ({})}!')
      }
      return mergedTheme
    }
    if (!isPlainObject(theme)) {
      throw new Error('[ThemeProvider] Please make your theme prop a plain object')
    }
    return Object.assign({}, this.outerTheme, theme)
  }

  render() {
    if (!this.props.children) {
      return null
    }
    return React.Children.only(this.props.children)
  }
}

ThemeProvider.propTypes = {
  children: PropTypes.node,
  theme: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.object,
  ]),
}
ThemeProvider.childContextTypes = {
  broadcasts: PropTypes.object.isRequired,
}
ThemeProvider.contextTypes = {
  broadcasts: PropTypes.object,
}

export default ThemeProvider
