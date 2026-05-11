import React from 'react';
import { IS_RSC } from '../utils/isRsc';
import { ThemeContext } from '../models/ThemeProvider';
import { AnyComponent, ExecutionProps } from '../types';
import determineTheme from '../utils/determineTheme';
import getComponentName from '../utils/getComponentName';
import hoist, { NonReactStatics } from '../utils/hoist';
import { warnOnce } from '../utils/warnOnce';

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

    if (__DEV__ && themeProp === undefined) {
      const name = getComponentName(Component);
      warnOnce('withTheme', `no ThemeProvider or theme prop in scope for "${name}"`, name);
    }

    return React.createElement(Component, {
      ...props,
      theme: themeProp,
    } as React.ComponentPropsWithRef<T>);
  };

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`;

  return hoist(WithTheme, Component);
}
