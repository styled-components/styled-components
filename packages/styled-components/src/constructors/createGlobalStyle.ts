import React from 'react';
import { IS_RSC, STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheetContext } from '../models/StyleSheetManager';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';
import StyleSheet from '../sheet';
import { getGroupForId } from '../sheet/GroupIDAllocator';
import { ExecutionContext, ExecutionProps, Interpolation, Stringifier, Styles } from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import determineTheme from '../utils/determineTheme';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import generateComponentId from '../utils/generateComponentId';
import { hash } from '../utils/hash';
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
    const theme = React.useContext ? React.useContext(ThemeContext) : undefined;
    
    // Use a ref to track cleanup state per component instance
    // This handles React StrictMode's simulated unmount/remount
    const cleanupRef = React.useRef<{ shouldRemove: boolean }>({ shouldRemove: true });

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
    // Use runtime check since __SERVER__ build constant may not match actual environment
    const shouldRenderStyles = typeof window === 'undefined' || !ssc.styleSheet.server;
    if (shouldRenderStyles) {
      renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
    }

    // Client-side cleanup: conditionally use useLayoutEffect
    // The __SERVER__ and IS_RSC checks are module-level and deterministic, so this doesn't violate rules of hooks
    if (!__SERVER__ && !IS_RSC) {
      React.useLayoutEffect(() => {
        // Signal that this component is mounted and styles should stay
        cleanupRef.current.shouldRemove = false;

        return () => {
          // Mark that we're in cleanup
          cleanupRef.current.shouldRemove = true;
          
          // Use queueMicrotask to delay cleanup slightly.
          // In React StrictMode's simulated unmount/remount, the next effect
          // will run before this microtask, setting shouldRemove = false.
          // In a real unmount, no new effect runs, so styles get removed.
          const ref = cleanupRef.current;
          queueMicrotask(() => {
            if (ref.shouldRemove) {
              globalStyle.removeStyles(instance, ssc.styleSheet);
            }
          });
        };
      }, [instance, ssc.styleSheet]);
    }

    // RSC mode: output style tag
    if (IS_RSC) {
      const id = styledComponentId + instance;
      const css =
        typeof window === 'undefined' ? ssc.styleSheet.getTag().getGroup(getGroupForId(id)) : '';

      if (css) {
        const cssHash = generateAlphabeticName(hash(css) >>> 0);
        const href = `sc-global-${styledComponentId}-${instance}-${cssHash}`;
        return React.createElement('style', {
          key: href,
          'data-styled-global': styledComponentId,
          precedence: 'styled-components',
          href,
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
