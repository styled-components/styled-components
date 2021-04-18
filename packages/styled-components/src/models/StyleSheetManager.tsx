import React, { useContext, useEffect, useMemo, useState } from 'react';
import shallowequal from 'shallowequal';
import StyleSheet from '../sheet';
import { Stringifier } from '../types';
import createStylisInstance from '../utils/stylis';

type Props = {
  children?: React.ReactChild;
  disableCSSOMInjection?: boolean;
  disableVendorPrefixes?: boolean;
  sheet?: StyleSheet;
  stylisPlugins?: stylis.Middleware[];
  target?: HTMLElement;
};

export const StyleSheetContext = React.createContext<StyleSheet | void>(undefined);
export const StyleSheetConsumer = StyleSheetContext.Consumer;
export const StylisContext = React.createContext<Stringifier | void>(undefined);
export const StylisConsumer = StylisContext.Consumer;

export const mainSheet: StyleSheet = new StyleSheet();
export const mainStylis: Stringifier = createStylisInstance();

export function useStyleSheet(): StyleSheet {
  return useContext(StyleSheetContext) || mainSheet;
}

export function useStylis(): Stringifier {
  return useContext(StylisContext) || mainStylis;
}

export default function StyleSheetManager(props: Props): JSX.Element {
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
