import React, { useContext, useEffect, useMemo, useState } from 'react';
import shallowequal from 'shallowequal';
import StyleSheet from '../sheet';
import { Stringifier } from '../types';
import createStylisInstance from '../utils/stylis';

export type IStyleSheetContext = StyleSheet | void;
export const StyleSheetContext = React.createContext<IStyleSheetContext>(undefined);
export const StyleSheetConsumer = StyleSheetContext.Consumer;

export type IStylisContext = Stringifier | void;
export const StylisContext = React.createContext<IStylisContext>(undefined);
export const StylisConsumer = StylisContext.Consumer;

export const mainSheet: StyleSheet = new StyleSheet();
export const mainStylis: Stringifier = createStylisInstance();

export function useStyleSheet(): StyleSheet {
  return useContext(StyleSheetContext) || mainSheet;
}

export function useStylis(): Stringifier {
  return useContext(StylisContext) || mainStylis;
}

export type IStyleSheetManager = React.PropsWithChildren<{
  /**
   * If desired, you can pass this prop to disable "speedy" insertion mode, which
   * uses the browser [CSSOM APIs](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet).
   * When disabled, rules are inserted as simple text into style blocks.
   */
  disableCSSOMInjection?: boolean;
  /**
   * If you are working exclusively with modern browsers, vendor prefixes can often be omitted
   * to reduce the weight of CSS on the page.
   */
  disableVendorPrefixes?: boolean;
  /**
   * Provide an optional selector to be prepended to all generated style rules.
   */
  namespace?: string;
  /**
   * Create and provide your own `StyleSheet` if necessary for advanced SSR scenarios.
   */
  sheet?: StyleSheet;
  /**
   * An array of plugins to be run by stylis (style processor) during compilation.
   * Check out [what's available on npm*](https://www.npmjs.com/search?q=keywords%3Astylis).
   *
   * \* The plugin(s) must be compatible with stylis v4 or above.
   */
  stylisPlugins?: stylis.Middleware[];
  /**
   * Provide an alternate DOM node to host generated styles; useful for iframes.
   */
  target?: HTMLElement;
}>;

export function StyleSheetManager(props: IStyleSheetManager): JSX.Element {
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
        options: { namespace: props.namespace, prefix: !props.disableVendorPrefixes },
        plugins,
      }),
    [props.disableVendorPrefixes, props.namespace, plugins]
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
