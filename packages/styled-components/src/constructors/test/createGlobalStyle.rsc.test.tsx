/**
 * @jest-environment node
 */

import React, { Suspense } from 'react';
import { renderPage, serverRules } from '../../test/rscStream';

/** The page's own markup: everything after the registry's tags. */
const rootOf = (html: string): string => html.slice(html.indexOf('<div id="root">'));

const unique = (rules: string[]): string[] => [...new Set(rules)];

describe('createGlobalStyle in server components', () => {
  it('sends a global as a style component carrying its id, rules and definition order, and writes no style tag into the page', async () => {
    let id = '';
    const page = await renderPage({
      server: ({ library: { createGlobalStyle } }) => {
        const GlobalStyle = createGlobalStyle`
          body { background: red; }
        `;
        id = GlobalStyle.styledComponentId;

        return <GlobalStyle />;
      },
    });

    expect(page.flight.errors).toEqual([]);
    expect(page.flight.clientProps).toEqual([
      { id, keyframes: [], rules: ['body{background:red;}'], seq: 1 },
    ]);
    expect(serverRules(page.streamed)).toEqual(['body{background:red;}']);
    expect(rootOf(page.streamed)).toBe('<div id="root"></div>');
  });

  it.each<[string, string | (() => string)]>([
    ['a static global style', 'red'],
    ['a dynamic global style', () => 'red'],
  ])('writes the keyframes %s references, once each', async (_label, color) => {
    let name = '';
    const page = await renderPage({
      server: ({ library: { createGlobalStyle, keyframes } }) => {
        const fade = keyframes`from { opacity: 0; }`;
        name = fade.getName();
        const GlobalStyle = createGlobalStyle`
          body { animation: ${fade} 1s; color: ${color}; }
          h1 { animation: ${fade} 2s; }
        `;

        return <GlobalStyle />;
      },
    });

    expect(page.flight.clientProps[0].keyframes).toHaveLength(1);
    expect(unique(serverRules(page.streamed)).sort()).toEqual(
      [
        `@keyframes ${name}{from{opacity:0;}}`,
        `body{animation:${name} 1s;color:red;}`,
        `h1{animation:${name} 2s;}`,
      ].sort()
    );
  });

  it('writes the rules of each distinct prop value a dynamic global renders with', async () => {
    const page = await renderPage({
      server: ({ library: { createGlobalStyle } }) => {
        const GlobalStyle = createGlobalStyle<{ $bg: string }>`
          body { background: ${props => props.$bg}; }
        `;

        return (
          <>
            <GlobalStyle $bg="red" />
            <GlobalStyle $bg="blue" />
            <GlobalStyle $bg="red" />
          </>
        );
      },
    });

    expect(unique(serverRules(page.streamed))).toEqual([
      'body{background:red;}',
      'body{background:blue;}',
    ]);
  });

  it('writes the props of a global rendered many times once into the payload', async () => {
    const page = await renderPage({
      server: ({ library: { createGlobalStyle } }) => {
        const GlobalStyle = createGlobalStyle`
          body { margin: 0; }
        `;

        return (
          <>
            {Array.from({ length: 25 }, (_, index) => (
              <GlobalStyle key={index} />
            ))}
          </>
        );
      },
    });

    expect(page.flight.payload.split('body{margin:0;}')).toHaveLength(2);
    expect(unique(serverRules(page.streamed))).toEqual(['body{margin:0;}']);
  });

  it('renders a themed global with no theme gracefully', async () => {
    const page = await renderPage({
      server: ({ library: { createGlobalStyle } }) => {
        const GlobalStyle = createGlobalStyle`
          body { color: ${props => (props.theme && props.theme.color) || 'black'}; }
        `;

        return <GlobalStyle />;
      },
    });

    expect(serverRules(page.streamed)).toEqual(['body{color:black;}']);
  });

  it('keeps a global ahead of the components of the same page', async () => {
    const page = await renderPage({
      server: ({ library: { createGlobalStyle, styled } }) => {
        const Heading = styled.h1`
          color: red;
        `;
        const GlobalStyle = createGlobalStyle`
          body { margin: 0; }
        `;

        return (
          <>
            <Heading id="a">Hello</Heading>
            <GlobalStyle />
          </>
        );
      },
    });
    const [, name] = /class="[^ "]* ([^ "]*)"/.exec(page.streamed) ?? [];

    expect(serverRules(page.streamed)).toEqual(['body{margin:0;}', `.${name}{color:red;}`]);
  });

  it('puts a server global ahead of a client global that rendered before it', async () => {
    const page = await renderPage({
      clients: ({ library: { createGlobalStyle } }) => ({
        ClientGlobal: createGlobalStyle`
          body { padding: 1px; }
        `,
      }),
      server: ({ clients, library: { createGlobalStyle } }) => {
        const ServerGlobal = createGlobalStyle`
          body { margin: 0; }
        `;

        return (
          <>
            <clients.ClientGlobal />
            <ServerGlobal />
          </>
        );
      },
    });

    expect(unique(serverRules(page.streamed))).toEqual(['body{margin:0;}', 'body{padding:1px;}']);
  });

  it('writes the namespaced rules of globals under different StyleSheetManager settings apart', async () => {
    const page = await renderPage({
      server: ({ library: { createGlobalStyle, StyleSheetManager } }) => {
        const GlobalStyle = createGlobalStyle`
          body { margin: 0; }
        `;

        return (
          <>
            <StyleSheetManager namespace="first">
              <GlobalStyle />
            </StyleSheetManager>
            <StyleSheetManager namespace="second">
              <GlobalStyle />
            </StyleSheetManager>
          </>
        );
      },
    });

    expect(unique(serverRules(page.streamed))).toEqual([
      'first body{margin:0;}',
      'second body{margin:0;}',
    ]);
  });

  describe('across a Suspense boundary (#5808)', () => {
    it('keeps the global after React reveals the content behind the boundary', async () => {
      const page = await renderPage({
        server: ({ gates, library: { createGlobalStyle } }) => {
          const GlobalStyle = createGlobalStyle`
            body { background: papayawhip; }
          `;
          const Resolved = async () => {
            await gates.wait('late');

            return <GlobalStyle />;
          };

          return (
            <div>
              <Suspense fallback={<GlobalStyle />}>
                <Resolved />
              </Suspense>
            </div>
          );
        },
      });

      expect(unique(serverRules(page.revealed))).toEqual(['body{background:papayawhip;}']);
    });

    it('keeps the layout global when a page below it renders the same global first', async () => {
      const page = await renderPage({
        server: ({ gates, library: { createGlobalStyle } }) => {
          const GlobalStyle = createGlobalStyle`
            body { background: papayawhip; }
          `;
          const Page = () => (
            <>
              <GlobalStyle />
              <p>page</p>
            </>
          );
          const Layout = async ({ children }: { children: React.ReactNode }) => {
            await gates.wait('layout');

            return (
              <>
                <main>{children}</main>
                <GlobalStyle />
              </>
            );
          };

          return (
            <div>
              <Suspense fallback={<i>loading</i>}>
                <Layout>
                  <Page />
                </Layout>
              </Suspense>
            </div>
          );
        },
      });

      expect(unique(serverRules(page.revealed))).toEqual(['body{background:papayawhip;}']);
    });
  });

  describe('global styles whose rules contain a function', () => {
    it.each([
      [
        'function-only globals',
        ({ createGlobalStyle }: Library) => [
          createGlobalStyle`${() => 'html { --a: 1; }'}`,
          createGlobalStyle`${() => 'html { --b: 1; }'}`,
        ],
        ['html{--a:1;}', 'html{--b:1;}'],
      ],
      [
        'function-argument globals',
        ({ createGlobalStyle }: Library) => [
          createGlobalStyle(() => 'html { --fn-a: 1; }'),
          createGlobalStyle(() => 'html { --fn-b: 1; }'),
        ],
        ['html{--fn-a:1;}', 'html{--fn-b:1;}'],
      ],
      [
        'nested function css helpers',
        ({ createGlobalStyle, css }: Library) => [
          createGlobalStyle`${css`${() => 'html { --nest-a: 1; }'}`}`,
          createGlobalStyle`${css`${() => 'html { --nest-b: 1; }'}`}`,
        ],
        ['html{--nest-a:1;}', 'html{--nest-b:1;}'],
      ],
      [
        'globals that share static text and differ by a function',
        ({ createGlobalStyle }: Library) => [
          createGlobalStyle`html { color: ${() => 'red'}; }`,
          createGlobalStyle`html { color: ${() => 'blue'}; }`,
        ],
        ['html{color:red;}', 'html{color:blue;}'],
      ],
      [
        'factory closures',
        ({ createGlobalStyle }: Library) => {
          const make = (token: string) => createGlobalStyle`${() => `html { ${token}: 1; }`}`;

          return [make('--fact-a'), make('--fact-b')];
        },
        ['html{--fact-a:1;}', 'html{--fact-b:1;}'],
      ],
    ])('writes both %s', async (_label, build, expected) => {
      const page = await renderPage({
        server: ({ library }) => {
          const [First, Second] = build(library);

          return (
            <>
              <First />
              <Second />
            </>
          );
        },
      });

      expect(unique(serverRules(page.streamed))).toEqual(expected);
    });

    it('keeps one id for two calls with the same static text', async () => {
      const ids: string[] = [];
      const page = await renderPage({
        server: ({ library: { createGlobalStyle } }) => {
          const First = createGlobalStyle`html { --same: 1; }`;
          const Second = createGlobalStyle`html { --same: 1; }`;
          ids.push(First.styledComponentId, Second.styledComponentId);

          return (
            <>
              <First />
              <Second />
            </>
          );
        },
      });

      expect(ids[0]).toBe(ids[1]);
      expect(unique(serverRules(page.streamed))).toEqual(['html{--same:1;}']);
    });
  });
});

type Library = Parameters<Parameters<typeof renderPage>[0]['server']>[0]['library'];
