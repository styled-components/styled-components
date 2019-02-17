// @flow
import React, { useContext, useEffect, useRef } from 'react';
import { IS_BROWSER, STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheet } from '../models/StyleSheetManager';
import StyleSheet from '../models/StyleSheet';
import determineTheme from '../utils/determineTheme';
import { ThemeContext } from '../models/ThemeProvider';
// $FlowFixMe
import hashStr from '../vendor/glamor/hash';
import css from './css';

import type { Interpolation } from '../types';

type GlobalStyleComponentPropsType = Object;

// place our cache into shared context so it'll persist between HMRs
if (IS_BROWSER) {
  window.scCGSHMRCache = {};
}

export default function createGlobalStyle(
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) {
  const rules = css(strings, ...interpolations);
  const id = `sc-global-${hashStr(JSON.stringify(rules))}`;
  const style = new GlobalStyle(rules, id);

  function GlobalStyleComponent(props: GlobalStyleComponentPropsType) {
    const styleSheet = useStyleSheet();
    const theme = useContext(ThemeContext);
    const globalStyle = useRef(style);
    const styledComponentId = useRef(id);

    if (process.env.NODE_ENV !== 'production' && React.Children.count(props.children)) {
      // eslint-disable-next-line no-console
      console.warn(
        `The global style component ${
          styledComponentId.current
        } was given child JSX. createGlobalStyle does not render children.`
      );
    }

    if (globalStyle.current.isStatic) {
      globalStyle.current.renderStyles(STATIC_EXECUTION_CONTEXT, styleSheet);
    } else {
      const context = {
        ...props,
      };

      if (typeof theme !== 'undefined') {
        context.theme = determineTheme(props, theme);
      }

      globalStyle.current.renderStyles(context, styleSheet);
    }

    useEffect(() => {
      if (IS_BROWSER) {
        window.scCGSHMRCache[styledComponentId.current] =
          (window.scCGSHMRCache[styledComponentId.current] || 0) + 1;
      }

      return () => {
        if (window.scCGSHMRCache[styledComponentId.current]) {
          window.scCGSHMRCache[styledComponentId.current] -= 1;
        }
        /**
         * Depending on the order "render" is called this can cause the styles to be lost
         * until the next render pass of the remaining instance, which may
         * not be immediate.
         */
        if (window.scCGSHMRCache[styledComponentId.current] === 0) {
          globalStyle.current.removeStyles(styleSheet);
        }
      };
    }, []);

    return null;
  }

  return GlobalStyleComponent;
}
