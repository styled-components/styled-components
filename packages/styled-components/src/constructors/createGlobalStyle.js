// @flow
import React, { useContext, useEffect, useRef } from 'react';
import { STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import { useStyleSheet } from '../models/StyleSheetManager';
import determineTheme from '../utils/determineTheme';
import { ThemeContext } from '../models/ThemeProvider';
import hasher from '../utils/hasher';
import css from './css';

import type { Interpolation } from '../types';

type GlobalStyleComponentPropsType = Object;

export default function createGlobalStyle(
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) {
  const rules = css(strings, ...interpolations);
  const styledComponentId = `sc-global-${hasher(JSON.stringify(rules))}`;
  const globalStyle = new GlobalStyle(rules, styledComponentId);
  let count = 0;

  function GlobalStyleComponent(props: GlobalStyleComponentPropsType) {
    const styleSheet = useStyleSheet();
    const theme = useContext(ThemeContext);
    const instanceRef = useRef(null);

    if (instanceRef.current === null) instanceRef.current = ++count;

    const instance = instanceRef.current;

    if (process.env.NODE_ENV !== 'production' && React.Children.count(props.children)) {
      // eslint-disable-next-line no-console
      console.warn(
        `The global style component ${styledComponentId} was given child JSX. createGlobalStyle does not render children.`
      );
    }

    if (globalStyle.isStatic) {
      globalStyle.renderStyles(instance, STATIC_EXECUTION_CONTEXT, styleSheet);
    } else {
      const context = {
        ...props,
        theme: determineTheme(props, theme, GlobalStyleComponent.defaultProps),
      };

      globalStyle.renderStyles(instance, context, styleSheet);
    }

    useEffect(() => () => globalStyle.removeStyles(instance, styleSheet), []);

    return null;
  }

  // $FlowFixMe
  return React.memo(GlobalStyleComponent);
}
