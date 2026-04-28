import React from 'react';
import { IS_RSC } from '../constants';
import StyleSheet from '../sheet';
import { InsertionTarget, ShouldForwardProp, Stringifier } from '../types';
import createStylisInstance, { SCPlugin } from '../utils/cssCompile';

export const mainSheet: StyleSheet = new StyleSheet();
export const mainStylis: Stringifier = createStylisInstance();

/**
 * RSC context slot; module-level mutable state scoped per render via React.cache.
 * In RSC, createContext doesn't exist, so StyleSheetManager writes here and
 * useStyleSheetContext reads from here. Single-threaded RSC renders guarantee
 * no concurrent mutation. React.cache ensures reset between renders.
 */
let rscContextOverride: IStyleSheetContext | null = null;
let rscLastPlugins: SCPlugin[] | undefined;
let rscCachedStylis: Stringifier = mainStylis;

/** Dev-only warning for legacy plugins other than the first-party ones. Fired once per plugin name.
 *
 * Unnamed plugins are not handled here; they throw error #15 from
 * `createStylisInstance` when the hash is computed, so this loop never sees
 * them. The first-party allow-list and warning text live entirely inside the
 * function body so terser eliminates them in production along with the rest of
 * the dev-only block. Hoisting them to module scope leaks the literal plugin
 * names into the production bundle and trips the tree-shake test. */
const warnedPluginNames = new Set<string>();
function warnUnsupportedPlugins(plugins: SCPlugin[] | undefined): void {
  if (process.env.NODE_ENV === 'production' || !plugins) return;
  for (let i = 0; i < plugins.length; i++) {
    const name = plugins[i]?.name;
    if (!name || name === 'rsc' || name === 'rtl') continue;
    if (warnedPluginNames.has(name)) continue;
    warnedPluginNames.add(name);
    console.warn(
      `[styled-components] plugin "${name}" is not supported in v7. ` +
        `Only the first-party plugins from \`styled-components/plugins\` are ` +
        `recognised; legacy stylis plugins (prefixer, RTL, etc.) must migrate to ` +
        `a build-time transform or use the v7 plugin shape.`
    );
  }
}

let warnedVendorPrefixes = false;
function warnIfVendorPrefixesRequested(value: boolean | undefined): void {
  if (process.env.NODE_ENV === 'production' || !value || warnedVendorPrefixes) return;
  warnedVendorPrefixes = true;
  console.warn(
    `[styled-components] \`enableVendorPrefixes\` is not supported in v7. ` +
      `styled-components no longer bundles a vendor prefixer; modern browsers ` +
      `handle supported CSS natively. For Safari-only properties that still need ` +
      `prefixes (e.g. \`-webkit-backdrop-filter\`), write both the prefixed and ` +
      `unprefixed declaration manually, or use a build-time PostCSS transform.`
  );
}

// Per-render sheet reset; the rscContextOverride slot is NOT touched here
// (Set/Reset tokens manage it instead).
const ensureSheetReset: (() => void) | null = IS_RSC
  ? React.cache(() => {
      mainSheet.names.clear();
      mainSheet.keyframeIds.clear();
      mainSheet.clearTag();
    })
  : null;

export type IStyleSheetContext = {
  shouldForwardProp?: ShouldForwardProp<'web'> | undefined;
  styleSheet: StyleSheet;
  stylis: Stringifier;
  /** Preserved for inheritance; inner SSMs that set namespace/vendorPrefixes
   *  but not plugins can still inherit the parent's plugins. */
  plugins?: SCPlugin[] | undefined;
};

const defaultContextValue: IStyleSheetContext = {
  shouldForwardProp: undefined,
  styleSheet: mainSheet,
  stylis: mainStylis,
  plugins: undefined,
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
  // it here AND in StyleSheetManager is safe; whichever runs first wins.
  if (ensureSheetReset) ensureSheetReset();

  return rscContextOverride || defaultContextValue;
}

