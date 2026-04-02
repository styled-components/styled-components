import React from 'react';
import type stylis from 'stylis';
import { IS_RSC } from '../constants';
import StyleSheet from '../sheet';
import { InsertionTarget, ShouldForwardProp, Stringifier } from '../types';
import createStylisInstance from '../utils/stylis';

export const mainSheet: StyleSheet = new StyleSheet();
export const mainStylis: Stringifier = createStylisInstance();

/**
 * RSC context slot — module-level mutable state scoped per render via React.cache.
 * In RSC, createContext doesn't exist, so StyleSheetManager writes here and
 * useStyleSheetContext reads from here. Single-threaded RSC renders guarantee
 * no concurrent mutation. React.cache ensures reset between renders.
 */
let rscContextOverride: IStyleSheetContext | null = null;
let rscLastPlugins: stylis.Middleware[] | undefined;
let rscCachedStylis: Stringifier = mainStylis;

/** Per-render reset to prevent HMR accumulation (see AGENTS.md § RSC Style Injection). */
const ensureSheetReset: (() => void) | null = IS_RSC
  ? (((React as any).cache as (<T extends (...args: any[]) => any>(fn: T) => T) | undefined)?.(
      () => {
        mainSheet.names.clear();
        mainSheet.keyframeIds.clear();
        mainSheet.clearTag();
        rscContextOverride = null;
      }
    ) ?? null)
  : null;

export type IStyleSheetContext = {
  shouldForwardProp?: ShouldForwardProp<'web'> | undefined;
  styleSheet: StyleSheet;
  stylis: Stringifier;
  /** Preserved for inheritance — inner SSMs that set namespace/vendorPrefixes
   *  but not stylisPlugins can still inherit the parent's plugins. */
  stylisPlugins?: stylis.Middleware[] | undefined;
};

