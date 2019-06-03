// @flow
import React, { createContext, Component, type Element } from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import StyleSheet from './StyleSheet';
import ServerStyleSheet from './ServerStyleSheet';
import StyledError from '../utils/error';

type Props = {
  children?: Element<any>,
  sheet?: StyleSheet,
  target?: HTMLElement,
};

export const StyleSheetContext = createContext();
export const StyleSheetConsumer = StyleSheetContext.Consumer;

export default class StyleSheetManager extends Component<Props> {
  static propTypes = {
    sheet: PropTypes.oneOfType([
      PropTypes.instanceOf(StyleSheet),
      PropTypes.instanceOf(ServerStyleSheet),
    ]),

    target: PropTypes.shape({
      appendChild: PropTypes.func.isRequired,
    }),
  };

  getContext: (sheet: ?StyleSheet, target: ?HTMLElement) => StyleSheet;

  constructor(props: Props) {
    super(props);
    this.getContext = memoize(this.getContext);
  }

  getContext(sheet: ?StyleSheet, target: ?HTMLElement) {
    if (sheet) {
      return sheet;
    } else if (target) {
      return new StyleSheet(target);
    } else {
      throw new StyledError(4);
    }
  }

  render() {
    const { children, sheet, target } = this.props;

    return (
      <StyleSheetContext.Provider value={this.getContext(sheet, target)}>
        {process.env.NODE_ENV !== 'production' ? React.Children.only(children) : children}
      </StyleSheetContext.Provider>
    );
  }
}
