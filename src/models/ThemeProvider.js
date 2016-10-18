import React, { PropTypes, Component } from 'react'
import isFunction from 'lodash/isFunction'
import isPlainObject from 'lodash/isPlainObject'
import createBroadcast from '../utils/create-broadcast'

// NOTE: DO NOT CHANGE, changing this is a semver major change!
export const CHANNEL = '__styled-components__'

/**
 * Provide a theme to an entire react component tree via context and event listeners (have to do
 * both context and event emitter as pure components block context updates)
 */
class ThemeProvider extends Component {
  constructor() {
    super()
    this.getTheme = this.getTheme.bind(this)
  }

  componentWillMount() {
    // If there is a ThemeProvider wrapper anywhere around this theme provider, merge this theme
    // with the outer theme
    if (this.context[CHANNEL]) {
      const subscribe = this.context[CHANNEL]
      this.unsubscribeToOuter = subscribe(theme => {
        this.outerTheme = theme
      })
    }
    this.broadcast = createBroadcast(this.getTheme())
  }

  getChildContext() {
    return Object.assign({}, this.context, { [CHANNEL]: this.broadcast.subscribe })
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.theme !== nextProps.theme) this.broadcast.publish(this.getTheme(nextProps.theme))
  }

  componentWillUnmount() {
    if (this.context[CHANNEL]) {
      this.unsubscribeToOuter()
    }
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
  [CHANNEL]: PropTypes.func.isRequired,
}
ThemeProvider.contextTypes = {
  [CHANNEL]: PropTypes.func,
}

export default ThemeProvider
