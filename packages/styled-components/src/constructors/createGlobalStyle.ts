import React from 'react';
import { IS_RSC, STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheetContext } from '../models/StyleSheetManager';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';
import StyleSheet from '../sheet';
import { ExecutionContext, ExecutionProps, Interpolation, Stringifier, Styles } from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import determineTheme from '../utils/determineTheme';
import generateComponentId from '../utils/generateComponentId';
import { joinRules, stripSplitter } from '../utils/joinStrings';
import { createRSCCache } from '../utils/rscCache';
import css from './css';

declare const __SERVER__: boolean;

/** Per-render dedup for RSC global style tags (same pattern as StyledComponent). */
const getEmittedGlobalCSS = createRSCCache(() => new Set<string>());

/**
 * Create a component that injects global CSS when mounted. Supports theming and dynamic props.
 *
 * ```tsx
 * const GlobalStyle = createGlobalStyle`
 *   body { margin: 0; font-family: system-ui; }
 * `;
 * // Render <GlobalStyle /> at the root of your app
 * ```
 */
export default function createGlobalStyle<Props extends object>(
  strings: Styles<Props>,
  ...interpolations: Array<Interpolation<Props>>
) {
  const rules = css<Props>(strings, ...interpolations);
  const styledComponentId = `sc-global-${generateComponentId(JSON.stringify(rules))}`;
  const globalStyle = new GlobalStyle<Props>(rules, styledComponentId);

  if (process.env.NODE_ENV !== 'production') {
    checkDynamicCreation(styledComponentId);
  }

  const GlobalStyleComponent: React.ComponentType<ExecutionProps & Props> = props => {
    const ssc = useStyleSheetContext();
    const theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
    const instance = React.useId();

    if (
      process.env.NODE_ENV !== 'production' &&
      // @ts-expect-error invariant check
      React.Children.count(props.children)
    ) {
      console.warn(
        `The global style component ${styledComponentId} was given child JSX. createGlobalStyle does not render children.`
      );
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      rules.some(rule => typeof rule === 'string' && rule.indexOf('@import') !== -1)
    ) {
      console.warn(
        `Please do not use @import CSS syntax in createGlobalStyle at this time, as the CSSOM APIs we use in production do not handle it well. Instead, we recommend using a library such as react-helmet to inject a typical <link> meta tag to the stylesheet, or simply embedding it manually in your index.html <head> section for a simpler app.`
      );
    }

    // Render styles during component execution for RSC or explicit ServerStyleSheet.
    // Gate on IS_RSC or styleSheet.server (runtime flag from ServerStyleSheet),
    // NOT on __SERVER__ alone. The server build sets __SERVER__=true and eliminates
    // useLayoutEffect, so if we rendered here without cleanup, styles would
    // accumulate unboundedly in jsdom test environments (O(n²) regression).
    // On a real server without ServerStyleSheet, VirtualTag is used and styles are
    // discarded anyway, so skipping this path has no functional impact.
    // Turbopack resolves the browser entry for SSR, so __SERVER__ is false there;
    // styleSheet.server handles that case at runtime.
    if (IS_RSC || ssc.styleSheet.server) {
      renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
    }

    // Client-side lifecycle: render styles in effect and clean up on unmount.
    // __SERVER__ and IS_RSC are build/module-level constants, so this doesn't violate rules of hooks.
    if (!__SERVER__ && !IS_RSC) {
      // Split into two effects so cleanup (removeStyles → full rebuildGroup) only
      // fires on actual unmount or sheet/globalStyle swap -- NOT on every prop change.
      //
      // For dynamic globals, `props` is a new reference every render, so the render
      // effect re-runs each render. If cleanup ran on every re-run, each render would
      // do two full rebuildGroups (delete + reinsert all instances), which dominates
      // CPU on apps with frequent parent re-renders (issue #5730). Splitting lets
      // renderStyles' rulesEqual fast-path skip rebuildGroup when CSS is unchanged.
      //
      // globalStyle is included in render deps so HMR-induced module re-evaluation
      // (which creates a new GlobalStyle instance) triggers effect re-run.
      // For static rules, renderStyles exits early after the first injection
      // (via hasNameForId check), so the extra dep is effectively free at runtime.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const renderDeps = globalStyle.isStatic
        ? [instance, ssc.styleSheet, globalStyle]
        : [instance, props, ssc.styleSheet, theme, ssc.stylis, globalStyle];

      const prevGlobalStyleRef = React.useRef(globalStyle);

      React.useLayoutEffect(() => {
        if (!ssc.styleSheet.server) {
          // HMR creates a new globalStyle instance but the componentId stays stable
          // (SWC plugin assigns by file location), so stale hasNameForId hits skip injection.
          if (prevGlobalStyleRef.current !== globalStyle) {
            ssc.styleSheet.clearRules(styledComponentId);
            prevGlobalStyleRef.current = globalStyle;
          }

          renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
        }
      }, renderDeps);

      // Cleanup-only effect: fires on unmount, sheet swap, or HMR globalStyle swap.
      // Closure captures the specific globalStyle/sheet that owned this instance's
      // rules so HMR cleanup targets the prior module's state.
      React.useLayoutEffect(() => {
        return () => {
          if (!ssc.styleSheet.server) {
            globalStyle.removeStyles(instance, ssc.styleSheet);
          }
        };
      }, [instance, ssc.styleSheet, globalStyle]);
    }

    // RSC mode: output style tag.
    // Unlike regular styled components, global styles must NOT use React 19's
    // `precedence` attribute because it makes style tags persist as permanent
    // resources even after unmount. Global styles need lifecycle-based cleanup
    // for conditional rendering (e.g. body lock on modal open/close).
    if (IS_RSC) {
      const entry =
        typeof window === 'undefined' ? globalStyle.instanceRules.get(instance) : undefined;
      const css = entry ? joinRules(entry.rules) : '';

      if (css) {
        globalStyle.instanceRules.delete(instance);

        // Dedup: static by componentId + stylis hash, dynamic by CSS string.
        // Stylis hash ensures different SSM configs emit separate variants.
        const emitted = getEmittedGlobalCSS ? getEmittedGlobalCSS() : null;
        if (emitted) {
          const key = globalStyle.isStatic ? styledComponentId + ssc.stylis.hash : css;
          if (emitted.has(key)) return null;
          emitted.add(key);
        }

        return React.createElement('style', {
          key: styledComponentId + '-' + instance,
          'data-styled-global': styledComponentId,
          children: stripSplitter(css),
        });
      }
    }

    // Clean up server instance cache — no useLayoutEffect cleanup runs on the
    // server, so instanceRules would grow unboundedly across SSR requests.
    if (__SERVER__ || ssc.styleSheet.server) {
      globalStyle.instanceRules.delete(instance);
    }

    return null;
  };

  function renderStyles(
    instance: string,
    props: ExecutionProps,
    styleSheet: StyleSheet,
    theme: DefaultTheme | undefined,
    stylis: Stringifier
  ) {
    if (globalStyle.isStatic) {
      globalStyle.renderStyles(
        instance,
        STATIC_EXECUTION_CONTEXT as unknown as ExecutionContext & Props,
        styleSheet,
        stylis
      );
    } else {
      const context = {
        ...props,
        theme: determineTheme(props, theme),
      } as ExecutionContext & Props;

      globalStyle.renderStyles(instance, context, styleSheet, stylis);
    }
  }

  const memoized = React.memo(GlobalStyleComponent) as React.NamedExoticComponent<
    ExecutionProps & Props
  > & { styledComponentId: string };
  memoized.styledComponentId = styledComponentId;
  return memoized;
}
