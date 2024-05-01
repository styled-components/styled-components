import React from 'react';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';
import { AnyComponent, ExecutionProps } from '../types';
import determineTheme from '../utils/determineTheme';
import getComponentName from '../utils/getComponentName';
import hoist from '../utils/hoist';

export default function withTheme<T extends AnyComponent, Theme extends object = DefaultTheme>(
  Component: T
) {
  const WithTheme = React.forwardRef<T, JSX.LibraryManagedAttributes<T, ExecutionProps<Theme>>>(
    (props, ref) => {
      const theme = React.useContext(ThemeContext) as Theme | undefined;
      const themeProp = determineTheme(props, theme, Component.defaultProps);

      if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
        console.warn(
          `[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class "${getComponentName(
            Component
          )}"`
        );
      }

      return <Component {...props} theme={themeProp} ref={ref} />;
    }
  );

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`;

  return hoist(WithTheme, Component);
}
