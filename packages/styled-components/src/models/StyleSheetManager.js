// @flow
import React, { useContext, useMemo, type Element, type Context } from 'react';
import PropTypes from 'prop-types';
import StyleSheet from './StyleSheet';
import ServerStyleSheet from './ServerStyleSheet';
import StyledError from '../utils/error';

type Props = {
  children?: Element<any>,
  sheet?: StyleSheet,
  target?: HTMLElement,
};

const StyleSheetContext: Context<StyleSheet | void> = React.createContext();

export function useStyleSheet() {
  return useContext(StyleSheetContext) || StyleSheet.master;
}

function useStyleSheetProvider(sheet?: StyleSheet, target?: HTMLElement) {
  return useMemo(() => {
    if (sheet) {
      return sheet;
    } else if (target) {
      return new StyleSheet(target);
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
  sheet: PropTypes.oneOfType([
    PropTypes.instanceOf(StyleSheet),
    PropTypes.instanceOf(ServerStyleSheet),
  ]),
  target: PropTypes.shape({
    appendChild: PropTypes.func.isRequired,
  }),
};
