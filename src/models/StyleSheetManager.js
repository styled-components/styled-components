// @flow
import React, { createContext, Component } from 'react'
import PropTypes from 'prop-types'
import memoize from 'memoize-one'
import StyleSheet from './StyleSheet'
import ServerStyleSheet from './ServerStyleSheet'
import StyledError from '../utils/error'

type Props = {
  sheet?: StyleSheet | null,
  target?: HTMLElement | null,
}

const StyleSheetContext = createContext()

export const StyleSheetConsumer = StyleSheetContext.Consumer

export default class StyleSheetManager extends Component<Props, void> {
  static propTypes = {
    sheet: PropTypes.oneOfType([
      PropTypes.instanceOf(StyleSheet),
      PropTypes.instanceOf(ServerStyleSheet),
    ]),
    target: PropTypes.shape({
      appendChild: PropTypes.func.isRequired,
    }),
  }

  getContext: (sheet: ?StyleSheet, target: ?HTMLElement) => Object

  constructor(props: Props) {
    super(props)

    this.getContext = memoize(this.getContext.bind(this))
  }

  getContext(sheet: ?StyleSheet, target: ?HTMLElement) {
    if (sheet) {
      return { sheetInstance: sheet }
    } else if (target) {
      return { sheetInstance: new StyleSheet(target) }
    } else {
      throw new StyledError(4)
    }
  }

  render() {
    const { sheet, target } = this.props
    const context = this.getContext(sheet, target)
    // Flow v0.43.1 will report an error accessing the `children` property,
    // but v0.47.0 will not. It is necessary to use a type cast instead of
    // a "fixme" comment to satisfy both Flow versions.
    return (
      <StyleSheetContext.Provider value={context}>
        {React.Children.only((this.props: any).children)}
      </StyleSheetContext.Provider>
    )
  }
}
