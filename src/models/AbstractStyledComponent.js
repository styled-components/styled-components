// @flow
import { Component, PropTypes } from 'react'

import { CHANNEL } from './ThemeProvider'

export default class AbstractStyledComponent extends Component {
  state: { theme: mixed }
  unsubscribe: () => void
  static isPrototypeOf: Function

  constructor() {
    super()
    this.state = {
      theme: null,
    }
  }

  componentWillMount() {
    // If there is a theme in the context, subscribe to the event emitter. This
    // is necessary due to pure components blocking context updates, this circumvents
    // that by updating when an event is emitted
    if (this.context[CHANNEL]) {
      const subscribe = this.context[CHANNEL]
      this.unsubscribe = subscribe(theme => {
              // This will be called once immediately
        this.setState({ theme })
      })
    }
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }

}
AbstractStyledComponent.contextTypes = {
  [CHANNEL]: PropTypes.func,
}
