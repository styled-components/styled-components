// @flow
import React, { type ComponentType } from 'react';
import { ThemeConsumer, type Theme } from '../models';
import { determineTheme, getComponentName, hoistNonReactStatics } from '../utils';

export const withTheme = (Component: ComponentType<any>) => {
  const WithTheme = React.forwardRef((props, ref) => (
    <ThemeConsumer>
      {(theme?: Theme) => {
        // $FlowFixMe
        const { defaultProps } = Component;
        const themeProp = determineTheme(props, theme, defaultProps);

        if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
          // eslint-disable-next-line no-console
          console.warn(
            `[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class "${getComponentName(
              Component
            )}"`
          );
        }

        return <Component {...props} theme={themeProp} ref={ref} />;
      }}
    </ThemeConsumer>
  ));

  hoistNonReactStatics(WithTheme, Component);

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`;

  return WithTheme;
};
