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
import { mainSheet, useStyleSheetContext } from '../StyleSheetManager';
import { StyleSheetManager } from '../StyleSheetManager';
import { resetGroupIds } from '../../sheet/GroupIDAllocator';

describe('StyleSheetManager RSC mode', () => {
  beforeEach(() => {
    resetGroupIds();
    mainSheet.gs = {};
    mainSheet.names = new Map();
    mainSheet.clearTag();
  });

  it('useStyleSheetContext returns a valid default context', () => {
    let ctx: ReturnType<typeof useStyleSheetContext> | undefined;

    function Probe() {
      ctx = useStyleSheetContext();
      return React.createElement('div', null, 'probe');
    }

    ReactDOMServer.renderToString(React.createElement(Probe));

    expect(ctx).toBeDefined();
    expect(ctx!.styleSheet).toBe(mainSheet);
    expect(ctx!.stylis).toBeDefined();
    expect(typeof ctx!.stylis).toBe('function');
    expect(ctx!.shouldForwardProp).toBeUndefined();
  });

  it('StyleSheetManager wraps children without crashing', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(StyleSheetManager, null, React.createElement('div', null, 'hello'))
    );

    expect(html).toContain('hello');
  });

  it('styled components render correctly inside StyleSheetManager', () => {
    const Box = styled.div`
      display: flex;
      padding: 8px;
    `;

    const html = ReactDOMServer.renderToString(
      React.createElement(StyleSheetManager, null, React.createElement(Box))
    );

    expect(html).toContain('display:flex');
    expect(html).toContain('padding:8px');
  });
});
