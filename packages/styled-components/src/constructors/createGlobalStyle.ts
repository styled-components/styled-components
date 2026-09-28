import React from 'react';
import {
  IS_BROWSER,
  RSC_REDUNDANT_EMIT_WARN_THRESHOLD,
  STATIC_EXECUTION_CONTEXT,
} from '../constants';
import { IS_RSC } from '../utils/isRsc';
import WebGlobalStyle from '../models/WebGlobalStyle';
import { useStyleSheetContext } from '../models/StyleSheetManager';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';
import StyleSheet from '../sheet';
import { Compiler, ExecutionContext, ExecutionProps, Interpolation, Styles } from '../types';
import determineTheme from '../utils/determineTheme';
import generateComponentId from '../utils/generateComponentId';
import { joinRules, stripSplitter } from '../utils/joinStrings';
import { getRscRequestState, noteRscEmit } from '../utils/rscCache';
import { warnOnce } from '../utils/warnOnce';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
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
  const globalStyle = new WebGlobalStyle<Props>(rules, styledComponentId);

  const hasImport =
    __DEV__ && rules.some(rule => typeof rule === 'string' && /@import/i.test(rule));

  if (__DEV__) {
    checkDynamicCreation(styledComponentId);
  }

  const GlobalStyleComponent: React.ComponentType<ExecutionProps & Props> = props => {
    const ssc = useStyleSheetContext();
    // biome-ignore lint/correctness/useHookAtTopLevel: IS_RSC is a load-time constant, so this branch is fixed for the whole bundle rather than varying per render
    const theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
    const instance = React.useId();

    if (__DEV__ && React.Children.count((props as { children?: React.ReactNode }).children)) {
      warnOnce(
        'gs-children',
        `the global style component ${styledComponentId} was given child JSX. createGlobalStyle does not render children. Remove the children.`,
        styledComponentId
      );
    }

    if (hasImport) {
      warnOnce(
        'gs-import',
        `@import CSS syntax is not supported in createGlobalStyle. Load the stylesheet with a <link> tag instead, injected with a library such as react-helmet or added to your index.html <head>.`,
        styledComponentId
      );
    }

    // Gate on IS_RSC or `styleSheet.server` rather than `__SERVER__`: the
    // server build elides the injection effect below, so rendering here
    // without cleanup produced an O(n²) jsdom regression. A sheet forced into
    // server mode under a build where `__SERVER__` is false needs the runtime
    // flag too.
    if (IS_RSC || ssc.styleSheet.server) {
      renderStyles(instance, props, ssc.styleSheet, theme, ssc.compiler);
    }

    if (!__SERVER__ && !IS_RSC) {
      // Two insertion effects: cleanup (removeStyles → rebuildGroup) only
      // fires on unmount/sheet/globalStyle swap, not every render; dynamic
      // globals would otherwise rebuild twice per render (issue #5730).
      // Including globalStyle in deps lets HMR-replaced instances trigger
      // re-injection.
      //
      // useInsertionEffect rather than useLayoutEffect because both halves
      // only write to the stylesheet, which is the one job the hook exists
      // for, and because it lands global rules ahead of every consumer's
      // layout effect instead of beside them. Neither half may start
      // reading a ref or setting state: React attaches refs after insertion
      // effects run, and scheduling an update from one is a runtime error.
      const renderDeps = globalStyle.isStatic
        ? [instance, ssc.styleSheet, globalStyle]
        : [instance, props, ssc.styleSheet, theme, ssc.compiler, globalStyle];

      // biome-ignore-start lint/correctness/useHookAtTopLevel: this whole block sits under `if (!__SERVER__ && !IS_RSC)`, both build or load-time constants, so a given bundle always runs all of these hooks or none of them
      const prevGlobalStyleRef = React.useRef(globalStyle);

      React.useInsertionEffect(() => {
        if (!ssc.styleSheet.server) {
          // HMR creates a new globalStyle instance but the componentId stays stable
          // (SWC plugin assigns by file location), so stale hasNameForId hits skip injection.
          if (prevGlobalStyleRef.current !== globalStyle) {
            ssc.styleSheet.clearRules(styledComponentId);
            prevGlobalStyleRef.current = globalStyle;
          }

          renderStyles(instance, props, ssc.styleSheet, theme, ssc.compiler);
        }
      }, renderDeps);

      // Cleanup-only effect: fires on unmount, sheet swap, or HMR globalStyle swap.
      // Closure captures the specific globalStyle/sheet that owned this instance's
      // rules so HMR cleanup targets the prior module's state.
      React.useInsertionEffect(() => {
        return () => {
          if (!ssc.styleSheet.server) {
            globalStyle.removeStyles(instance, ssc.styleSheet);
          }
        };
      }, [instance, ssc.styleSheet, globalStyle]);
      // biome-ignore-end lint/correctness/useHookAtTopLevel: end of the build-constant-gated region
    }

    // RSC: one plain tag per instance, no `precedence`; see docs/react.md "RSC style emission and Suspense".
    if (IS_RSC) {
      const entry = !IS_BROWSER ? globalStyle.instanceRules.get(instance) : undefined;
      const css = entry ? joinRules(entry.rules) : '';

      if (css) {
        globalStyle.instanceRules.delete(instance);

        const requestState = getRscRequestState ? getRscRequestState() : null;

        if (__DEV__ && requestState !== null) {
          const emitted = noteRscEmit(requestState, styledComponentId);
          if (emitted === RSC_REDUNDANT_EMIT_WARN_THRESHOLD) {
            warnOnce(
              'rsc-redundant-emit',
              `${emitted} instances of the global style ${styledComponentId} were rendered on one server-rendered page, so its styles repeat that many times in the HTML. A global style is normally mounted once, at the root of the app. Move it higher in the tree so it renders only once per page.`,
              styledComponentId
            );
          }
        }

        // Repeats of identical CSS share one element object so the
        // server-component payload writes the style once and refers back to
        // it; the key carries the global's ID, so two globals with the same
        // rules, or one under different StyleSheetManager settings
        // (different CSS), never share.
        const sharedElements = requestState !== null ? requestState.styleElements : null;
        const sharedKey = styledComponentId + '\n' + css;
        let styleElement = sharedElements ? sharedElements.get(sharedKey) : undefined;
        if (styleElement === undefined) {
          styleElement = React.createElement('style', {
            key: styledComponentId,
            'data-styled-global': styledComponentId,
            children: stripSplitter(css),
          });
          if (sharedElements) sharedElements.set(sharedKey, styleElement);
        }

        // Array-wrapped: React's server-component serializer writes a repeat
        // of a bare element as a reference to its props only, repeating the
        // element's type and key, but references a whole element inside an
        // array.
        return [styleElement];
      }
    }

    // Clean up server instance cache; no effect cleanup runs on the server,
    // so instanceRules would grow unboundedly across SSR requests.
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
    compiler: Compiler
  ) {
    if (globalStyle.isStatic) {
      globalStyle.renderStyles(
        instance,
        STATIC_EXECUTION_CONTEXT as unknown as ExecutionContext & Props,
        styleSheet,
        compiler
      );
    } else {
      const context = {
        ...props,
        theme: determineTheme(props, theme),
      } as ExecutionContext & Props;

      globalStyle.renderStyles(instance, context, styleSheet, compiler);
    }
  }

  const memoized = React.memo(GlobalStyleComponent) as React.NamedExoticComponent<
    ExecutionProps & Props
  > & { styledComponentId: string };
  memoized.styledComponentId = styledComponentId;
  return memoized;
}
