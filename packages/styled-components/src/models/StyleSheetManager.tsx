import React from 'react';
import type stylis from 'stylis';
import { IS_RSC, SC_VERSION } from '../constants';
import StyleSheet from '../sheet';
import { InsertionTarget, ShouldForwardProp, Stringifier } from '../types';
import createStylisInstance from '../utils/stylis';
import { createRSCCache } from '../utils/rscCache';

declare const __SERVER__: boolean;

export const mainSheet: StyleSheet = new StyleSheet();
export const mainStylis: Stringifier = createStylisInstance();

type RscSlot = { override: IStyleSheetContext | null };
const rscFallbackSlot: RscSlot = { override: null };

/** Created once per server render; creating it is the per-render reset (see docs/rsc-style-injection.md). */
const getRscSlot = createRSCCache((): RscSlot => {
  mainSheet.names.clear();
  mainSheet.keyframeIds.clear();
  mainSheet.clearTag();
  return { override: null };
});
const rscSlot = (): RscSlot => (getRscSlot ? getRscSlot() : rscFallbackSlot);

let rscLastPlugins: stylis.Middleware[] | undefined;
let rscLastNamespace: string | undefined;
let rscLastPrefix: boolean | undefined;
let rscCachedStylis: Stringifier = mainStylis;

export type IStyleSheetContext = {
  shouldForwardProp?: ShouldForwardProp<'web'> | undefined;
  styleSheet: StyleSheet;
  stylis: Stringifier;
  /** Preserved for inheritance - inner SSMs that set namespace/vendorPrefixes
   *  but not stylisPlugins can still inherit the parent's plugins. */
  stylisPlugins?: stylis.Middleware[] | undefined;
};

const defaultContextValue: IStyleSheetContext = {
  shouldForwardProp: undefined,
  styleSheet: mainSheet,
  stylis: mainStylis,
  stylisPlugins: undefined,
};

type ServerStylesHolder = { stylisPlugins?: unknown };

let serverStylesHolder: ServerStylesHolder | undefined;

/**
 * One holder object per process and major version, found through `globalThis`
 * once and kept: a framework can load more than one copy of the library into
 * one process (Next.js bundles each server layer apart), and a lookup on every
 * styled component would cost more than the render.
 */
function serverStyles(): ServerStylesHolder {
  if (serverStylesHolder) return serverStylesHolder;

  const key = Symbol.for(`styled-components.serverStyles.v${SC_VERSION.split('.')[0]}`);
  const existing: unknown = Reflect.get(globalThis, key);
  if (typeof existing === 'object' && existing !== null) {
    serverStylesHolder = existing;
  } else {
    serverStylesHolder = {};
    Reflect.set(globalThis, key, serverStylesHolder);
  }

  return serverStylesHolder;
}

let warnedInBrowser = false;

/**
 * Sets the stylis plugins every server component is styled with, for the whole
 * server process. Call it once, at the top level of a module every server
 * render loads before any page renders (in Next.js, the root layout file). A
 * later call replaces an earlier one and applies to renders that start after
 * it. A `StyleSheetManager` in a server component starts from these plugins;
 * `stylisPlugins={[]}` drops them. Client components take their plugins from a
 * client `StyleSheetManager`.
 */
export function configureServerStyles(options: { stylisPlugins: stylis.Middleware[] }): void {
  if (!__SERVER__) {
    if (process.env.NODE_ENV !== 'production' && !warnedInBrowser) {
      warnedInBrowser = true;
      console.warn(
        'configureServerStyles has no effect in the browser. Call it at the top level of a server component module, such as the root layout in Next.js, never from a client component or code bundled for the browser.'
      );
    }

    return;
  }

  serverStyles().stylisPlugins = options.stylisPlugins;
}

let derivedFrom: stylis.Middleware[] | undefined;
let derivedContext: IStyleSheetContext | undefined;

