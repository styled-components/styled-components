// @flow
import React from 'react';
import { IS_BROWSER, STATIC_EXECUTION_CONTEXT } from '../constants';
import GlobalStyle from '../models/GlobalStyle';
import StyleSheet from '../models/StyleSheet';
import { StyleSheetConsumer } from '../models/StyleSheetManager';
import determineTheme from '../utils/determineTheme';
import { ThemeConsumer, type Theme } from '../models/ThemeProvider';
// $FlowFixMe
import hashStr from '../vendor/glamor/hash';
import css from './css';

import type { Interpolation } from '../types';

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

  class GlobalStyleComponent extends React.Component<*, *> {
    styleSheet: Object;

    static globalStyle = style;

    static styledComponentId = id;

    constructor() {
      super();

      const { globalStyle, styledComponentId } = this.constructor;

      if (IS_BROWSER) {
        window.scCGSHMRCache[styledComponentId] =
          (window.scCGSHMRCache[styledComponentId] || 0) + 1;
      }

      /**
       * This fixes HMR compatibility. Don't ask me why, but this combination of
       * caching the closure variables via statics and then persisting the statics in
       * state works across HMR where no other combination did. ¯\_(ツ)_/¯
       */
      this.state = {
        globalStyle,
        styledComponentId,
      };
    }

    componentWillUnmount() {
      if (window.scCGSHMRCache[this.state.styledComponentId]) {
        window.scCGSHMRCache[this.state.styledComponentId] -= 1;
      }
      /**
       * Depending on the order "render" is called this can cause the styles to be lost
       * until the next render pass of the remaining instance, which may
       * not be immediate.
       */
      if (window.scCGSHMRCache[this.state.styledComponentId] === 0) {
        this.state.globalStyle.removeStyles(this.styleSheet);
      }
    }

    render() {
      if (process.env.NODE_ENV !== 'production' && React.Children.count(this.props.children)) {
        // eslint-disable-next-line no-console
        console.warn(
          `The global style component ${
            this.state.styledComponentId
          } was given child JSX. createGlobalStyle does not render children.`
        );
      }

      return (
        <StyleSheetConsumer>
          {(styleSheet?: StyleSheet) => {
            this.styleSheet = styleSheet || StyleSheet.master;

            const { globalStyle } = this.state;

            if (globalStyle.isStatic) {
              globalStyle.renderStyles(STATIC_EXECUTION_CONTEXT, this.styleSheet);

              return null;
            } else {
              return (
                <ThemeConsumer>
                  {(theme?: Theme) => {
                    // $FlowFixMe
                    const { defaultProps } = this.constructor;

                    const context = {
                      ...this.props,
                    };

                    if (typeof theme !== 'undefined') {
                      context.theme = determineTheme(this.props, theme, defaultProps);
                    }

                    globalStyle.renderStyles(context, this.styleSheet);

                    return null;
                  }}
                </ThemeConsumer>
              );
            }
          }}
        </StyleSheetConsumer>
      );
    }
  }

  return GlobalStyleComponent;
}
