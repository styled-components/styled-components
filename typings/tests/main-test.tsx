import * as React from "react";

import styled from "../..";
import { css, keyframes, ThemeProvider, injectGlobal, withTheme, ServerStyleSheet } from "../..";

// Create a <Title> react component that renders an <h1> which is
// centered, palevioletred and sized at 1.5em
const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

// Create a <Wrapper> react component that renders a <section> with
// some padding and a papayawhip background
const Wrapper = styled.section`
  padding: 4em;
  background: papayawhip;
`;


const Input = styled.input`
  font-size: 1.25em;
  padding: 0.5em;
  margin: 0.5em;
  color: palevioletred;
  background: papayawhip;
  border: none;
  border-radius: 3px;

  &:hover {
    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
  }
`;

interface MyTheme {
  primary: string;
}

interface ButtonProps {
  name: string;
  primary?: boolean;
  theme?: MyTheme;
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
  border: 2px solid ${props => props.theme.primary};
  border-radius: 3px;
`;


const example = css`
  font-size: 1.5em;
  text-align: center;
  color: ${props => props.theme.primary};
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

const theme = {
  main: "mediumseagreen",
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

// css which only uses simple interpolations without functions
const cssWithValues1 = css`
  font-size: ${14}${"pt"};
`;
// css which uses other simple interpolations without functions
const cssWithValues2 = css`
  ${cssWithValues1}
  ${[cssWithValues1, cssWithValues1]}
  font-weight: ${"bold"};
`;
// injectGlobal accepts simple interpolations if they're not using functions
injectGlobal`
  ${"font-size"}: ${10}pt;
  ${cssWithValues1}
  ${[cssWithValues1, cssWithValues2]}
`;

// css which uses function interpolations with common props
const cssWithFunc1 = css`
  font-size: ${(props) => props.theme.fontSizePt}pt;
`;
const cssWithFunc2 = css`
  ${cssWithFunc1}
  ${props => cssWithFunc1}
  ${[cssWithFunc1, cssWithValues1]}
`;
// such css can be used in styled components
const styledButton = styled.button`
  ${cssWithValues1} ${[cssWithValues1, cssWithValues2]}
  ${cssWithFunc1} ${[cssWithFunc1, cssWithFunc2]}
  ${() => [cssWithFunc1, cssWithFunc2]}
`;
// css with function interpolations cannot be used in injectGlobal
/*
injectGlobal`
  ${cssWithFunc1}
`;
*/

const name = "hey";

const ThemedButton = withTheme(MyButton);

<ThemedButton name={name} />;
