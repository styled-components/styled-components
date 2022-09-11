import React from 'react';
import { STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheet, useStylis } from '../models/StyleSheetManager';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';
import StyleSheet from '../sheet';
import {
  ExecutionContext,
  ExecutionProps,
  Interpolation,
  RuleSet,
  Stringifier,
  Styles,
} from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import determineTheme from '../utils/determineTheme';
import generateComponentId from '../utils/generateComponentId';
import css from './css';

export default function createGlobalStyle<Props extends object>(
  strings: Styles<Props>,
  ...interpolations: Array<Interpolation<Props>>
) {
  const rules = css(strings, ...interpolations) as RuleSet<Props>;
  const styledComponentId = `sc-global-${generateComponentId(JSON.stringify(rules))}`;
  const globalStyle = new GlobalStyle<Props>(rules, styledComponentId);

  if (process.env.NODE_ENV !== 'production') {
    checkDynamicCreation(styledComponentId);
  }

  const GlobalStyleComponent: React.ComponentType<ExecutionProps> = props => {
    const styleSheet = useStyleSheet();
    const stylis = useStylis();
    const theme = React.useContext(ThemeContext);
    const instanceRef = React.useRef(styleSheet.allocateGSInstance(styledComponentId));

    const instance = instanceRef.current;

    if (process.env.NODE_ENV !== 'production' && React.Children.count(props.children)) {
      // eslint-disable-next-line no-console
      console.warn(
        `The global style component ${styledComponentId} was given child JSX. createGlobalStyle does not render children.`
      );
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      rules.some(rule => typeof rule === 'string' && rule.indexOf('@import') !== -1)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `Please do not use @import CSS syntax in createGlobalStyle at this time, as the CSSOM APIs we use in production do not handle it well. Instead, we recommend using a library such as react-helmet to inject a typical <link> meta tag to the stylesheet, or simply embedding it manually in your index.html <head> section for a simpler app.`
      );
    }

    if (styleSheet.server) {
      renderStyles(instance, props, styleSheet, theme, stylis);
    }

    if (!__SERVER__) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      // @ts-expect-error still using React 17 types for the time being
      (React.useInsertionEffect || React.useLayoutEffect)(() => {
        if (!styleSheet.server) {
          renderStyles(instance, props, styleSheet, theme, stylis);
          return () => globalStyle.removeStyles(instance, styleSheet);
        }
      }, [instance, props, styleSheet, theme, stylis]);
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
