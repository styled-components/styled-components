// @flow
import { PropTypes, Component, Children } from 'react'
import { isFunction, isPlainObject } from 'lodash'

class ThemeProvider extends Component {
  getChildContext() {
    if (isFunction(this.props.theme)) {
      const mergedTheme = this.props.theme(this.context.theme)
      if (!isPlainObject(mergedTheme)) {
        throw new Error('[ThemeProvider] Please return an object from your theme function, i.e. theme={() => ({})}!')
      }
      return { theme: mergedTheme }
    }
    return { theme: Object.assign({}, this.context.theme, this.props.theme) }
  }

  render() { return Children.only(this.props.children) }
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
