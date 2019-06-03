// @flow
import React from 'react';

import styled, { css, keyframes, createGlobalStyle } from 'styled-components';

import {
  LiveProvider as _LiveProvider,
  LiveEditor as _LiveEditor,
  LiveError as _LiveError,
  LivePreview as _LivePreview,
} from 'react-live';

import buttonExample from './Button.example';

const GlobalStyle = createGlobalStyle`
  body {
    font-size: 16px;
    line-height: 1.2;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    font-style: normal;
    padding: 0;
    margin: 0;
    color: rgb(46, 68, 78);
    -webkit-font-smoothing: subpixel-antialiased;
  }

  * {
    box-sizing: border-box;
  }
`;

const Body = styled.main`
  width: 100vw;
  min-width: 100vw;
  min-height: 100vh;

  background-image: linear-gradient(20deg, #e6356f, #69e7f7);

  padding: 30px 20px;
`;

const Heading = styled.div`
  text-align: center;
`;

const Title = styled.h1`
  @media (max-width: 40.625em) {
    font-size: 26px;
  }
`;

const Subtitle = styled.p``;

const Content = styled.div`
  width: 100%;
  max-width: 860px;

  margin: 0 auto;
  margin-top: 60px;
`;

const Code = styled.span`
  white-space: pre;
  vertical-align: middle;
  font-family: monospace;
  display: inline-block;
  background-color: #1e1f27;
  color: #c5c8c6;
  padding: 0.1em 0.3em 0.15em;
  font-size: 0.8em;
  border-radius: 0.2em;
`;

const LiveProvider = styled(_LiveProvider)`
  display: flex;
  flex-wrap: wrap;

  border-radius: 3px;
  overflow: hidden;

  box-shadow: 3px 3px 18px rgba(66, 22, 93, 0.3);
`;

const LiveBlock = styled.div`
  flex-basis: 50%;
  width: 50%;
  max-width: 50%;

  padding: 0.5rem;

  @media (max-width: 40.625em) {
    flex-basis: auto;
    width: 100%;
    max-width: 100%;
  }
`;

const LiveEditor = styled(LiveBlock.withComponent(_LiveEditor))`
  overflow: auto;
`;

const LivePreview = styled(LiveBlock.withComponent(_LivePreview))`
  background-color: white;
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
`;

const LiveError = styled(_LiveError)`
  flex-basis: 100%;
  background: #ff5555;
  color: #fff;
  padding: 0.5rem;
`;

const App = () => (
  <Body>
    <GlobalStyle />
    <Heading>
      <Title>
        Interactive sandbox for <Code>styled-components</Code>
      </Title>
      <Subtitle>
        Make changes to the <Code>./src</Code> and see them take effect in realtime!
      </Subtitle>
    </Heading>
    <Content>
      <LiveProvider
        code={buttonExample}
        scope={{ React, styled, css, createGlobalStyle, keyframes }}
        noInline
      >
        <LiveEditor />
        <LivePreview />
        <LiveError />
      </LiveProvider>
    </Content>
  </Body>
);

export default App;
