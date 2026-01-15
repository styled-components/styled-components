import React from 'react';
import { ThemeContext } from '../models/ThemeProvider';
import { AnyComponent, ExecutionProps } from '../types';
import determineTheme from '../utils/determineTheme';
import getComponentName from '../utils/getComponentName';
import hoist, { NonReactStatics } from '../utils/hoist';

export default function withTheme<T extends AnyComponent>(
  Component: T
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<React.ComponentPropsWithRef<T> & ExecutionProps> & React.RefAttributes<T>
> &
  NonReactStatics<T> {
  const WithTheme = React.forwardRef<T, React.ComponentPropsWithRef<T> & ExecutionProps>(
    (props, ref) => {
      const theme = React.useContext ? React.useContext(ThemeContext) : undefined;
      const themeProp = determineTheme(props, theme, (Component as any).defaultProps);

      if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
        console.warn(
          `[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class "${getComponentName(
            Component
          )}"`
        );
      }

      return React.createElement(Component, {
        ...props,
        theme: themeProp,
        ref,
      } as React.ComponentPropsWithRef<T>);
    }
  );

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`;

  return hoist(WithTheme, Component);
}
