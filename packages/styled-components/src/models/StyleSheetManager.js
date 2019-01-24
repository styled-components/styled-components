// @flow
import React, { useMemo, type Element } from 'react';
import PropTypes from 'prop-types';
import StyleSheet from './StyleSheet';
import ServerStyleSheet from './ServerStyleSheet';
import StyledError from '../utils/error';

type Props = {
  children?: Element<any>,
  sheet?: StyleSheet,
  target?: HTMLElement,
};

export const StyleSheetContext = React.createContext();

export const StyleSheetConsumer = StyleSheetContext.Consumer;

function getSheet(sheet?: StyleSheet, target?: HTMLElement): StyleSheet {
  if (sheet) {
    return sheet;
  } else if (target) {
    return new StyleSheet(target);
  } else {
    throw new StyledError(4);
  }
}

export default function StyleSheetManager(props: Props) {
  const sheet = useMemo(() => getSheet(props.sheet, props.target), [props.sheet, props.target]);

  return (
    <StyleSheetContext.Provider value={sheet}>
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