const defaultContextValue: IStyleSheetContext = {
  shouldForwardProp: undefined,
  styleSheet: mainSheet,
  stylis: mainStylis,
  stylisPlugins: undefined,
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

export function useStyleSheetContext() {
  if (!IS_RSC) return React.useContext(StyleSheetContext);

  // Reset mainSheet once per render to prevent HMR accumulation.
  // React.cache ensures this runs exactly once per render, so calling
  // it here AND in StyleSheetManager is safe — whichever runs first wins.
  if (ensureSheetReset) ensureSheetReset();

  return rscContextOverride || defaultContextValue;
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
   * When provided, `target` and `nonce` props are ignored (configure them on the sheet directly).
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
   *
   * When nested inside another `StyleSheetManager`, omitting this prop inherits
   * the parent's function. Pass `undefined` explicitly or a passthrough function
   * to disable inherited behavior for a subtree.
   */
  shouldForwardProp?: undefined | IStyleSheetContext['shouldForwardProp'];
  /**
   * An array of plugins to be run by stylis (style processor) during compilation.
   * Check out [what's available on npm*](https://www.npmjs.com/search?q=keywords%3Astylis).
   *
   * \* The plugin(s) must be compatible with stylis v4 or above.
   *
   * When nested inside another `StyleSheetManager`, omitting this prop inherits
   * the parent's plugins. Pass an empty array (`[]`) to explicitly disable
   * inherited plugins for a subtree.
   */
  stylisPlugins?: undefined | stylis.Middleware[];
  /**
   * CSP nonce to attach to injected `<style>` tags. Overrides auto-detection
   * from `<meta name="sc-nonce">`, `<meta property="csp-nonce">`, or `__webpack_nonce__`.
   */
  nonce?: undefined | string;
  /**
   * Provide an alternate DOM node to host generated styles; useful for iframes.
   */
  target?: undefined | InsertionTarget;
}>;

/** Configure style injection for descendant styled components (target element, stylis plugins, prop forwarding). */
export function StyleSheetManager(props: IStyleSheetManager): React.JSX.Element {
  // In RSC, context doesn't exist but we can set module-level state.
  // Single-threaded RSC renders + React.cache reset make this safe.
  if (IS_RSC) {
    // Reset once per render (React.cache scopes this per request)
    if (ensureSheetReset) ensureSheetReset();

    // Merge with existing override: inherit parent values when props are omitted.
    const parentOverride = rscContextOverride || defaultContextValue;

    // Build a stylis instance when any stylis-related prop is provided.
    // Cache it when the plugins array ref is stable.
    const hasStylisProps =
      props.stylisPlugins !== undefined ||
      props.namespace !== undefined ||
      props.enableVendorPrefixes !== undefined;

    if (hasStylisProps) {
      if (props.stylisPlugins && props.stylisPlugins !== rscLastPlugins) {
        rscLastPlugins = props.stylisPlugins;
        rscCachedStylis = createStylisInstance({
          options: { namespace: props.namespace, prefix: props.enableVendorPrefixes },
          plugins: props.stylisPlugins,
        });
      } else if (props.namespace !== undefined || props.enableVendorPrefixes !== undefined) {
        // Namespace or prefix changed without new plugins — create fresh instance
        // using inherited plugins from parent.
        rscCachedStylis = createStylisInstance({
          options: { namespace: props.namespace, prefix: props.enableVendorPrefixes },
          plugins: props.stylisPlugins ?? parentOverride.stylisPlugins,
        });
      }
    }

    const resolvedStylis = hasStylisProps
      ? props.stylisPlugins !== undefined && !props.stylisPlugins.length
        ? mainStylis
        : rscCachedStylis
      : parentOverride.stylis;
    const resolvedShouldForwardProp =
      'shouldForwardProp' in props ? props.shouldForwardProp : parentOverride.shouldForwardProp;

    const resolvedPlugins = props.stylisPlugins ?? parentOverride.stylisPlugins;

    if (resolvedStylis !== mainStylis || resolvedShouldForwardProp) {
      rscContextOverride = {
        shouldForwardProp: resolvedShouldForwardProp,
        styleSheet: mainSheet,
        stylis: resolvedStylis,
        stylisPlugins: resolvedPlugins,
      };
    } else {
      rscContextOverride = null;
    }

    return props.children as React.JSX.Element;
  }

  const parentContext = useStyleSheetContext();
  const { styleSheet } = parentContext;

  const resolvedStyleSheet = React.useMemo(() => {
    let sheet = styleSheet;

    if (props.sheet) {
      sheet = props.sheet;
    } else if (props.target) {
      sheet = sheet.reconstructWithOptions(
        props.nonce !== undefined
          ? { target: props.target, nonce: props.nonce }
          : { target: props.target },
        false
      );
    } else if (props.nonce !== undefined) {
      sheet = sheet.reconstructWithOptions({ nonce: props.nonce });
    }

    if (props.disableCSSOMInjection) {
      sheet = sheet.reconstructWithOptions({ useCSSOMInjection: false });
    }

    return sheet;
  }, [props.disableCSSOMInjection, props.nonce, props.sheet, props.target, styleSheet]);

  // Inherit parent stylis when no stylis-related props are provided.
  // When any stylis option (namespace, vendorPrefixes) changes, create a new
  // instance but still inherit plugins from the parent if stylisPlugins is omitted.
  // An explicit empty array disables inherited plugins.
  const stylis = React.useMemo(
    () =>
      props.stylisPlugins === undefined &&
      props.namespace === undefined &&
      props.enableVendorPrefixes === undefined
        ? parentContext.stylis
        : createStylisInstance({
            options: { namespace: props.namespace, prefix: props.enableVendorPrefixes },
            plugins: props.stylisPlugins ?? parentContext.stylisPlugins,
          }),
    [
      props.enableVendorPrefixes,
      props.namespace,
      props.stylisPlugins,
      parentContext.stylis,
      parentContext.stylisPlugins,
    ]
  );

  // Inherit parent shouldForwardProp when not provided.
  const shouldForwardProp =
    'shouldForwardProp' in props ? props.shouldForwardProp : parentContext.shouldForwardProp;

  // Resolve which plugins to propagate: own > parent > none
  const resolvedPlugins = props.stylisPlugins ?? parentContext.stylisPlugins;

  const styleSheetContextValue = React.useMemo(
    () => ({
      shouldForwardProp,
      styleSheet: resolvedStyleSheet,
      stylis,
      stylisPlugins: resolvedPlugins,
    }),
    [shouldForwardProp, resolvedStyleSheet, stylis, resolvedPlugins]
  );

  return (
    <StyleSheetContext.Provider value={styleSheetContextValue}>
      {props.children}
    </StyleSheetContext.Provider>
  );
}
