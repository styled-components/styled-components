/**
 * @jest-environment node
 */

jest.mock('../../utils/isRsc', () => ({ IS_RSC: true }));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from '../../constructors/styled';
import {
  mainSheet,
  useStyleSheetContext,
  __resetRSCOverrideForTesting,
} from '../StyleSheetManager';
import { StyleSheetManager } from '../StyleSheetManager';
import { resetGroupIds } from '../../sheet/GroupIDAllocator';

describe('StyleSheetManager RSC mode', () => {
  beforeEach(() => {
    resetGroupIds();
    mainSheet.names = new Map();
    mainSheet.clearTag();
    __resetRSCOverrideForTesting();
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
    expect(ctx!.compiler).toBeDefined();
    expect(typeof ctx!.compiler.compile).toBe('function');
    expect(typeof ctx!.compiler.emit).toBe('function');
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

  // Nested SSM cleanup is documented as not supported in RSC mode: React 19
  // Flight calls immediate fragment children eagerly before descending into
  // dynamic subtrees, so any save/restore token pattern resets the slot
  // before children render. v7 ships with the inner override leaking to
  // sibling subtrees of the inner SSM. AsyncLocalStorage would close this
  // gap; tracked separately.
  it('outer SSM applies to descendants in RSC mode', () => {
    const pluginOuter = { name: 'outerplug', rw: (s: string) => s };

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
        React.createElement(Probe, { tag: 'B' })
      )
    );

    const byTag = Object.fromEntries(
      seen.map(({ tag, plugins }) => [tag, plugins?.map(p => p.name) ?? null])
    );
    expect(byTag.A).toEqual(['outerplug']);
    expect(byTag.B).toEqual(['outerplug']);
  });
});
