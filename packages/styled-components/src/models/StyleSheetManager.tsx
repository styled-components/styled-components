import React from 'react';
import type stylis from 'stylis';
import { IS_RSC } from '../constants';
import StyleSheet from '../sheet';
import { InsertionTarget, ShouldForwardProp, Stringifier } from '../types';
import createStylisInstance from '../utils/stylis';

export const mainSheet: StyleSheet = new StyleSheet();
export const mainStylis: Stringifier = createStylisInstance();

export type IStyleSheetContext = {
  shouldForwardProp?: ShouldForwardProp<'web'> | undefined;
  styleSheet: StyleSheet;
  stylis: Stringifier;
};

const defaultContextValue: IStyleSheetContext = {
  shouldForwardProp: undefined,
  styleSheet: mainSheet,
  stylis: mainStylis,
};

// Create context only if createContext is available, otherwise create a fallback
export const StyleSheetContext = !IS_RSC
  ? React.createContext<IStyleSheetContext>(defaultContextValue)
  : ({
      Provider: ({ children }: { children: React.ReactNode; value?: IStyleSheetContext }) =>
        children,
      Consumer: ({ children }: { children: (value: IStyleSheetContext) => React.ReactNode }) =>
        children(defaultContextValue),
    } as React.Context<IStyleSheetContext>);

export const StyleSheetConsumer = StyleSheetContext.Consumer;

export type IStylisContext = Stringifier | void;
export const StylisContext = !IS_RSC
  ? React.createContext<IStylisContext>(undefined)
  : ({
      Provider: ({ children }: { children: React.ReactNode; value?: IStylisContext }) => children,
      Consumer: ({ children }: { children: (value: IStylisContext) => React.ReactNode }) =>
        children(undefined),
    } as React.Context<IStylisContext>);
export const StylisConsumer = StylisContext.Consumer;

export function useStyleSheetContext() {
  // Skip useContext if we're in an RSC environment without context support
  return !IS_RSC ? React.useContext(StyleSheetContext) : defaultContextValue;
}

export type IStyleSheetManager = React.PropsWithChildren<{
  /**
   * If desired, you can pass this prop to disable "speedy" insertion mode, which
   * uses the browser [CSSOM APIs](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet).
   * When disabled, rules are inserted as simple text into style blocks.
   */
  disableCSSOMInjection?: undefined | boolean;
  /**
   * If you are working exclusively with modern browsers, vendor prefixes can often be omitted
   * to reduce the weight of CSS on the page.
   */
  enableVendorPrefixes?: undefined | boolean;
  /**
   * Provide an optional selector to be prepended to all generated style rules.
   */
  namespace?: undefined | string;
  /**
   * Create and provide your own `StyleSheet` if necessary for advanced SSR scenarios.
   */
  sheet?: undefined | StyleSheet;
  /**
   * Starting in v6, styled-components no longer does its own prop validation
   * and recommends use of transient props "$prop" to pass style-only props to
   * components. If for some reason you are not able to use transient props, a
   * prop validation function can be provided via `StyleSheetManager`, such as
   * `@emotion/is-prop-valid`.
   *
   * When the return value is `true`, props will be forwarded to the DOM/underlying
   * component. If return value is `false`, the prop will be discarded after styles
   * are calculated.
   *
   * Manually composing `styled.{element}.withConfig({shouldForwardProp})` will
   * override this default.
   */
  shouldForwardProp?: undefined | IStyleSheetContext['shouldForwardProp'];
  /**
   * An array of plugins to be run by stylis (style processor) during compilation.
   * Check out [what's available on npm*](https://www.npmjs.com/search?q=keywords%3Astylis).
   *
   * \* The plugin(s) must be compatible with stylis v4 or above.
   */
  stylisPlugins?: undefined | stylis.Middleware[];
  /**
   * Provide an alternate DOM node to host generated styles; useful for iframes.
   */
  target?: undefined | InsertionTarget;
}>;

export function StyleSheetManager(props: IStyleSheetManager): React.JSX.Element {
  // In RSC environments without context support, StyleSheetManager becomes a no-op
  if (IS_RSC || !React.useMemo) {
    return props.children as React.JSX.Element;
  }

  const { styleSheet } = useStyleSheetContext();

  const resolvedStyleSheet = React.useMemo(() => {
    let sheet = styleSheet;

    if (props.sheet) {
      sheet = props.sheet;
    } else if (props.target) {
      sheet = sheet.reconstructWithOptions({ target: props.target }, false);
    }

    if (props.disableCSSOMInjection) {
      sheet = sheet.reconstructWithOptions({ useCSSOMInjection: false });
    }

    return sheet;
  }, [props.disableCSSOMInjection, props.sheet, props.target, styleSheet]);

  const stylis = React.useMemo(
    () =>
      createStylisInstance({
        options: { namespace: props.namespace, prefix: props.enableVendorPrefixes },
        plugins: props.stylisPlugins,
      }),
    [props.enableVendorPrefixes, props.namespace, props.stylisPlugins]
  );

  const styleSheetContextValue = React.useMemo(
    () => ({
      shouldForwardProp: props.shouldForwardProp,
      styleSheet: resolvedStyleSheet,
      stylis,
    }),
    [props.shouldForwardProp, resolvedStyleSheet, stylis]
  );

  return (
    <StyleSheetContext.Provider value={styleSheetContextValue}>
      <StylisContext.Provider value={stylis}>{props.children}</StylisContext.Provider>
    </StyleSheetContext.Provider>
  );
}
