// @flow

import React, { createContext, Component, type Element } from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import { Sheet } from 'styled-sheet';

import StyledError from '../utils/error';

type Props = {
  children?: Element<any>,
  sheet?: Sheet,
  target?: HTMLElement,
};

// Provide default Sheet to context
const StyleSheetContext = createContext(new Sheet());

export const StyleSheetConsumer = StyleSheetContext.Consumer;

export default class StyleSheetManager extends Component<Props> {
  static propTypes = {
    sheet: PropTypes.instanceOf(Sheet),
    target: PropTypes.shape({
      appendChild: PropTypes.func.isRequired,
    }),
  };

  getContext: (sheet: ?Sheet, target: ?HTMLElement) => Sheet;

  constructor(props: Props) {
    super(props);
    this.getContext = memoize(this.getContext);
  }

  getContext(sheet: ?Sheet, target: ?HTMLElement) {
    if (sheet) {
      return sheet;
    } else if (target) {
      return new Sheet(target);
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