/** The context a server component sees with no manager's settings in the slot: the configured plugins, or the plain defaults. */
function serverDefaults(): IStyleSheetContext {
  if (!__SERVER__) return defaultContextValue;

  const configured = serverStyles().stylisPlugins;

  // Runs per styled component: a server with nothing configured stops at the truthiness check.
  if (!configured || !Array.isArray(configured) || !configured.length) return defaultContextValue;

  if (derivedContext === undefined || derivedFrom !== configured) {
    derivedContext = {
      shouldForwardProp: undefined,
      styleSheet: mainSheet,
      stylis: createStylisInstance({ plugins: configured }),
      stylisPlugins: configured,
    };
    derivedFrom = configured; // Last: a plugin that fails to build must fail again on the next request.
  }

  return derivedContext;
}

// Create context only if createContext is available, otherwise create a fallback
export const StyleSheetContext = !IS_RSC
  ? React.createContext<IStyleSheetContext>(defaultContextValue)
  : ({
      Provider: ({ children }: { children: React.ReactNode; value?: IStyleSheetContext }) =>
        children,
      Consumer: ({ children }: { children: (value: IStyleSheetContext) => React.ReactNode }) =>
        children(rscSlot().override || serverDefaults()),
    } as React.Context<IStyleSheetContext>);

export const StyleSheetConsumer = StyleSheetContext.Consumer;

export type IStylisContext = Stringifier | void;

export function useStyleSheetContext() {
  if (!IS_RSC) return React.useContext(StyleSheetContext);

  return rscSlot().override || serverDefaults();
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
  if (IS_RSC) {
    const slot = rscSlot();
    const defaults = serverDefaults();

    // Merge with existing override: inherit parent values when props are omitted.
    const parentOverride = slot.override || defaults;

    const hasStylisOptions =
      props.namespace !== undefined || props.enableVendorPrefixes !== undefined;
    let resolvedStylis = parentOverride.stylis;

    if (props.stylisPlugins && !props.stylisPlugins.length && !hasStylisOptions) {
      resolvedStylis = mainStylis;
    } else if (props.stylisPlugins) {
      // Memoized while the plugins array ref and options stay the same.
      if (
        props.stylisPlugins !== rscLastPlugins ||
        props.namespace !== rscLastNamespace ||
        props.enableVendorPrefixes !== rscLastPrefix
      ) {
        rscLastPlugins = props.stylisPlugins;
        rscLastNamespace = props.namespace;
        rscLastPrefix = props.enableVendorPrefixes;
        rscCachedStylis = createStylisInstance({
          options: { namespace: props.namespace, prefix: props.enableVendorPrefixes },
          plugins: props.stylisPlugins,
        });
      }

      resolvedStylis = rscCachedStylis;
    } else if (hasStylisOptions) {
      // Options without plugins of its own: build on the parent's plugins.
      rscCachedStylis = createStylisInstance({
        options: { namespace: props.namespace, prefix: props.enableVendorPrefixes },
        plugins: parentOverride.stylisPlugins,
      });
      rscLastPlugins = undefined;
      rscLastNamespace = undefined;
      rscLastPrefix = undefined;
      resolvedStylis = rscCachedStylis;
    }

    const resolvedShouldForwardProp =
      'shouldForwardProp' in props ? props.shouldForwardProp : parentOverride.shouldForwardProp;

    const resolvedPlugins = props.stylisPlugins ?? parentOverride.stylisPlugins;

    // Against the server default, not `mainStylis`: an empty slot reads the
    // default, so clearing it would undo `stylisPlugins={[]}` under configured plugins.
    if (resolvedStylis !== defaults.stylis || resolvedShouldForwardProp) {
      slot.override = {
        shouldForwardProp: resolvedShouldForwardProp,
        styleSheet: mainSheet,
        stylis: resolvedStylis,
        stylisPlugins: resolvedPlugins,
      };
    } else {
      slot.override = null;
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
