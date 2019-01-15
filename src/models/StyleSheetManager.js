// @flow
import React, { createContext, Component, type Element } from 'react';
import memoize from 'memoize-one';
import StyleSheet from './StyleSheet';
import GlobalStyleSheet from './GlobalStyleSheet';
import StyledError from '../utils/error';

type Props = {
  children?: Element<any>,
  sheet?: StyleSheet,
  globalSheet?: GlobalStyleSheet,
  target?: HTMLElement,
};

export type StyleSheetContextType = {
  sheet?: StyleSheet,
  globalSheet?: GlobalStyleSheet,
};

const StyleSheetContext = createContext();

export const StyleSheetConsumer = StyleSheetContext.Consumer;

export default class StyleSheetManager extends Component<Props> {
  constructor(props: Props) {
    super(props);
    this.getContext = memoize(this.getContext);
  }

  getContext = (target: ?HTMLElement): StyleSheetContextType => {
    const { sheet, globalSheet } = this.props;
    if (sheet || globalSheet) {
      return { sheet, globalSheet };
    } else if (target) {
      return {
        sheet: new StyleSheet(target),
        globalSheet: new GlobalStyleSheet(target),
      };
    } else {
      throw new StyledError(4);
    }
  }

  render() {
    const { children, target } = this.props;

    return (
      <StyleSheetContext.Provider value={this.getContext(target)}>
        {process.env.NODE_ENV !== 'production' ? React.Children.only(children) : children}
      </StyleSheetContext.Provider>
    );
  }
}
