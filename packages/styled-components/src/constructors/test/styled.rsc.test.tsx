/**
 * @jest-environment node
 */

import React, { Suspense } from 'react';
import rtlPlugin from '../../plugins/rtl';
import {
  classesOf,
  computedValue,
  generatedClass,
  loadSsrGraph,
  renderPage,
  serverRules,
} from '../../test/rscStream';
import type { Library } from '../../test/rscStream';
import { extensionScenarios, wrapperScenarios } from '../../test/rscScenarios';

/**
 * https://drafts.csswg.org/css-color-4/#serializing-sRGB-values: "For the computed and used value,
 * the corresponding sRGB value is used." A named color computes to its `rgb()` form.
 */
const RED = 'rgb(255, 0, 0)';

/** The page's own markup: everything after the registry's tags. */
const rootOf = (html: string): string => html.slice(html.indexOf('<div id="root">'));

/** Runs `load` with `rscScenarios` bound to `library`, the way a graph's own copy of the file would be. */
function scenariosFor(library: Library): typeof import('../../test/rscScenarios') {
  const loaded: Array<typeof import('../../test/rscScenarios')> = [];

  jest.isolateModules(() => {
    jest.doMock('../../index', () => library);
    loaded.push(require('../../test/rscScenarios'));
  });
  jest.dontMock('../../index');

  return loaded[0];
}

