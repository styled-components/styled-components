// @flow
import React, { useContext, useMemo, type Node, type Context } from 'react';
import PropTypes from 'prop-types';
import StyleSheet from '../sheet';
import createStylisInstance from '../utils/stylis';

type Props = {
  children?: Node,
  disableCSSOMInjection?: boolean,
  sheet?: StyleSheet,
  stylisOptions?: Object,
  stylusPlugins?: Array<Function>,
  target?: HTMLElement,
};

export const StyleSheetContext: Context<StyleSheet | void> = React.createContext();
export const StyleSheetConsumer = StyleSheetContext.Consumer;
export const masterSheet: StyleSheet = new StyleSheet(false);

export function useStyleSheet(): StyleSheet {
  return useContext(StyleSheetContext) || masterSheet;
}

export default function StyleSheetManager(props: Props) {
  const styleSheet = useMemo(
    () => {
      let sheet;

      if (props.sheet) {
        // eslint-disable-next-line prefer-destructuring
        sheet = props.sheet;
      } else if (props.target) {
        sheet = new StyleSheet(false, props.target);
      } else {
        sheet = masterSheet;
      }

      if (props.disableCSSOMInjection) {
        if (sheet === masterSheet) {
          sheet = new StyleSheet(false);
          sheet.useCSSOM = false;
        } else {
          sheet.useCSSOM = false;
        }
      }

      if (props.stylisOptions || props.stylusPlugins) {
        sheet.stringifier = createStylisInstance(props.stylisOptions, props.stylusPlugins);
      }

      return sheet;
    },
    [
      props.disableCSSOMInjection,
      props.sheet,
      props.stylisOptions,
      props.stylusPlugins,
      props.target,
    ]
  );

  return (
    <StyleSheetContext.Provider value={styleSheet}>
      {process.env.NODE_ENV !== 'production' ? React.Children.only(props.children) : props.children}
    </StyleSheetContext.Provider>
  );
}

StyleSheetManager.propTypes = {
  disableCSSOMInjection: PropTypes.bool,
  sheet: PropTypes.instanceOf(StyleSheet),
  stylisOptions: PropTypes.object,
  stylusPlugins: PropTypes.arrayOf(PropTypes.func),
  target: PropTypes.shape({
    appendChild: PropTypes.func.isRequired,
  }),
};
