import React, { PropTypes, Component } from 'react'
import { isFunction, isPlainObject } from 'lodash'

export const CHANNEL = '__styled-components__'

const createBroadcast = (initialValue) => {
  let listeners = []
  let currentValue = initialValue

  return {
    publish(value) {
      currentValue = value
      listeners.forEach(listener => listener(currentValue))
    },
    subscribe(listener) {
      listeners.push(listener)

      // Publish to this subscriber once immediately.
      listener(currentValue)

      // eslint-disable-next-line no-return-assign
      return () =>
        listeners = listeners.filter(item => item !== listener)
    },
  }
}

class ThemeProvider extends Component {
  constructor() {
    super()
    this.getTheme = this.getTheme.bind(this)
    this.getBroadcastsContext = this.getBroadcastsContext.bind(this)
  }

  componentWillMount() {
    this.broadcast = createBroadcast(this.props.theme)
  }

  getChildContext() {
    return {
      broadcasts: this.getBroadcastsContext(),
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.theme !== nextProps.theme) this.broadcast.publish(nextProps.theme)
  }

  getBroadcastsContext() {
    const { broadcasts } = this.context

    return Object.assign({}, broadcasts, { [CHANNEL]: this.broadcast.subscribe })
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
