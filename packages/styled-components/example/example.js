import React from 'react';
import styled, { createGlobalStyle, keyframes, ThemeProvider } from '..';

export default () => {
  const GlobalStyle = createGlobalStyle`
    body {
      font-family: sans-serif;
    }
  `;

  // Create a <Title> react component that renders an <h1> which is
  // centered, palevioletred and sized at 1.5em
  const Title = styled.h1`
    font-size: 1.5em;
    text-align: center;
    color: ${props => props.theme.palevioletred};
    animation: ${keyframes`from { opacity: 0; }`} 1s both;
  `;

  // Create a <Wrapper> react component that renders a <section> with
  // some padding and a papayawhip background
  const Wrapper = styled.section`
    padding: 4em;
    background: ${props => props.theme.papayawhip};
  `;

  return class Example extends React.Component {
    render() {
      return (
        <ThemeProvider theme={{palevioletred: '#db7093', papayawhip: '#ffefd5'}}>
          <Wrapper>
            <GlobalStyle />
            <Title>Hello World, this is my first styled component!</Title>
          </Wrapper>
        </ThemeProvider>
      );
    }
  };
};