export type IStyleSheetManager = React.PropsWithChildren<{
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
   * Plugins to apply during CSS emission. v7 ships first-party plugins via
   * `styled-components/plugins` (`rscPlugin`, `rtlPlugin`); other plugins must
   * implement the v7 `SCPlugin` shape (`{ name, rw?, decl? }`). Legacy stylis
   * plugins are not supported.
   *
   * When nested inside another `StyleSheetManager`, omitting this prop inherits
   * the parent's plugins. Pass an empty array (`[]`) to explicitly disable
   * inherited plugins for a subtree.
   */
  plugins?: undefined | SCPlugin[];
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

// Set/Reset tokens drive `rscContextOverride` in document order. RSC
// renders fragment children serially, so a Reset after children restores
// the parent override before sibling subtrees render.
function RscOverrideSet({ value }: { value: IStyleSheetContext | null }): null {
  rscContextOverride = value;
  return null;
}

function RscOverrideReset({ value }: { value: IStyleSheetContext | null }): null {
  rscContextOverride = value;
  return null;
}

/** Configure style injection for descendant styled components (target element, plugins, prop forwarding). */
export function StyleSheetManager(props: IStyleSheetManager): React.JSX.Element {
  if (IS_RSC) {
    if (ensureSheetReset) ensureSheetReset();

    // Merge with existing override: inherit parent values when props are omitted.
    const parentOverride = rscContextOverride;
    const parentResolved = parentOverride || defaultContextValue;

    // Build a stylis instance when any stylis-related prop is provided.
    // Cache it when the plugins array ref is stable.
    const hasStylisProps =
      props.plugins !== undefined ||
      props.namespace !== undefined ||
      props.enableVendorPrefixes !== undefined;

    if (hasStylisProps) {
      warnUnsupportedPlugins(props.plugins);
      warnIfVendorPrefixesRequested(props.enableVendorPrefixes);
      if (props.plugins && props.plugins !== rscLastPlugins) {
        rscLastPlugins = props.plugins;
        rscCachedStylis = createStylisInstance({
          options: { namespace: props.namespace },
          plugins: props.plugins,
        });
      } else if (props.namespace !== undefined) {
        // Namespace changed without new plugins; create fresh instance
        // using inherited plugins from parent.
        rscCachedStylis = createStylisInstance({
          options: { namespace: props.namespace },
          plugins: props.plugins ?? parentResolved.plugins,
        });
      }
    }

    const resolvedStylis = hasStylisProps
      ? props.plugins !== undefined && !props.plugins.length
        ? mainStylis
        : rscCachedStylis
      : parentResolved.stylis;
    const resolvedShouldForwardProp =
      'shouldForwardProp' in props ? props.shouldForwardProp : parentResolved.shouldForwardProp;

    const resolvedPlugins = props.plugins ?? parentResolved.plugins;

    const ownOverride: IStyleSheetContext | null =
      resolvedStylis !== mainStylis || resolvedShouldForwardProp
        ? {
            shouldForwardProp: resolvedShouldForwardProp,
            styleSheet: mainSheet,
            stylis: resolvedStylis,
            plugins: resolvedPlugins,
          }
        : null;

    return (
      <>
        <RscOverrideSet value={ownOverride} />
        {props.children}
        <RscOverrideReset value={parentOverride} />
      </>
    );
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

    return sheet;
  }, [props.nonce, props.sheet, props.target, styleSheet]);

  // Inherit parent stylis when no stylis-related props are provided.
  // When any stylis option (namespace, vendorPrefixes) changes, create a new
  // instance but still inherit plugins from the parent if plugins is omitted.
  // An explicit empty array disables inherited plugins.
  const stylis = React.useMemo(() => {
    if (
      props.plugins === undefined &&
      props.namespace === undefined &&
      props.enableVendorPrefixes === undefined
    ) {
      return parentContext.stylis;
    }
    warnUnsupportedPlugins(props.plugins);
    warnIfVendorPrefixesRequested(props.enableVendorPrefixes);
    return createStylisInstance({
      options: { namespace: props.namespace },
      plugins: props.plugins ?? parentContext.plugins,
    });
  }, [
    props.enableVendorPrefixes,
    props.namespace,
    props.plugins,
    parentContext.stylis,
    parentContext.plugins,
  ]);

  // Inherit parent shouldForwardProp when not provided.
  const shouldForwardProp =
    'shouldForwardProp' in props ? props.shouldForwardProp : parentContext.shouldForwardProp;

  // Resolve which plugins to propagate: own > parent > none
  const resolvedPlugins = props.plugins ?? parentContext.plugins;

  const styleSheetContextValue = React.useMemo(
    () => ({
      shouldForwardProp,
      styleSheet: resolvedStyleSheet,
      stylis,
      plugins: resolvedPlugins,
    }),
    [shouldForwardProp, resolvedStyleSheet, stylis, resolvedPlugins]
  );

  return (
    <StyleSheetContext.Provider value={styleSheetContextValue}>
      {props.children}
    </StyleSheetContext.Provider>
  );
}
