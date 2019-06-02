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
  stylisPlugins?: Array<Function>,
  target?: HTMLElement,
};

export const StyleSheetContext: Context<StyleSheet | void> = React.createContext();
export const StyleSheetConsumer = StyleSheetContext.Consumer;
export const masterSheet: StyleSheet = new StyleSheet();

export function useStyleSheet(): StyleSheet {
  return useContext(StyleSheetContext) || masterSheet;
}

export default function StyleSheetManager(props: Props) {
  const styleSheet = useMemo(
    () => {
      let sheet = masterSheet;

      if (props.sheet) {
        // eslint-disable-next-line prefer-destructuring
        sheet = props.sheet;
      } else if (props.target) {
        sheet = sheet.reconstructWithOptions({ target: props.target });
      }

      if (props.disableCSSOMInjection) {
        sheet = sheet.reconstructWithOptions({ useCSSOMInjection: false });
      }

      if (props.stylisOptions || props.stylisPlugins) {
        sheet = sheet.reconstructWithOptions({
          stringifier: createStylisInstance(props.stylisOptions, props.stylisPlugins),
        });
      }

      return sheet;
    },
    [
      props.disableCSSOMInjection,
      props.sheet,
      props.stylisOptions,
      props.stylisPlugins,
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
  stylisPlugins: PropTypes.arrayOf(PropTypes.func),
  target: PropTypes.shape({
    appendChild: PropTypes.func.isRequired,
  }),
};
