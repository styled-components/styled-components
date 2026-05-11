/**
 * @jest-environment node
 */

jest.mock('../../utils/isRsc', () => ({ IS_RSC: true }));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from '../../constructors/styled';
import withTheme from '../../hoc/withTheme';
import { mainSheet } from '../StyleSheetManager';
import { resetGroupIds } from '../../sheet/GroupIDAllocator';

describe('ThemeProvider RSC mode', () => {
  beforeEach(() => {
    resetGroupIds();
    mainSheet.names = new Map();
    mainSheet.clearTag();
  });

  it('styled components accessing props.theme render without a ThemeProvider', () => {
    const Box = styled.div<{ theme?: { color?: string } }>`
      color: ${p => (p.theme && p.theme.color ? p.theme.color : 'black')};
    `;

    const html = ReactDOMServer.renderToString(React.createElement(Box));

    expect(html).toContain('color:black');
  });

  it('theme fallback produces undefined, not an error', () => {
    let capturedTheme: unknown = 'sentinel';

    const Probe = styled.div`
      color: ${p => {
        capturedTheme = p.theme;
        return 'red';
      }};
    `;

    ReactDOMServer.renderToString(React.createElement(Probe));

    // In RSC mode, theme context returns undefined since there's no context support
    expect(capturedTheme).toBeUndefined();
  });

  describe('withTheme in RSC', () => {
    it('renders without errors in RSC mode', () => {
      const Inner = (props: { theme?: unknown; label: string }) =>
        React.createElement('span', null, props.label);

      const Themed = withTheme(Inner);

      const html = ReactDOMServer.renderToString(React.createElement(Themed, { label: 'hello' }));

      expect(html).toMatchInlineSnapshot(`
        <span>
          hello
        </span>
      `);
    });

    it('receives undefined as theme in RSC mode', () => {
      let capturedTheme: unknown = 'sentinel';

      const Inner = (props: { theme?: unknown }) => {
        capturedTheme = props.theme;
        return React.createElement('div', null, 'probe');
      };

      const Themed = withTheme(Inner);

      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      ReactDOMServer.renderToString(React.createElement(Themed));

      expect(capturedTheme).toBeUndefined();

      spy.mockRestore();
    });
  });
});
