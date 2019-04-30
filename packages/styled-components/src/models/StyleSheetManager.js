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

let masterSheet: StyleSheet;

export function getMasterStyleSheet(): StyleSheet {
  return masterSheet || (masterSheet = new StyleSheet(false));
}

export function useStyleSheet() {
  const fromContext = useContext(StyleSheetContext);
  if (fromContext === undefined) {
    return getMasterStyleSheet();
  }

  return fromContext;
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
