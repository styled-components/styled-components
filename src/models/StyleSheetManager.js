// @flow
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import StyleSheet, { CONTEXT_KEY } from './StyleSheet'

class StyleSheetManager extends Component {
  getChildContext() {
    return { [CONTEXT_KEY]: this.props.sheet }
  }

  render() {
    /* eslint-disable react/prop-types */
    // Flow v0.43.1 will report an error accessing the `children` property,
    // but v0.47.0 will not. It is necessary to use a type cast instead of
    // a "fixme" comment to satisfy both Flow versions.
    return React.Children.only((this.props: any).children)
  }
}

StyleSheetManager.childContextTypes = {
  [CONTEXT_KEY]: PropTypes.instanceOf(StyleSheet).isRequired,
}

StyleSheetManager.propTypes = {
  sheet: PropTypes.instanceOf(StyleSheet).isRequired,
}

export default StyleSheetManager
