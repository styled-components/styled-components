import React, { PropTypes, Component } from 'react'
import { isFunction, isPlainObject } from 'lodash'
import { Broadcast } from 'react-broadcast'

class ThemeProvider extends Component {
  constructor() {
    super()
    this.getTheme = this.getTheme.bind(this)
  }

  getTheme() {
    if (isFunction(this.props.theme)) {
      const mergedTheme = this.props.theme(this.context.theme)
      if (!isPlainObject(mergedTheme)) {
        throw new Error('[ThemeProvider] Please return an object from your theme function, i.e. theme={() => ({})}!')
      }
      return { theme: mergedTheme }
    }
    return { theme: Object.assign({}, this.context.theme, this.props.theme) }
  }

  render() {
    return (
      <Broadcast channel="styled-components" value={this.getTheme()}>
        {this.props.children}
      </Broadcast>
    )
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
  theme: PropTypes.object,
}
ThemeProvider.contextTypes = {
  theme: PropTypes.object,
}

export default ThemeProvider
