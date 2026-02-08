import React from 'react';
import { IS_RSC } from '../constants';
import { ThemeContext } from '../models/ThemeProvider';
import { AnyComponent, ExecutionProps } from '../types';
import determineTheme from '../utils/determineTheme';
import getComponentName from '../utils/getComponentName';
import hoist, { NonReactStatics } from '../utils/hoist';

type WithThemeOuterProps<T extends AnyComponent> = Omit<
  React.ComponentPropsWithRef<T>,
  keyof ExecutionProps
> &
  ExecutionProps;

export default function withTheme<T extends AnyComponent>(
  Component: T
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<WithThemeOuterProps<T>> & React.RefAttributes<any>
> &
  NonReactStatics<T> {
  const WithTheme = React.forwardRef<any, WithThemeOuterProps<T>>((props, ref) => {
    const theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
    const themeProp = determineTheme(props, theme, Component.defaultProps);

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
  });

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`;

  return hoist(WithTheme, Component);
}
