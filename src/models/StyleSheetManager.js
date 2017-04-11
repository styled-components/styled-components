// @flow
import React, { Component } from 'react'
import { StyleSheet } from './BrowserStyleSheet'
import PropTypes from 'prop-types'

class StyleSheetManager extends Component {
  getChildContext() {
    return { StyleSheet: this.props.sheet }
  }

  render() {
    return React.Children.only(this.props.children)
  }
}

StyleSheetManager.childContextTypes = {
  StyleSheet: PropTypes.instanceOf(StyleSheet).isRequired,
}

export default StyleSheetManager
