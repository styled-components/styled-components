import * as React from "react";

import styled from "../..";
import { ThemeProvider, withTheme, ServerStyleSheet } from "../..";

// Create a <Title> react component that renders an <h1> which is
// centered, palevioletred and sized at 1.5em
const Title = styled("h1")`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

interface MyTheme {
  primary: string;
}

interface ButtonProps {
  name: string;
  primary?: boolean;
  theme: MyTheme;
}

const TomatoButton = styled<ButtonProps>("button")`
  color: tomato;
  border-color: tomato;

  /* Adapt the colors based on primary prop */
  background: ${props => props.primary ? "palevioletred" : "white"};
  color: ${props => props.primary ? "white" : "palevioletred"};

  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid ${props => props.theme.primary};
  border-radius: 3px;
`;

const theme = {
  main: "mediumseagreen",
};

class Example extends React.Component<{}, {}> {
  render() {
    return <ThemeProvider theme={theme}>
      <Title>Hello World, this is my first styled component!</Title>

      <TomatoButton name="demo" disabled />
    </ThemeProvider>;
  }
}


const name = "hey";

const ThemedButton = withTheme(TomatoButton);

<ThemedButton name={name} />;
