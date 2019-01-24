// @flow
import React, { createContext, useMemo, type Element } from 'react';
import PropTypes from 'prop-types';
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

export default function StyleSheetManager(props: Props) {
  const styleSheet = useMemo(
    () => {
      if (props.sheet) {
        return props.sheet;
      } else if (props.target) {
        return new StyleSheet(props.target);
      } else {
        throw new StyledError(4);
      }
    },
    [props.sheet, props.target]
  );

  return (
    <StyleSheetContext.Provider value={styleSheet}>
      {process.env.NODE_ENV !== 'production' ? React.Children.only(props.children) : props.children}
    </StyleSheetContext.Provider>
  );
}

StyleSheetManager.propTypes = {
  sheet: PropTypes.oneOfType([
    PropTypes.instanceOf(StyleSheet),
    PropTypes.instanceOf(ServerStyleSheet),
  ]),
  target: PropTypes.shape({
    appendChild: PropTypes.func.isRequired,
  }),
};
