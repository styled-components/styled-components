import React from 'react';
import { ThemeContext } from '../models/ThemeProvider';
import { ExecutionContext } from '../types';
import determineTheme from '../utils/determineTheme';
import getComponentName from '../utils/getComponentName';
import hoist from '../utils/hoist';

export default function withTheme<T extends React.ComponentType<any>>(Component: T) {
  const WithTheme = React.forwardRef<Element, ExecutionContext & React.ComponentProps<T>>(
    (props, ref) => {
      const theme = React.useContext(ThemeContext);
      const themeProp = determineTheme(props, theme, Component.defaultProps);

      if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
        // eslint-disable-next-line no-console
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
