// @flow

import React, { useContext, useMemo, useDebugValue, type Node, type Context } from 'react';
import PropTypes from 'prop-types';
import ServerStyleSheet from './ServerStyleSheet';
import StyleSheet from '../sheet';
import StyledError from '../utils/error';

type Props = {
  children?: Node,
  sheet?: StyleSheet,
  target?: HTMLElement,
};

export const StyleSheetContext: Context<StyleSheet | void> = React.createContext();
export const StyleSheetConsumer = StyleSheetContext.Consumer;
export const masterSheet: StyleSheet = new StyleSheet(false);

export function useStyleSheet(): StyleSheet {
  const fromContext = useContext(StyleSheetContext);
  return fromContext !== undefined ? fromContext : masterSheet;
}

function useStyleSheetProvider(sheet?: StyleSheet, target?: HTMLElement) {
  return useMemo(() => {
    if (sheet) {
      return sheet;
    } else if (target) {
      return new StyleSheet(false, target);
    } else {
      throw new StyledError(4);
    }
  }, [sheet, target]);
}

export default function StyleSheetManager(props: Props) {
  const sheet = useStyleSheetProvider(props.sheet, props.target);

  return (
    <StyleSheetContext.Provider value={sheet}>
      {process.env.NODE_ENV !== 'production' ? React.Children.only(props.children) : props.children}
    </StyleSheetContext.Provider>
  );
}

StyleSheetManager.propTypes = {
  sheet: PropTypes.instanceOf(StyleSheet),
  target: PropTypes.shape({
    appendChild: PropTypes.func.isRequired,
  }),
};
