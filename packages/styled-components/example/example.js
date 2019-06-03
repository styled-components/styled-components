import React from 'react';
import styled, { createGlobalStyle, keyframes } from '..';

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
    color: palevioletred;
    animation: ${keyframes`from { opacity: 0; }`} 1s both;
  `;

  // Create a <Wrapper> react component that renders a <section> with
  // some padding and a papayawhip background
  const Wrapper = styled.section`
    padding: 4em;
    background: papayawhip;
  `;

  return class Example extends React.Component {
    render() {
      return (
        <Wrapper>
          <GlobalStyle />
          <Title>Hello World, this is my first styled component!</Title>
        </Wrapper>
      );
    }
  };
};
