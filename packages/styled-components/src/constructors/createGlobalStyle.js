// @flow
import React, { useContext, useLayoutEffect, useRef } from 'react';
import { STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheet, useStylis } from '../models/StyleSheetManager';
import { ThemeContext } from '../models/ThemeProvider';
import type { Interpolation } from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import determineTheme from '../utils/determineTheme';
import generateComponentId from '../utils/generateComponentId';
import css from './css';

declare var __SERVER__: boolean;

type GlobalStyleComponentPropsType = Object;

export default function createGlobalStyle(
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) {
  const rules = css(strings, ...interpolations);
  const styledComponentId = `sc-global-${generateComponentId(JSON.stringify(rules))}`;
  const globalStyle = new GlobalStyle(rules, styledComponentId);

  if (process.env.NODE_ENV !== 'production') {
    checkDynamicCreation(styledComponentId);
  }

  function GlobalStyleComponent(props: GlobalStyleComponentPropsType) {
    const styleSheet = useStyleSheet();
    const stylis = useStylis();
    const theme = useContext(ThemeContext);
    const instanceRef = useRef(styleSheet.allocateGSInstance(styledComponentId));

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

    if (__SERVER__) {
      renderStyles(instance, props, styleSheet, theme, stylis);
    } else {
      // this conditional is fine because it is compiled away for the relevant builds during minification,
      // resulting in a single unguarded hook call
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useLayoutEffect(() => {
        renderStyles(instance, props, styleSheet, theme, stylis);
        return () => globalStyle.removeStyles(instance, styleSheet);
      }, [instance, props, styleSheet, theme, stylis]);
    }

    return null;
  }

  function renderStyles(instance, props, styleSheet, theme, stylis) {
    if (globalStyle.isStatic) {
      globalStyle.renderStyles(instance, STATIC_EXECUTION_CONTEXT, styleSheet, stylis);
    } else {
      const context = {
        ...props,
        theme: determineTheme(props, theme, GlobalStyleComponent.defaultProps),
      };

      globalStyle.renderStyles(instance, context, styleSheet, stylis);
    }
  }

  // $FlowFixMe
  return React.memo(GlobalStyleComponent);
}
