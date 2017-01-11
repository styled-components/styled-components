// @flow
/* globals ReactClass */

import React from 'react'
import { CHANNEL } from '../models/ThemeProvider'

export default (Component: ReactClass<mixed>) => class extends React.Component {
  static contextTypes = {
    [CHANNEL]: React.PropTypes.func,
  };

  state: { theme?: ?Object } = {};
  unsubscribe: () => void;

  componentWillMount() {
    if (!this.context[CHANNEL]) {
      throw new Error('[withTheme] Please use ThemeProvider to be able to use withTheme')
    }

    const subscribe = this.context[CHANNEL]
    this.unsubscribe = subscribe(theme => {
      this.setState({ theme })
    })
  }

  componentWillUnmount() {
    if (typeof this.unsubscribe === 'function') this.unsubscribe()
  }

  render() {
    const { theme } = this.state

    return <Component theme={theme} {...this.props} />
  }
}
