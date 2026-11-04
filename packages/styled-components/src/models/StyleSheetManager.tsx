import React from 'react';
import { SC_VERSION } from '../constants';
import { IS_RSC } from '../utils/isRsc';
import StyleSheet from '../sheet';
import { currentScope, scopeChildren } from './serverScope';
import { Compiler, InsertionTarget, ShouldForwardProp } from '../types';
import createCompiler, { SCPlugin } from '../utils/compiler';
import { warnOnce } from '../utils/warnOnce';

export const mainSheet: StyleSheet = new StyleSheet();
export const mainCompiler: Compiler = createCompiler();

// Minimum viable gate: warn only when a plugin can never be invoked. Legacy
// stylis middleware is a function, and a plugin with neither hook has nothing
// to call. Anything else that is incompatible fails on its own. Unnamed
// plugins throw error #15 from createCompiler.
function warnUnsupportedPlugins(plugins: SCPlugin[] | undefined): void {
  if (!__DEV__ || !plugins) return;
  for (let i = 0; i < plugins.length; i++) {
    // Legacy stylis middleware is a function, which SCPlugin[] does not admit
    // but JS callers pass anyway, so inspect the value as unknown.
    const plugin: unknown = plugins[i];
    if (typeof plugin === 'function') {
      const name = plugin.name || '(anonymous)';
      warnOnce(
        'legacy-stylis-plugin',
        `plugin "${name}" is a stylis middleware function; v7 plugins are objects with an \`rw\` and/or \`decl\` hook. Rewrite the plugin as such an object.`,
        name
      );
      continue;
    }
    if (typeof plugin !== 'object' || plugin === null) continue;
    const name = 'name' in plugin && typeof plugin.name === 'string' ? plugin.name : '';
    if (!name) continue;
    const rw = 'rw' in plugin ? plugin.rw : undefined;
    const decl = 'decl' in plugin ? plugin.decl : undefined;
    if (rw === undefined && decl === undefined) {
      warnOnce(
        'plugin-no-hooks',
        `plugin "${name}" defines neither \`rw\` nor \`decl\`; it is never invoked. Add one of those hooks or remove the plugin.`,
        name
      );
    }
  }
}

// Reset once per RSC render.
const ensureSheetReset: (() => void) | null = IS_RSC
  ? React.cache(() => {
      mainSheet.names.clear();
      mainSheet.clearTag();
    })
  : null;

type ServerStylesHolder = { plugins?: unknown };

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

/**
 * Sets the plugins every server component is styled with, for the whole
 * server process. Call it once, at the top level of a module every server
 * render loads before any page renders (in Next.js, the root layout file). A
 * later call replaces an earlier
 * one and applies to renders that start after it. A `StyleSheetManager` inside
 * a server component starts from these plugins; `plugins={[]}` drops them.
 * Client components take their plugins from a client `StyleSheetManager`.
 */
export function configureServerStyles(options: { plugins: SCPlugin[] }): void {
  if (!__SERVER__) {
    if (__DEV__) {
      warnOnce(
        'configure-server-styles-client',
        'configureServerStyles has no effect in the browser. Call it at the top level of a server component module, such as the root layout in Next.js, never from a client component or code bundled for the browser.'
      );
    }

    return;
  }

  if (__DEV__) warnUnsupportedPlugins(options.plugins);

  serverStyles().plugins = options.plugins;
}

let lastNamespace: string | undefined;
let lastPlugins: SCPlugin[] | undefined;
let lastCompiler: Compiler | undefined;

