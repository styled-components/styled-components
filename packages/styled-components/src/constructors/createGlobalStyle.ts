import React from 'react';
import { IS_RSC, SPLITTER, STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheetContext } from '../models/StyleSheetManager';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';
import StyleSheet from '../sheet';
import { ExecutionContext, ExecutionProps, Interpolation, Stringifier, Styles } from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import determineTheme from '../utils/determineTheme';
import generateComponentId from '../utils/generateComponentId';
import css from './css';

declare const __SERVER__: boolean;

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

    // Each mount needs a unique instance ID for the shared-group instanceRules cache.
    // __SERVER__ is a build-time constant: the dead branch is entirely eliminated,
    // so React never sees a conditional hook call.
    // Server bundle: direct allocation (one-shot renders, no stability needed).
    // Browser bundle: useRef for stable ID across re-renders + useLayoutEffect cleanup.
    let instance: number;
    if (__SERVER__) {
      instance = ssc.styleSheet.allocateGSInstance(styledComponentId);
    } else {
      const instanceRef = React.useRef<number | null>(null);
      if (instanceRef.current === null) {
        instanceRef.current = ssc.styleSheet.allocateGSInstance(styledComponentId);
      }
      instance = instanceRef.current;
    }

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
      // globalStyle is included in deps so HMR-induced module re-evaluation
      // (which creates a new GlobalStyle instance) triggers effect re-run.
      // For static rules, renderStyles exits early after the first injection
      // (via hasNameForId check), so the extra dep is effectively free at runtime.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const effectDeps = globalStyle.isStatic
        ? [instance, ssc.styleSheet, globalStyle]
        : [instance, props, ssc.styleSheet, theme, ssc.stylis, globalStyle];

      React.useLayoutEffect(() => {
        if (!ssc.styleSheet.server) {
          renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
        }

        return () => {
          globalStyle.removeStyles(instance, ssc.styleSheet);
        };
      }, effectDeps);
    }

    // RSC mode: output style tag.
    // Unlike regular styled components, global styles must NOT use React 19's
    // `precedence` attribute because it makes style tags persist as permanent
    // resources even after unmount. Global styles need lifecycle-based cleanup
    // for conditional rendering (e.g. body lock on modal open/close).
    if (IS_RSC) {
      // Each instance emits only its own rules (not the entire shared group)
      // because RSC renders are independent and each instance needs its own style tag.
      const entry =
        typeof window === 'undefined' ? globalStyle.instanceRules.get(instance) : undefined;
      let css = '';
      if (entry) {
        const rules = entry.rules;
        for (let i = 0; i < rules.length; i++) {
          css += rules[i] + SPLITTER;
        }
      }

      if (css) {
        globalStyle.instanceRules.delete(instance);
        return React.createElement('style', {
          key: styledComponentId + '-' + instance,
          'data-styled-global': styledComponentId,
          children: css,
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
    instance: number,
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
        theme: determineTheme(props, theme, GlobalStyleComponent.defaultProps),
      } as ExecutionContext & Props;

      globalStyle.renderStyles(instance, context, styleSheet, stylis);
    }
  }

  return React.memo(GlobalStyleComponent);
}
