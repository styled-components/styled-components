
import hoistStatics from "hoist-non-react-statics";
import React, { ComponentType, useContext } from "react";
import { ThemeContext } from "../models/ThemeProvider";
import determineTheme from "../utils/determineTheme";
import getComponentName from "../utils/getComponentName";

export default function withTheme (Component: ComponentType<any>) {
  const WithTheme = React.forwardRef((props, ref) => {
    const theme = useContext(ThemeContext);
    const themeProp = determineTheme(props, theme, Component.defaultProps);

    if (process.env.NODE_ENV !== 'production' && themeProp === undefined) {
      // eslint-disable-next-line no-console
      console.warn(`[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class "${getComponentName(Component)}"`);
    }

    return <Component {...props} theme={themeProp} ref={ref} />;
  });

  hoistStatics(WithTheme, Component);

  WithTheme.displayName = `WithTheme(${getComponentName(Component)})`;

  return WithTheme;
}
