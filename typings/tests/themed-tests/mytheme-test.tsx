import * as React from "react";

import styled, { css, keyframes, ThemeProvider, injectGlobal, MyTheme } from "./mytheme-styled-components";

// Create a <Title> react component that renders an <h1> which is
// centered, palevioletred and sized at 1.5em
const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: ${p => p.theme.primaryColor};
`;

const RedTitle = Title.extend`
  color: red;
  border-color: ${p => p.theme.primaryColor};
`;

// Create a <Wrapper> react component that renders a <section> with
// some padding and a papayawhip background
const Wrapper = styled.section`
  background: ${p => p.theme.backgroundColor};
`;

const Input = styled.input`
  font-size: 1.25em;
  padding: 0.5em;
  margin: ${p => p.theme.defaultMargin}em;
  color: palevioletred;
  background: papayawhip;
  border: none;
  border-radius: 3px;

  &:hover {
    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
  }
`;

interface ButtonProps {
  name: string;
  primary?: boolean;
}

class MyButton extends React.Component<ButtonProps, {}> {
  render() {
    return <button>Custom button</button>;
  }
}

const TomatoButton = styled(MyButton)`
  color: tomato;
  border-color: tomato;
`;

const CustomizableButton = styled(MyButton)`
  /* Adapt the colors based on primary prop */
  background: ${props => props.primary ? "palevioletred" : "white"};
  color: ${props => props.primary ? "white" : "palevioletred"};

  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid ${props => props.theme.primaryColor};
  border-radius: 3px;
`;


const example = css`
  font-size: 1.5em;
  text-align: center;
  color: ${props => props.theme.primaryColor};
  border-color: ${"red"};
`;

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const theme: MyTheme = {
  primaryColor: "mediumseagreen",
  backgroundColor: "yellow",
  defaultMargin: .5
};

injectGlobal`
  @font-face {
      font-family: 'Operator Mono';
      src: url('../fonts/Operator-Mono.ttf');
    }

    body {
        margin: 0;
    }
`;

class Example extends React.Component<{}, {}> {
  render() {
    return <ThemeProvider theme={theme}>
      <Wrapper>
        <Title>Hello World, this is my first styled component!</Title>

        <Input placeholder="@mxstbr" type="text" />
        <TomatoButton name="demo" />
      </Wrapper>;
    </ThemeProvider>;
  }
}
