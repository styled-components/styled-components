import React from 'react';
import { IS_RSC } from '../utils/isRsc';
import { ThemeContext } from '../models/ThemeProvider';
import { AnyComponent, ExecutionProps } from '../types';
import determineTheme from '../utils/determineTheme';
import getComponentName from '../utils/getComponentName';
import hoist, { NonReactStatics } from '../utils/hoist';

type WithThemeOuterProps<T extends AnyComponent> = Omit<
  React.ComponentPropsWithRef<T>,
  keyof ExecutionProps
> &
  ExecutionProps & {
    ref?: React.Ref<any> | undefined;
  };

/** Higher-order component that injects the current theme as a prop. Prefer `useTheme` in function components. */
export default function withTheme<T extends AnyComponent>(
  Component: T
): React.FC<WithThemeOuterProps<T>> & NonReactStatics<T> {
  const WithTheme: React.FC<WithThemeOuterProps<T>> = props => {
    const theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
    const themeProp = determineTheme(props, theme);

    if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
      console.warn(
        `[withTheme] You are not using a ThemeProvider nor passing a theme prop to component "${getComponentName(
          Component
        )}"`
      );
    }

    return React.createElement(Component, {
      ...props,
      theme: themeProp,
    } as React.ComponentPropsWithRef<T>);
  };

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`;

  return hoist(WithTheme, Component);
}
