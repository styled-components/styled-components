// @flow
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import StyleSheet from './StyleSheet'
import ServerStyleSheet from './ServerStyleSheet'
import { CONTEXT_KEY } from '../constants'
import StyledError from '../utils/error'

type Props = {
  sheet?: StyleSheet | null,
  target?: HTMLElement | null,
}

export default class StyleSheetManager extends Component<Props, void> {
  static childContextTypes = {
    [CONTEXT_KEY]: PropTypes.oneOfType([
      PropTypes.instanceOf(StyleSheet),
      PropTypes.instanceOf(ServerStyleSheet),
    ]).isRequired,
  }

  static propTypes = {
    sheet: PropTypes.oneOfType([
      PropTypes.instanceOf(StyleSheet),
      PropTypes.instanceOf(ServerStyleSheet),
    ]),
    target: PropTypes.shape({
      appendChild: PropTypes.func.isRequired,
    }),
  }

  sheetInstance: StyleSheet

  getChildContext() {
    return { [CONTEXT_KEY]: this.sheetInstance }
  }

  componentWillMount() {
    if (this.props.sheet) {
      this.sheetInstance = this.props.sheet
    } else if (this.props.target) {
      this.sheetInstance = new StyleSheet(this.props.target)
    } else {
      throw new StyledError(4)
    }
  }

  render() {
    /* eslint-disable react/prop-types */
    // Flow v0.43.1 will report an error accessing the `children` property,
    // but v0.47.0 will not. It is necessary to use a type cast instead of
    // a "fixme" comment to satisfy both Flow versions.
    return React.Children.only((this.props: any).children)
  }
}
