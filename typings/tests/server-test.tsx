import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import styled, { consolidateStreamedStyles, ServerStyleSheet, StyleSheetManager } from "../..";

const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

const sheet = new ServerStyleSheet();
const html = sheet.collectStyles(<Title>Hello world</Title>);
const css = sheet.getStyleTags();
const styleElement = sheet.getStyleElement();

const sheet2 = new ServerStyleSheet();
const element = (
  <StyleSheetManager sheet={sheet2}>
    <Title>Hello world</Title>
  </StyleSheetManager>
);

const css2 = sheet2.getStyleElement();

// Wrapping a node stream returned from renderToNodeStream with interleaveWithNodeStream

const sheet3 = new ServerStyleSheet();
const appStream = ReactDOMServer.renderToNodeStream(<Title>Hello world</Title>);
const wrappedCssStream: NodeJS.ReadableStream = sheet3.interleaveWithNodeStream(appStream);

// Ensure presence of consolidateStreamedStyles

consolidateStreamedStyles();