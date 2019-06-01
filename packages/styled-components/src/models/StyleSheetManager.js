// @flow
import React, { useContext, useMemo, type Node, type Context } from 'react';
import PropTypes from 'prop-types';
import StyleSheet from '../sheet';
import createStylisInstance from '../utils/stylis';

type Props = {
  children?: Node,
  sheet?: StyleSheet,
  stylisOptions?: Object,
  stylusPlugins?: Array<Function>,
  target?: HTMLElement,
};

export const StyleSheetContext: Context<StyleSheet | void> = React.createContext();
export const StyleSheetConsumer = StyleSheetContext.Consumer;
export const masterSheet: StyleSheet = new StyleSheet(false);

export function useStyleSheet(): StyleSheet {
  const sheet = useContext(StyleSheetContext);
  return sheet !== undefined ? sheet : masterSheet;
}

export default function StyleSheetManager(props: Props) {
  const sheet = useMemo(
    () => {
      let usedSheet;

      if (props.sheet) {
        usedSheet = props.sheet;
      } else if (props.target) {
        usedSheet = new StyleSheet(false, props.target);
      } else {
        usedSheet = masterSheet;
      }

      if (props.stylisOptions || props.stylusPlugins) {
        usedSheet.stringifier = createStylisInstance(props.stylisOptions, props.stylusPlugins);
      }

      return usedSheet;
    },
    [props.sheet, props.target]
  );

  return (
    <StyleSheetContext.Provider value={sheet}>
      {process.env.NODE_ENV !== 'production' ? React.Children.only(props.children) : props.children}
    </StyleSheetContext.Provider>
  );
}

StyleSheetManager.propTypes = {
  sheet: PropTypes.instanceOf(StyleSheet),
  stylisOptions: PropTypes.object,
  stylusPlugins: PropTypes.arrayOf(PropTypes.func),
  target: PropTypes.shape({
    appendChild: PropTypes.func.isRequired,
  }),
};