/** Item by item, so an inline `plugins={[rscPlugin]}` (a new array on every render) still matches the last one. */
function samePlugins(a: SCPlugin[] | undefined, b: SCPlugin[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

/**
 * Managers repeated with the same settings (a manager per card, say) share one
 * compiler and so its compile caches, which a compiler per manager would throw
 * away on every card.
 */
function compilerFor(namespace: string | undefined, plugins: SCPlugin[] | undefined): Compiler {
  if (lastCompiler && lastNamespace === namespace && samePlugins(lastPlugins, plugins)) {
    return lastCompiler;
  }

  lastNamespace = namespace;
  lastPlugins = plugins;
  lastCompiler = createCompiler({ options: { namespace }, plugins });

  return lastCompiler;
}

let derivedFrom: SCPlugin[] | undefined;
let derivedContext: IStyleSheetContext | undefined;

/** The context a server component sees outside every manager: the configured plugins, or the plain defaults. */
function serverDefaults(): IStyleSheetContext {
  const configured = serverStyles().plugins;
  if (!Array.isArray(configured) || !configured.length) return defaultContextValue;

  const plugins: SCPlugin[] = configured;

  if (derivedContext === undefined || derivedFrom !== plugins) {
    derivedFrom = plugins;
    derivedContext = {
      compiler: createCompiler({ plugins }),
      plugins,
      shouldForwardProp: undefined,
      styleSheet: mainSheet,
    };
  }

  return derivedContext;
}

export type IStyleSheetContext = {
  shouldForwardProp?: ShouldForwardProp<'web'> | undefined;
  styleSheet: StyleSheet;
  compiler: Compiler;
  /** Preserved for inheritance; inner SSMs that set namespace but not plugins
   *  still inherit the parent's plugins. */
  plugins?: SCPlugin[] | undefined;
};

const defaultContextValue: IStyleSheetContext = {
  shouldForwardProp: undefined,
  styleSheet: mainSheet,
  compiler: mainCompiler,
  plugins: undefined,
};

export const StyleSheetContext = !IS_RSC
  ? React.createContext<IStyleSheetContext>(defaultContextValue)
  : ({
      Provider: ({ children }: { children: React.ReactNode; value?: IStyleSheetContext }) =>
        children,
      Consumer: ({ children }: { children: (value: IStyleSheetContext) => React.ReactNode }) =>
        children(currentScope() ?? serverDefaults()),
    } as React.Context<IStyleSheetContext>);

export const StyleSheetConsumer = StyleSheetContext.Consumer;

export type ICompilerContext = Compiler | void;

export function useStyleSheetContext() {
  // biome-ignore lint/correctness/useHookAtTopLevel: IS_RSC is a load-time constant, so this branch is fixed for the whole bundle rather than varying per render
  if (!IS_RSC) return React.useContext(StyleSheetContext);

  // Reset mainSheet once per render to prevent HMR accumulation.
  // React.cache ensures this runs exactly once per render, so calling
  // it here AND in StyleSheetManager is safe; whichever runs first wins.
  if (ensureSheetReset) ensureSheetReset();

  return currentScope() ?? serverDefaults();
}

export type IStyleSheetManager = React.PropsWithChildren<{
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
   * possible; reach for this when bridging a third-party prop validator.
   * Component-level `withConfig({shouldForwardProp})` overrides this. Nested
   * SSMs inherit the parent's function unless this prop is set to
   * `undefined` or a passthrough.
   */
  shouldForwardProp?: undefined | IStyleSheetContext['shouldForwardProp'];
  /**
   * Plugins to apply during CSS emission. First-party plugins and the
   * `SCPlugin` / `DeclResult` / `DeclTransform` / `SelectorTransform` types
   * ship only via `styled-components/plugins` (`prefixPlugin`, `rscPlugin`,
   * `rtlPlugin`); they are not re-exported from the package root. Other
   * plugins must implement `{ name, rw?, decl? }`.
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

    const parent = currentScope() ?? serverDefaults();
    const hasCompilerProps = props.plugins !== undefined || props.namespace !== undefined;
    const plugins = props.plugins ?? parent.plugins;
    const shouldForwardProp =
      'shouldForwardProp' in props ? props.shouldForwardProp : parent.shouldForwardProp;

    if (__DEV__ && hasCompilerProps) warnUnsupportedPlugins(props.plugins);

    const compiler = !hasCompilerProps
      ? parent.compiler
      : props.namespace === undefined && !plugins?.length
        ? mainCompiler
        : compilerFor(props.namespace, plugins);

    if (
      compiler === parent.compiler &&
      shouldForwardProp === parent.shouldForwardProp &&
      plugins === parent.plugins
    ) {
      return <>{props.children}</>;
    }

    return (
      <>
        {scopeChildren(props.children, {
          compiler,
          plugins,
          shouldForwardProp,
          styleSheet: mainSheet,
        })}
      </>
    );
  }

  // biome-ignore-start lint/correctness/useHookAtTopLevel: the early return above is gated on IS_RSC, a load-time constant, so every render in a given bundle either reaches all of these hooks or none of them
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

  // When `namespace` changes, create a new instance but still inherit plugins
  // from the parent if `plugins` is omitted. An explicit empty array disables
  // inherited plugins.
  const compiler = React.useMemo(() => {
    if (props.plugins === undefined && props.namespace === undefined) {
      return parentContext.compiler;
    }
    warnUnsupportedPlugins(props.plugins);
    return createCompiler({
      options: { namespace: props.namespace },
      plugins: props.plugins ?? parentContext.plugins,
    });
  }, [props.namespace, props.plugins, parentContext.compiler, parentContext.plugins]);

  const shouldForwardProp =
    'shouldForwardProp' in props ? props.shouldForwardProp : parentContext.shouldForwardProp;

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
  // biome-ignore-end lint/correctness/useHookAtTopLevel: end of the IS_RSC-gated region

  return (
    <StyleSheetContext.Provider value={styleSheetContextValue}>
      {props.children}
    </StyleSheetContext.Provider>
  );
}
