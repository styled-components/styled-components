// @flow
import React, { useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheet, useStylis } from '../models/StyleSheetManager';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import determineTheme from '../utils/determineTheme';
import { ThemeContext } from '../models/ThemeProvider';
import { EMPTY_ARRAY } from '../utils/empties';
import generateComponentId from '../utils/generateComponentId';
import css from './css';

import type { Interpolation } from '../types';

type GlobalStyleComponentPropsType = Object;

declare var __SERVER__: boolean;

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
      console.warn(
        `Please do not use @import CSS syntax in createGlobalStyle at this time, as the CSSOM APIs we use in production do not handle it well. Instead, we recommend using a library such as react-helmet to inject a typical <link> meta tag to the stylesheet, or simply embedding it manually in your index.html <head> section for a simpler app.`
      );
    }

    const instanceRef = useRef(null);

    function renderGlobalStyles() {
      if (instanceRef.current === null) {
        instanceRef.current = styleSheet.allocateGSInstance(styledComponentId);
      }

      const instance = instanceRef.current;

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

    useLayoutEffect(renderGlobalStyles);
    if (__SERVER__) {
      renderGlobalStyles();
    }

    useEffect(() => () => {
      if (instanceRef.current) {
        globalStyle.removeStyles(instanceRef.current, styleSheet);
      }
    }, EMPTY_ARRAY);

    return null;
  }

  // $FlowFixMe
  return React.memo(GlobalStyleComponent);
}
