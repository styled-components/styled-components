import React from 'react';
import { IS_RSC } from '../utils/isRsc';
import StyleSheet from '../sheet';
import { Compiler, InsertionTarget, ShouldForwardProp } from '../types';
import createCompiler, { SCPlugin } from '../utils/compiler';

export const mainSheet: StyleSheet = new StyleSheet();
export const mainCompiler: Compiler = createCompiler();

// RSC has no createContext; module-level slot is set by StyleSheetManager via
// Set/Reset tokens (see RscOverrideSet below) and read by useStyleSheetContext.
let rscContextOverride: IStyleSheetContext | null = null;
let rscLastPlugins: SCPlugin[] | undefined;
let rscCachedCompiler: Compiler = mainCompiler;

// Allow-list and warning text live INSIDE the function body so terser
// eliminates them in production; hoisting leaks names into the bundle
// and trips the tree-shake test. (Unnamed plugins throw #15 elsewhere.)
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

// Per-render sheet reset; the override slot is mutated by the SSM render
// function instead of by token components (see comment in StyleSheetManager).
const ensureSheetReset: (() => void) | null = IS_RSC
  ? React.cache(() => {
      mainSheet.names.clear();
      mainSheet.keyframeIds.clear();
      mainSheet.clearTag();
    })
  : null;

/**
 * Reset the module-level RSC override slot. Test-only — production code
 * never reads this. The slot persists across `ReactDOMServer.renderToString`
 * calls in jest, so suites that simulate RSC mode call this in `beforeEach`
 * to start each render from a clean default context.
 */
export function __resetRSCOverrideForTesting(): void {
  rscContextOverride = null;
  rscLastPlugins = undefined;
  rscCachedCompiler = mainCompiler;
}

export type IStyleSheetContext = {
  shouldForwardProp?: ShouldForwardProp<'web'> | undefined;
  styleSheet: StyleSheet;
  compiler: Compiler;
  /** Preserved for inheritance; inner SSMs that set namespace/vendorPrefixes
   *  but not plugins can still inherit the parent's plugins. */
  plugins?: SCPlugin[] | undefined;
};

const defaultContextValue: IStyleSheetContext = {
  shouldForwardProp: undefined,
  styleSheet: mainSheet,
  compiler: mainCompiler,
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

export type ICompilerContext = Compiler | void;

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
   * Filter which props reach the underlying DOM element. Return `true` to
   * forward, `false` to drop. Prefer transient props (`$prop`) when
   * possible; reach for this when integrating with libraries like
   * `@emotion/is-prop-valid`. Component-level `withConfig({shouldForwardProp})`
   * overrides this. Nested SSMs inherit the parent's function unless this
   * prop is set to `undefined` or a passthrough.
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

/** Configure style injection for descendant styled components (target element, plugins, prop forwarding). */
export function StyleSheetManager(props: IStyleSheetManager): React.JSX.Element {
  if (IS_RSC) {
    if (ensureSheetReset) ensureSheetReset();

    // Merge with existing override: inherit parent values when props are omitted.
    const parentOverride = rscContextOverride;
    const parentResolved = parentOverride || defaultContextValue;

    // Build a compiler instance when any compiler-related prop is provided.
    // Cache it when the plugins array ref is stable.
    const hasCompilerProps =
      props.plugins !== undefined ||
      props.namespace !== undefined ||
      props.enableVendorPrefixes !== undefined;

    if (hasCompilerProps) {
      warnUnsupportedPlugins(props.plugins);
      warnIfVendorPrefixesRequested(props.enableVendorPrefixes);
      if (props.plugins && props.plugins !== rscLastPlugins) {
        rscLastPlugins = props.plugins;
        rscCachedCompiler = createCompiler({
          options: { namespace: props.namespace },
          plugins: props.plugins,
        });
      } else if (props.namespace !== undefined) {
        // Namespace changed without new plugins; create fresh instance
        // using inherited plugins from parent.
        rscCachedCompiler = createCompiler({
          options: { namespace: props.namespace },
          plugins: props.plugins ?? parentResolved.plugins,
        });
      }
    }

    const resolvedCompiler = hasCompilerProps
      ? props.plugins !== undefined && !props.plugins.length
        ? mainCompiler
        : rscCachedCompiler
      : parentResolved.compiler;
    const resolvedShouldForwardProp =
      'shouldForwardProp' in props ? props.shouldForwardProp : parentResolved.shouldForwardProp;

    const resolvedPlugins = props.plugins ?? parentResolved.plugins;

    const ownOverride: IStyleSheetContext | null =
      resolvedCompiler !== mainCompiler || resolvedShouldForwardProp
        ? {
            shouldForwardProp: resolvedShouldForwardProp,
            styleSheet: mainSheet,
            compiler: resolvedCompiler,
            plugins: resolvedPlugins,
          }
        : null;

    // Mutate the slot directly. React 19 Flight calls all immediate children
    // of a fragment eagerly before descending, so a Set/Reset child-token
    // pattern resets the slot before the actual children read it. Setting
    // here ensures descendants observe the override; the trade-off is that
    // sibling subtrees of a nested SSM inherit the inner override until the
    // next SSM resets it. For most apps with one top-level RSC SSM that's
    // fine. AsyncLocalStorage would close the gap for nested cases.
    rscContextOverride = ownOverride;

    return <>{props.children}</>;
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

  // Inherit parent compiler when no compiler-related props are provided.
  // When any compiler option (namespace, vendorPrefixes) changes, create a
  // new instance but still inherit plugins from the parent if plugins is
  // omitted. An explicit empty array disables inherited plugins.
  const compiler = React.useMemo(() => {
    if (
      props.plugins === undefined &&
      props.namespace === undefined &&
      props.enableVendorPrefixes === undefined
    ) {
      return parentContext.compiler;
    }
    warnUnsupportedPlugins(props.plugins);
    warnIfVendorPrefixesRequested(props.enableVendorPrefixes);
    return createCompiler({
      options: { namespace: props.namespace },
      plugins: props.plugins ?? parentContext.plugins,
    });
  }, [
    props.enableVendorPrefixes,
    props.namespace,
    props.plugins,
    parentContext.compiler,
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
      compiler,
      plugins: resolvedPlugins,
    }),
    [shouldForwardProp, resolvedStyleSheet, compiler, resolvedPlugins]
  );

  return (
    <StyleSheetContext.Provider value={styleSheetContextValue}>
      {props.children}
    </StyleSheetContext.Provider>
  );
}
