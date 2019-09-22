// @flow
import React, { useContext, useEffect } from 'react';
import { IS_BROWSER, STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheet } from '../models/StyleSheetManager';
import determineTheme from '../utils/determineTheme';
import { ThemeContext } from '../models/ThemeProvider';
import hasher from '../utils/hasher';
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
  const styledComponentId = `sc-global-${hasher(JSON.stringify(rules))}`;
  const globalStyle = new GlobalStyle(rules, styledComponentId);

  function GlobalStyleComponent(props: GlobalStyleComponentPropsType) {
    const styleSheet = useStyleSheet();
    const theme = useContext(ThemeContext);

    if (process.env.NODE_ENV !== 'production' && React.Children.count(props.children)) {
      // eslint-disable-next-line no-console
      console.warn(
        `The global style component ${styledComponentId} was given child JSX. createGlobalStyle does not render children.`
      );
    }

    if (globalStyle.isStatic) {
      globalStyle.renderStyles(STATIC_EXECUTION_CONTEXT, styleSheet);
    } else {
      const context = {
        ...props,
        theme: determineTheme(props, theme, GlobalStyleComponent.defaultProps),
      };

      globalStyle.renderStyles(context, styleSheet);
    }

    useEffect(() => {
      if (IS_BROWSER) {
        window.scCGSHMRCache[styledComponentId] =
          (window.scCGSHMRCache[styledComponentId] || 0) + 1;

        return () => {
          if (window.scCGSHMRCache[styledComponentId]) {
            window.scCGSHMRCache[styledComponentId] -= 1;
          }
          /**
           * Depending on the order "render" is called this can cause the styles to be lost
           * until the next render pass of the remaining instance, which may
           * not be immediate.
           */
          if (window.scCGSHMRCache[styledComponentId] === 0) {
            globalStyle.removeStyles(styleSheet);
          }
        };
      }
      return undefined;
    }, []);

    return null;
  }

  // $FlowFixMe
  return React.memo(GlobalStyleComponent);
}
