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

    expect(html).toMatchInlineSnapshot(`
      <div>
        hello
      </div>
    `);
  });

  it('styled components render correctly inside StyleSheetManager', () => {
    const Box = styled.div`
      display: flex;
      padding: 8px;
    `;

    const html = ReactDOMServer.renderToString(
      React.createElement(StyleSheetManager, null, React.createElement(Box))
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled>
        .bRHkvB{display:flex;padding:8px;}
      </style>
      <div class="sc-kqxcKS bRHkvB">
      </div>
    `);
  });

  it('nested SSM does not leak its override to a sibling subtree of the outer SSM', () => {
    const pluginOuter = { name: 'outerplug', rw: (s: string) => s };
    const pluginInner = { name: 'innerplug', rw: (s: string) => s };

    const seen: Array<{ tag: string; plugins: readonly { name: string }[] | undefined }> = [];
    function Probe({ tag }: { tag: string }) {
      const ctx = useStyleSheetContext();
      seen.push({ tag, plugins: ctx.plugins });
      return React.createElement('span', null, tag);
    }

    ReactDOMServer.renderToString(
      React.createElement(
        StyleSheetManager,
        { plugins: [pluginOuter] },
        React.createElement(Probe, { tag: 'A' }),
        React.createElement(
          StyleSheetManager,
          { plugins: [pluginInner] },
          React.createElement(Probe, { tag: 'B' })
        ),
        React.createElement(Probe, { tag: 'C' })
      )
    );

    const byTag = Object.fromEntries(
      seen.map(({ tag, plugins }) => [tag, plugins?.map(p => p.name) ?? null])
    );
    expect(byTag.A).toEqual(['outerplug']);
    expect(byTag.B).toEqual(['innerplug']);
    // C is the regression case: before the save/restore tokens it saw the
    // inner SSM's plugins because the leaked override survived past the
    // inner subtree.
    expect(byTag.C).toEqual(['outerplug']);
  });
});