describe('styled in server components', () => {
  describe('what the server render carries', () => {
    it('sends a style component with the chain as props and writes no style tag into the page', async () => {
      const page = await renderPage({
        server: ({ library: { styled } }) => {
          const Button = styled.button`
            padding: 8px;
          `;

          return <Button id="a" />;
        },
      });
      const [componentId, name] = classesOf(page.streamed, 'a');

      expect(page.flight.errors).toEqual([]);
      expect(page.flight.clientProps).toEqual([
        { chain: [[componentId, name, [`.${name}{padding:8px;}`], 1]], keyframes: [], outers: [] },
      ]);
      expect(serverRules(page.streamed)).toEqual([`.${name}{padding:8px;}`]);
      expect(rootOf(page.streamed)).toBe(
        `<div id="root"><button id="a" class="${componentId} ${name}"></button></div>`
      );
    });

    it('lists an extension chain base first, each level on its own class', async () => {
      const page = await renderPage({
        server: ({ library: { styled } }) => {
          const Base = styled.div`
            display: flex;
          `;
          const Extended = styled(Base)`
            color: red;
          `;

          return <Extended id="a" />;
        },
      });
      const [baseId, extendedId, baseName, extendedName] = classesOf(page.streamed, 'a');

      expect(page.flight.clientProps).toEqual([
        {
          chain: [
            [baseId, baseName, [`.${baseName}{display:flex;}`], 1],
            [extendedId, extendedName, [`.${extendedName}{color:red;}`], 2],
          ],
          keyframes: [],
          outers: [],
        },
      ]);
      expect(serverRules(page.streamed)).toEqual([
        `.${baseName}{display:flex;}`,
        `.${extendedName}{color:red;}`,
      ]);
    });

    it('writes the props of many instances of one component once into the payload and the rules once into the page', async () => {
      const page = await renderPage({
        server: ({ library: { styled } }) => {
          const Cell = styled.span`
            padding: 3px;
          `;

          return (
            <>
              {Array.from({ length: 25 }, (_, index) => (
                <Cell key={index} />
              ))}
            </>
          );
        },
      });

      expect(page.flight.payload.split('{padding:3px;}')).toHaveLength(2);
      expect(serverRules(page.streamed)).toHaveLength(1);
    });

    it('writes a variant of a dynamic component for each distinct value, each once', async () => {
      const page = await renderPage({
        server: ({ library: { styled } }) => {
          const Box = styled.div<{ $color: string }>`
            color: ${p => p.$color};
          `;

          return (
            <>
              <Box id="a" $color="red" />
              <Box id="b" $color="blue" />
              <Box id="c" $color="red" />
            </>
          );
        },
      });
      const [, red] = classesOf(page.streamed, 'a');
      const [, blue] = classesOf(page.streamed, 'b');

      expect(serverRules(page.streamed)).toEqual([`.${red}{color:red;}`, `.${blue}{color:blue;}`]);
      expect(computedValue(page.streamed, '#c', 'color')).toBe(RED);
    });

    it.each([
      [
        'a dynamic interpolation',
        ['border-radius:8px;overflow:hidden;', 'border-left:4px solid #dc3545;'],
        ({ styled }: Library) => {
          const Card = styled.div`
            border-radius: 8px;
            overflow: hidden;
          `;
          const Status = styled(Card)<{ $status: 'success' | 'error' }>`
            border-left: 4px solid ${p => (p.$status === 'success' ? '#28a745' : '#dc3545')};
          `;

          return <Status id="a" $status="error" />;
        },
      ],
      [
        'the css helper',
        ['font-size:14px;overflow:hidden;white-space:nowrap;', 'padding:2px 8px;'],
        ({ css, styled }: Library) => {
          const truncate = css`
            overflow: hidden;
            white-space: nowrap;
          `;
          const Label = styled.span`
            font-size: 14px;
            ${truncate}
          `;
          const Badge = styled(Label)`
            padding: 2px 8px;
          `;

          return <Badge id="a" />;
        },
      ],
    ])(
      'carries the base chain when only the extension renders, through %s (#5663)',
      async (_label, [baseBody, extendedBody], build) => {
        const page = await renderPage({ server: ({ library }) => build(library) });
        const [, , baseName, extendedName] = classesOf(page.streamed, 'a');

        expect(serverRules(page.streamed)).toEqual([
          `.${baseName}{${baseBody}}`,
          `.${extendedName}{${extendedBody}}`,
        ]);
      }
    );

    it('applies the rules of an extension of a component with no rules (#5727)', async () => {
      const page = await renderPage({
        server: ({ library: { styled } }) => {
          const Inner = styled(({ className }: { className?: string }) => (
            <span id="a" className={className}>
              inner
            </span>
          ))``;
          const Outer = styled(Inner)`
            color: red;
            width: 100px;
          `;

          return <Outer />;
        },
      });

      expect(computedValue(page.streamed, '#a', 'color')).toBe(RED);
      expect(computedValue(page.streamed, '#a', 'width')).toBe('100px');
    });

    it('keeps a base selector that holds a url token whole', async () => {
      const page = await renderPage({
        server: ({ library: { styled } }) => {
          const Base = styled.div`
            ${() => 'url(&{}html{display:none})'} {
              top: 0;
            }
          `;
          const Extended = styled(Base)`
            color: red;
          `;

          return <Extended id="a" />;
        },
      });
      const [, , baseName, extendedName] = classesOf(page.streamed, 'a');

      expect(serverRules(page.streamed)).toEqual([
        `url(.${baseName}{}html{display:none}){top:0;}`,
        `.${extendedName}{color:red;}`,
      ]);
    });
  });

  describe('keyframes', () => {
    it('carries keyframes in the props and writes them ahead of the components', async () => {
      const page = await renderPage({
        server: ({ library: { keyframes, styled } }) => {
          const pulse = keyframes`
            0% { opacity: 1; }
            100% { opacity: 0; }
          `;
          const Dot = styled.div`
            animation: ${pulse} 2s infinite;
          `;

          return <Dot id="a" />;
        },
      });
      const [componentId, name] = classesOf(page.streamed, 'a');
      const [{ keyframes }] = page.flight.clientProps;
      const [[keyframesId, keyframesName]] = keyframes as string[][];

      expect(keyframes).toEqual([
        [
          keyframesId,
          keyframesName,
          [`@keyframes ${keyframesName}{0%{opacity:1;}100%{opacity:0;}}`],
        ],
      ]);
      expect(serverRules(page.streamed)).toEqual([
        `@keyframes ${keyframesName}{0%{opacity:1;}100%{opacity:0;}}`,
        `.${name}{animation:${keyframesName} 2s infinite;}`,
      ]);
      expect(componentId).toMatch(/^sc-/);
    });

    it('lists a keyframes name once when a base and its extension both reference it', async () => {
      const page = await renderPage({
        server: ({ library: { keyframes, styled } }) => {
          const fade = keyframes`
            0% { opacity: 1; }
            100% { opacity: 0; }
          `;
          const Base = styled.div`
            animation: ${fade} 1s;
          `;
          const Extended = styled(Base)`
            animation: ${fade} 2s;
          `;

          return <Extended />;
        },
      });
      const [{ keyframes }] = page.flight.clientProps;

      expect(keyframes).toHaveLength(1);
      expect(serverRules(page.streamed).filter(rule => rule.startsWith('@keyframes'))).toHaveLength(
        1
      );
    });

    it('writes the keyframes two components share once', async () => {
      const page = await renderPage({
        server: ({ library: { keyframes, styled } }) => {
          const fade = keyframes`
            0% { opacity: 1; }
            100% { opacity: 0; }
          `;
          const A = styled.div`
            animation: ${fade} 1s;
          `;
          const B = styled.span`
            animation: ${fade} 2s;
          `;

          return (
            <>
              <A />
              <B />
            </>
          );
        },
      });

      expect(serverRules(page.streamed).filter(rule => rule.startsWith('@keyframes'))).toHaveLength(
        1
      );
    });
  });

  describe('across a Suspense boundary (#5808)', () => {
    it('keeps the resolved instance styled after React discards the fallback', async () => {
      const page = await renderPage({
        server: ({ gates, library: { styled } }) => {
          const Panel = styled.div`
            color: crimson;
          `;
          const Resolved = async () => {
            await gates.wait('late');

            return <Panel>loaded</Panel>;
          };

          return (
            <div>
              <Suspense fallback={<Panel>skeleton</Panel>}>
                <Resolved />
              </Suspense>
            </div>
          );
        },
      });
      const name = generatedClass(page.revealed);

      expect(page.revealed).toContain('loaded');
      expect(page.revealed).not.toContain('skeleton');
      expect(serverRules(page.revealed)).toEqual([`.${name}{color:crimson;}`]);
    });

    it('keeps the full base chain and the keyframes of a resolved extension', async () => {
      const page = await renderPage({
        server: ({ gates, library: { keyframes, styled } }) => {
          const spin = keyframes`
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          `;
          const Base = styled.div`
            animation: ${spin} 1s linear infinite;
          `;
          const Extended = styled(Base)`
            color: red;
          `;
          const Resolved = async () => {
            await gates.wait('late');

            return <Extended id="late">loaded</Extended>;
          };

          return (
            <div>
              <Suspense fallback={<Extended>skeleton</Extended>}>
                <Resolved />
              </Suspense>
            </div>
          );
        },
      });
      const [, , baseName, extendedName] = classesOf(page.revealed, 'late');
      const [{ keyframes }] = page.flight.clientProps;
      const [[, keyframesName]] = keyframes as string[][];

      expect(serverRules(page.revealed)).toEqual([
        `@keyframes ${keyframesName}{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`,
        `.${baseName}{animation:${keyframesName} 1s linear infinite;}`,
        `.${extendedName}{color:red;}`,
      ]);
    });
  });

  describe('cross-boundary extension (#5672)', () => {
    it('extends a client component, passing the classes down and keeping its own rules in the page', async () => {
      const page = await renderPage({
        clients: ({ react }) => ({
          Button: (props: object) => react.createElement('button', props),
        }),
        server: ({ clients, library: { styled } }) => {
          const Danger = styled(clients.Button)`
            background: #dc2626;
            color: white;
          `;

          expect(Reflect.get(Danger, '$$typeof')).not.toBe(Symbol.for('react.client.reference'));
          expect(Reflect.get(Danger, '$$id')).toBeUndefined();

          return <Danger id="a">Delete</Danger>;
        },
      });
      const [componentId, name] = classesOf(page.streamed, 'a');

      expect(rootOf(page.streamed)).toBe(
        `<div id="root"><button id="a" class="${componentId} ${name}">Delete</button></div>`
      );
      expect(serverRules(page.streamed)).toEqual([`.${name}{background:#dc2626;color:white;}`]);
    });

    it('does not inherit the discriminators of a server-reference target', async () => {
      await renderPage({
        server: ({ library: { styled } }) => {
          const ServerAction = Object.assign(
            (props: React.JSX.IntrinsicElements['form']) => <form {...props} />,
            {
              $$bound: null,
              $$id: 'app/actions/save#default',
              $$typeof: Symbol.for('react.server.reference'),
            }
          );
          const StyledForm = styled(ServerAction)`
            padding: 16px;
          `;

          expect(Reflect.get(StyledForm, '$$typeof')).not.toBe(
            Symbol.for('react.server.reference')
          );
          expect(Reflect.get(StyledForm, '$$id')).toBeUndefined();
          expect(Reflect.get(StyledForm, '$$bound')).toBeUndefined();

          return <div />;
        },
      });
    });

    it('forwards props, attrs and dynamic values through an extension of a client component', async () => {
      const page = await renderPage({
        clients: ({ react }) => ({
          Input: (props: object) => react.createElement('input', props),
        }),
        server: ({ clients, library: { styled } }) => {
          const Field = styled(clients.Input).attrs({ type: 'email' })<{ $bg: string }>`
            background: ${p => p.$bg};
          `;

          return (
            <>
              <Field id="a" $bg="red" placeholder="you@example.com" />
              <Field id="b" $bg="blue" />
            </>
          );
        },
      });
      const [componentId, red] = classesOf(page.streamed, 'a');
      const [, blue] = classesOf(page.streamed, 'b');

      expect(rootOf(page.streamed)).toBe(
        `<div id="root"><input id="a" placeholder="you@example.com" type="email" class="${componentId} ${red}"/><input id="b" type="email" class="${componentId} ${blue}"/></div>`
      );
      expect(serverRules(page.streamed)).toEqual([
        `.${red}{background:red;}`,
        `.${blue}{background:blue;}`,
      ]);
    });
  });

  describe('StyleSheetManager', () => {
    it('applies a plugin to the rules a server component sends', async () => {
      const page = await renderPage({
        server: ({ library: { StyleSheetManager, styled } }) => {
          const Item = styled.li`
            margin-left: 8px;
          `;

          return (
            <StyleSheetManager plugins={[rtlPlugin]}>
              <Item id="a" />
            </StyleSheetManager>
          );
        },
      });
      const [, name] = classesOf(page.streamed, 'a');

      expect(serverRules(page.streamed)).toEqual([`.${name}{margin-right:8px;}`]);
    });
  });

  describe('sibling combinators', () => {
    it('matches an extension among its base siblings through the base class, in the server HTML and after hydration', async () => {
      const page = await renderPage({
        server: ({ library: { styled } }) => {
          const Base = styled.div`
            & + & {
              margin-left: 8px;
            }
          `;
          const Extended = styled(Base)`
            color: red;
          `;

          return (
            <main>
              <Base id="a" />
              <Extended id="b" />
              <Base id="c" />
            </main>
          );
        },
      });
      const marginOf = (source: string | Document, id: string) =>
        computedValue(source, `#${id}`, 'margin-left');

      expect(rootOf(page.streamed)).not.toContain('<style');
      expect(['a', 'b', 'c'].map(id => marginOf(page.streamed, id))).toEqual(['', '8px', '8px']);

      const browser = await page.hydrate();

      expect(browser.recoverableErrors).toEqual([]);
      expect(['a', 'b', 'c'].map(id => marginOf(browser.document, id))).toEqual(['', '8px', '8px']);

      browser.close();
    });
  });

  describe('cascade', () => {
    const scenarios = [...extensionScenarios, ...wrapperScenarios];
    const names = scenarios.map(scenario => scenario.name);

    const PROPERTIES = ['background-color', 'color', 'margin-left', 'padding-top'];

    const probesIn = (html: string): string[] =>
      Array.from(html.matchAll(/data-probe="([^"]*)"/g), match => match[1]);

    /** The winning value of each property on each probe, in the order the probes appear. */
    const winnersIn = (source: string | Document, probes: string[]): string[][] =>
      probes.map(probe =>
        PROPERTIES.map(property => computedValue(source, `[data-probe="${probe}"]`, property))
      );

    /** The tree of the scenario `name`, built from `library`. */
    function treeFor(library: Library, name: string): React.ReactElement {
      const { extensionScenarios, wrapperScenarios } = scenariosFor(library);
      const found = [...extensionScenarios, ...wrapperScenarios].find(
        scenario => scenario.name === name
      );
      if (found === undefined) throw new Error(`no scenario named ${name}`);

      return found.tree();
    }

    /** What a client-only server render of the same tree produces. */
    function clientRender(name: string): { html: string; probes: string[] } {
      const ssr = loadSsrGraph();
      const sheet = new ssr.library.ServerStyleSheet();
      const html = ssr.server.renderToString(sheet.collectStyles(treeFor(ssr.library, name)));

      return { html: sheet.getStyleTags() + html, probes: probesIn(html) };
    }

    // The same tree must cascade the same whether styled components run as server components or as client ones.
    it.each(names)(
      'gives every element the winners of a client render, in the server HTML and after hydration, in the %s scenario',
      async name => {
        const expected = clientRender(name);
        const page = await renderPage({ server: ({ library }) => treeFor(library, name) });
        const expectedWinners = winnersIn(expected.html, expected.probes);

        expect(expected.probes.length).toBeGreaterThan(0);
        expect(probesIn(page.streamed)).toEqual(expected.probes);
        expect(winnersIn(page.streamed, expected.probes)).toEqual(expectedWinners);

        const browser = await page.hydrate();

        expect(browser.recoverableErrors).toEqual([]);
        expect(winnersIn(browser.document, expected.probes)).toEqual(expectedWinners);

        browser.close();
      }
    );
  });
});
