import React, { Context } from 'react';
import { STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheetContext } from '../models/StyleSheetManager';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';
import StyleSheet from '../sheet';
import { ExecutionContext, ExecutionProps, Interpolation, Stringifier, Styles } from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import determineTheme from '../utils/determineTheme';
import generateComponentId from '../utils/generateComponentId';
import css from './css';

export default function createGlobalStyle<
  Props extends object,
  Theme extends object = DefaultTheme,
>(strings: Styles<Props, Theme>, ...interpolations: Array<Interpolation<Props, Theme>>) {
  const rules = css<Props, Theme>(strings, ...interpolations);
  const styledComponentId = `sc-global-${generateComponentId(JSON.stringify(rules))}`;
  const globalStyle = new GlobalStyle<Props, Theme>(rules, styledComponentId);

  if (process.env.NODE_ENV !== 'production') {
    checkDynamicCreation(styledComponentId);
  }

  const GlobalStyleComponent: React.ComponentType<ExecutionProps<Theme> & Props> = props => {
    const ssc = useStyleSheetContext();
    const theme = React.useContext<Theme | undefined>(ThemeContext as Context<Theme | undefined>);
    const instanceRef = React.useRef(ssc.styleSheet.allocateGSInstance(styledComponentId));

    const instance = instanceRef.current;

    if (process.env.NODE_ENV !== 'production' && React.Children.count(props.children)) {
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

    if (ssc.styleSheet.server) {
      renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
    }

    if (!__SERVER__) {
      React.useLayoutEffect(() => {
        if (!ssc.styleSheet.server) {
          renderStyles(instance, props, ssc.styleSheet, theme, ssc.stylis);
          return () => globalStyle.removeStyles(instance, ssc.styleSheet);
        }
      }, [instance, props, ssc.styleSheet, theme, ssc.stylis]);
    }

    return null;
  };

  function renderStyles(
    instance: number,
    props: ExecutionProps<Theme>,
    styleSheet: StyleSheet,
    theme: Theme | undefined,
    stylis: Stringifier
  ) {
    if (globalStyle.isStatic) {
      globalStyle.renderStyles(
        instance,
        STATIC_EXECUTION_CONTEXT as unknown as ExecutionContext<Theme> & Props,
        styleSheet,
        stylis
      );
    } else {
      const context = {
        ...props,
        theme: determineTheme<Theme>(props, theme, GlobalStyleComponent.defaultProps),
      } as ExecutionContext<Theme> & Props;

      globalStyle.renderStyles(instance, context, styleSheet, stylis);
    }
  }

  return React.memo(GlobalStyleComponent);
}
