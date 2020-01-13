import React from 'react';
import { renderToString } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';
import App from './App';

const sheet = new ServerStyleSheet();

export const html = renderToString(sheet.collectStyles(<App />));
export const css = sheet.getStyleTags();
