import { renderToString } from "react-dom/server";
import styled, { ServerStyleSheet } from "..";

const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

const sheet = new ServerStyleSheet();
const html = renderToString(sheet.collectStyles(<Title>Hello world</Title>));
const css = sheet.getStyleTags();
