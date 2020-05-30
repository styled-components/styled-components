// @flow
import React, { useContext, useEffect, useMemo, useState, type Node, type Context } from 'react';
import shallowequal from 'shallowequal';
import StyleSheet from '../sheet';
import createStylisInstance, { type Stringifier } from '../utils/stylis';

type Props = {
  children?: Node,
  disableCSSOMInjection?: boolean,
  disableVendorPrefixes?: boolean,
  sheet?: StyleSheet,
  stylisPlugins?: Array<Function>,
  target?: HTMLElement,
};

export const StyleSheetContext: Context<StyleSheet | void> = React.createContext();
export const StyleSheetConsumer = StyleSheetContext.Consumer;
export const StylisContext: Context<Stringifier | void> = React.createContext();
export const StylisConsumer = StylisContext.Consumer;

export const masterSheet: StyleSheet = new StyleSheet();
export const masterStylis: Stringifier = createStylisInstance();

export function useStyleSheet(): StyleSheet {
  return useContext(StyleSheetContext) || masterSheet;
}

export function useStylis(): Stringifier {
  return useContext(StylisContext) || masterStylis;
}

export default function StyleSheetManager(props: Props) {
  const [plugins, setPlugins] = useState(props.stylisPlugins);
  const contextStyleSheet = useStyleSheet();

  const styleSheet = useMemo(() => {
    let sheet = contextStyleSheet;

    if (props.sheet) {
      // eslint-disable-next-line prefer-destructuring
      sheet = props.sheet;
    } else if (props.target) {
      sheet = sheet.reconstructWithOptions({ target: props.target }, false);
    }

    if (props.disableCSSOMInjection) {
      sheet = sheet.reconstructWithOptions({ useCSSOMInjection: false });
    }

    return sheet;
  }, [props.disableCSSOMInjection, props.sheet, props.target]);

  const stylis = useMemo(
    () =>
      createStylisInstance({
        options: { prefix: !props.disableVendorPrefixes },
        plugins,
      }),
    [props.disableVendorPrefixes, plugins]
  );

  useEffect(() => {
    if (!shallowequal(plugins, props.stylisPlugins)) setPlugins(props.stylisPlugins);
  }, [props.stylisPlugins]);

  return (
    <StyleSheetContext.Provider value={styleSheet}>
      <StylisContext.Provider value={stylis}>
        {process.env.NODE_ENV !== 'production'
          ? React.Children.only(props.children)
          : props.children}
      </StylisContext.Provider>
    </StyleSheetContext.Provider>
  );
}
