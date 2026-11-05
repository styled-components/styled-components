import React from 'react';
import {
  IS_BROWSER,
  RSC_REDUNDANT_EMIT_WARN_THRESHOLD,
  STATIC_EXECUTION_CONTEXT,
} from '../constants';
import { IS_RSC } from '../utils/isRsc';
import WebGlobalStyle, { deleteInstance, getInstance } from '../models/WebGlobalStyle';
import { useStyleSheetContext } from '../models/StyleSheetManager';
import { ThemeContext } from '../models/ThemeProvider';
import { ExecutionContext, ExecutionProps, Interpolation, Styles } from '../types';
import determineTheme from '../utils/determineTheme';
import generateComponentId from '../utils/generateComponentId';
import { joinKeyframes, joinRules, stripSplitter } from '../utils/joinStrings';
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
    __DEV__ && rules.some(rule => typeof rule === 'string' && rule.indexOf('@import') !== -1);

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

    // Not `__SERVER__`: the server build has no insertion effects below, so a
    // write here under jsdom would pile up with no cleanup. A sheet forced into
    // server mode under a build where `__SERVER__` is false needs the runtime
    // flag too.
    const writesInRender = IS_RSC || ssc.styleSheet.server;

    // A server render with no sheet to collect the result has no use for it.
    if (__SERVER__ && !writesInRender) return null;

    // Interpolations are this component's render body and may call hooks, so
    // they run on every render that writes. Only the sheet write waits. A
    // static global has none, so it keeps the entry it registered.
    const entry =
      (globalStyle.isStatic && getInstance(ssc.styleSheet, styledComponentId, instance)) ||
      globalStyle.computeRules(
        instance,
        (globalStyle.isStatic
          ? STATIC_EXECUTION_CONTEXT
          : { ...props, theme: determineTheme(props, theme) }) as ExecutionContext & Props,
        ssc.compiler
      );

    if (writesInRender) {
      globalStyle.renderStyles(instance, entry, ssc.styleSheet);
    }

    if (!__SERVER__ && !IS_RSC) {
      // Two insertion effects: cleanup (removeStyles → rebuildGroup) only
      // fires on unmount/sheet/globalStyle swap, not every render; dynamic
      // globals would otherwise rebuild twice per render (issue #5730).
      //
      // useInsertionEffect rather than useLayoutEffect because both halves
      // only write to the stylesheet, which is the one job the hook exists
      // for, and because it lands global rules ahead of every consumer's
      // layout effect instead of beside them. Neither half may start
      // reading a ref or setting state: React attaches refs after insertion
      // effects run, and scheduling an update from one is a runtime error.

      // biome-ignore-start lint/correctness/useHookAtTopLevel: this whole block sits under `if (!__SERVER__ && !IS_RSC)`, both build or load-time constants, so a given bundle always runs all of these hooks or none of them
      React.useInsertionEffect(() => {
        if (!ssc.styleSheet.server) {
          globalStyle.renderStyles(instance, entry, ssc.styleSheet);
        }
      }, [instance, entry, ssc.styleSheet, globalStyle]);

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
      // Keyframes last: `@import` and `@namespace` only count ahead of every other rule in a tag.
      const css = !IS_BROWSER ? joinRules(entry.rules) + joinKeyframes(entry.keyframes) : '';

      // The RSC branch renders into the long-lived default sheet, so its entry is freed here.
      if (!IS_BROWSER) {
        deleteInstance(ssc.styleSheet, styledComponentId, instance);
      }

      if (css) {
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

    return null;
  };

  const memoized = React.memo(GlobalStyleComponent) as React.NamedExoticComponent<
    ExecutionProps & Props
  > & { styledComponentId: string };
  memoized.styledComponentId = styledComponentId;
  return memoized;
}
