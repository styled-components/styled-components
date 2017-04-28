import * as React from "react";

import styled, { css, keyframes, ThemeProvider, injectGlobal, withTheme, MyTheme, ThemeProps } from "./mytheme-styled-components";

interface MyComponentProps extends ThemeProps {
  text: string;
}

class MyComponent extends React.Component<MyComponentProps, {}> {
  render() {
    return <h1>{this.props.theme}</h1>;
  }
}

const theme: MyTheme = {
  primaryColor: "red",
  backgroundColor: "blue",
  defaultMargin: 10,
};

const text = "hey";

const MyThemedComponent = withTheme(MyComponent);

<MyThemedComponent text={text} />;
