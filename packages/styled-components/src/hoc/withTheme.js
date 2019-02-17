// @flow
import React, { useContext, type AbstractComponent } from 'react';
import { ThemeContext } from '../models/ThemeProvider';
import determineTheme from '../utils/determineTheme';
import getComponentName from '../utils/getComponentName';
import hoistStatics from '../utils/hoist';

export default <Config: { theme?: any }, Instance>(
  Component: AbstractComponent<Config, Instance>
  // eslint-disable-next-line no-undef
): AbstractComponent<$Diff<Config, { theme?: any }> & { theme?: any }, Instance> => {
  const WithTheme = React.forwardRef<Config, Instance>((props, ref) => {
    const theme = useContext(ThemeContext);
    // $FlowFixMe defaultProps isn't declared so it can be inferrable
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
  });

  hoistStatics(WithTheme, Component);

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`;

  return WithTheme;
};
