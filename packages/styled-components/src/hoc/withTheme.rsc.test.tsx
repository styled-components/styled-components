/**
 * @jest-environment node
 */

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import withTheme from './withTheme';

describe('withTheme RSC mode', () => {
  it('renders without errors in RSC mode', () => {
    const Inner = (props: { theme?: unknown; label: string }) =>
      React.createElement('span', null, props.label);

    const Themed = withTheme(Inner);

    const html = ReactDOMServer.renderToString(React.createElement(Themed, { label: 'hello' }));

    expect(html).toContain('hello');
  });

  it('receives undefined as theme in RSC mode', () => {
    let capturedTheme: unknown = 'sentinel';

    const Inner = (props: { theme?: unknown }) => {
      capturedTheme = props.theme;
      return React.createElement('div', null, 'probe');
    };

    const Themed = withTheme(Inner);

    // Suppress the expected console.warn from withTheme about missing ThemeProvider
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    ReactDOMServer.renderToString(React.createElement(Themed));

    expect(capturedTheme).toBeUndefined();

    spy.mockRestore();
  });
});
