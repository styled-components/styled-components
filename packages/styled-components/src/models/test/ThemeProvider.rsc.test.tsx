/**
 * @jest-environment node
 */

jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from '../../constructors/styled';
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
});
