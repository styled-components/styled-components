// @flow
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import StyleSheet from './StyleSheet'

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
StyleSheetManager.propTypes = {
  sheet: PropTypes.instanceOf(StyleSheet).isRequired,
  children: React.PropTypes.element.isRequired,
}

export default StyleSheetManager
