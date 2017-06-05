import * as React from "react";

import styled from "../..";
import { css, keyframes, ThemeProvider, injectGlobal, withTheme, ThemeProps } from "../..";

class MyComponent extends React.Component<ThemeProps<{}>, {}> {
  render() {
    const { theme } = this.props;

    console.log("Current theme: ", theme);

    return <h1>Hello</h1>;
  }
}

export default withTheme(MyComponent);
