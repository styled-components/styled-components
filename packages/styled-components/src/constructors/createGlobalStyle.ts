import React from 'react';
import { IS_RSC, STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheetContext } from '../models/StyleSheetManager';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';
import StyleSheet from '../sheet';
import { removeGlobalStyleTag } from '../sheet/dom';
import { getGroupForId } from '../sheet/GroupIDAllocator';
import { ExecutionContext, ExecutionProps, Interpolation, Stringifier, Styles } from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import determineTheme from '../utils/determineTheme';
import generateComponentId from '../utils/generateComponentId';
import css from './css';

declare const __SERVER__: boolean;

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

  // Use a WeakMap to maintain stable instances per stylesheet
  const instanceMap = new WeakMap<StyleSheet, number>();

  const GlobalStyleComponent: React.ComponentType<ExecutionProps & Props> = props => {
    const ssc = useStyleSheetContext();
    const theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;

    // Get or create instance ID for this stylesheet
    let instance = instanceMap.get(ssc.styleSheet);
    if (instance === undefined) {
      instance = ssc.styleSheet.allocateGSInstance(styledComponentId);
      instanceMap.set(ssc.styleSheet, instance);
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

    // Render styles during component execution
    const shouldRenderStyles = typeof window === 'undefined' || !ssc.styleSheet.server;
    if (shouldRenderStyles) {
      renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
    }

    // Client-side lifecycle: render styles in effect and clean up on unmount.
    // __SERVER__ and IS_RSC are build/module-level constants, so this doesn't violate rules of hooks.
    if (!__SERVER__ && !IS_RSC) {
      React.useLayoutEffect(() => {
        // Re-render styles on every effect run to self-heal after any cleanup
        // (e.g. StrictMode's simulated unmount/remount, error recovery).
        // useLayoutEffect runs synchronously before paint, so the brief
        // remove→re-add in cleanup→mount is never visible to the user.
        if (!ssc.styleSheet.server) {
          renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
        }

        return () => {
          globalStyle.removeStyles(instance, ssc.styleSheet);
          removeGlobalStyleTag(styledComponentId);
        };
      }, [instance, props, ssc.styleSheet, theme, ssc.stylis]);
    }

    // RSC mode: output style tag.
    // Unlike regular styled components, global styles must NOT use React 19's
    // `precedence` attribute because it makes style tags persist as permanent
    // resources even after unmount. Global styles need lifecycle-based cleanup
    // for conditional rendering (e.g. body lock on modal open/close).
    if (IS_RSC) {
      const id = styledComponentId + instance;
      const css =
        typeof window === 'undefined' ? ssc.styleSheet.getTag().getGroup(getGroupForId(id)) : '';

      if (css) {
        return React.createElement('style', {
          key: `${styledComponentId}-${instance}`,
          'data-styled-global': styledComponentId,
          children: css,
        });
      }
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
