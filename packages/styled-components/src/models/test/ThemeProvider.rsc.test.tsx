/**
 * @jest-environment node
 */

import React from 'react';
import { classesOf, renderPage, serverRules } from '../../test/rscStream';

describe('ThemeProvider in server components', () => {
  it('renders a styled component that reads props.theme without a ThemeProvider', async () => {
    const page = await renderPage({
      server: ({ library: { styled } }) => {
        const Box = styled.div<{ theme?: { color?: string } }>`
          color: ${p => (p.theme && p.theme.color ? p.theme.color : 'black')};
        `;

        return <Box id="a" />;
      },
    });
    const [, name] = classesOf(page.streamed, 'a');

    expect(serverRules(page.streamed)).toEqual([`.${name}{color:black;}`]);
  });

  it('hands interpolations an undefined theme, not an error', async () => {
    const captured: unknown[] = ['sentinel'];

    await renderPage({
      server: ({ library: { styled } }) => {
        const Probe = styled.div`
          color: ${p => {
            captured[0] = p.theme;

            return 'red';
          }};
        `;

        return <Probe />;
      },
    });

    expect(captured).toEqual([undefined]);
  });

  describe('withTheme', () => {
    it('renders the wrapped component and passes it an undefined theme', async () => {
      const captured: unknown[] = ['sentinel'];
      const page = await renderPage({
        server: ({ library: { withTheme } }) => {
          const Inner = (props: { label: string; theme?: unknown }) => {
            captured[0] = props.theme;

            return <span id="a">{props.label}</span>;
          };
          const Themed = withTheme(Inner);

          return <Themed label="hello" />;
        },
      });

      expect(captured).toEqual([undefined]);
      expect(page.streamed.slice(page.streamed.indexOf('<div id="root">'))).toBe(
        '<div id="root"><span id="a">hello</span></div>'
      );
    });
  });
});
