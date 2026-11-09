/**
 * @jest-environment node
 */

import React, { Suspense } from 'react';
import {
  classesOf,
  computedValue,
  generatedClass,
  loadRscGraph,
  loadSsrGraph,
  renderPage,
  serverRules,
  styleTags,
} from './rscStream';

/**
 * https://drafts.csswg.org/css-color-4/#serializing-sRGB-values: "For the computed and used value,
 * the corresponding sRGB value is used." A named color computes to its `rgb()` form.
 */
const RED = 'rgb(255, 0, 0)';
const BLUE = 'rgb(0, 0, 255)';

describe('two-graph harness', () => {
  it('loads one library per graph, with the server components build of React only in the RSC graph', () => {
    const rsc = loadRscGraph();
    const ssr = loadSsrGraph();

    expect(typeof rsc.react.createContext).toBe('undefined');
    expect(typeof ssr.react.createContext).toBe('function');
    expect(rsc.library).not.toBe(ssr.library);
    expect(rsc.library.styled).not.toBe(ssr.library.styled);
  });

  it('renders a plain client styled component through both graphs and rehydrates it', async () => {
    const page = await renderPage({
      clients: ({ library }) => ({ Button: library.styled.button`color: red;` }),
      server: ({ clients }) => (
        <main>
          <clients.Button id="probe" />
        </main>
      ),
    });
    const [componentId, generated] = classesOf(page.streamed, 'probe');

    expect(page.flight.errors).toEqual([]);
    expect(page.flight.clientProps).toEqual([{ id: 'probe' }]);
    expect(generatedClass(page.streamed, 'probe')).toBe(generated);
    expect(componentId).toMatch(/sc-/);
    expect(styleTags(page.streamed)).toHaveLength(1);
    expect(serverRules(page.streamed)).toEqual([`.${generated}{color:red;}`]);
    expect(computedValue(page.streamed, '#probe', 'color')).toBe(RED);

    const browser = await page.hydrate();

    expect(browser.recoverableErrors).toEqual([]);
    expect(browser.document.getElementById('probe')?.className).toBe(`${componentId} ${generated}`);
    expect(browser.rules()).toEqual([`.${generated} {color: red;}`]);
    expect(computedValue(browser.document, '#probe', 'color')).toBe(RED);

    browser.close();
  });

  it('flushes between the shell and a late boundary, then rehydrates both tags in order', async () => {
    const page = await renderPage({
      clients: ({ library: { styled } }) => ({
        Early: styled.p`
          color: red;
        `,
        Late: styled.p`
          color: blue;
        `,
      }),
      server: ({ clients, gates }) => {
        const Deferred = async () => {
          await gates.wait('late');

          return <clients.Late id="late" />;
        };

        return (
          <main>
            <clients.Early id="early" />
            <Suspense fallback={<i id="fallback" />}>
              <Deferred />
            </Suspense>
          </main>
        );
      },
    });
    const early = generatedClass(page.streamed, 'early');
    const late = generatedClass(page.streamed, 'late');

    expect(page.shell).toContain('id="fallback"');
    expect(page.shell).not.toContain('id="late"');
    expect(serverRules(page.shell)).toEqual([`.${early}{color:red;}`]);
    expect(styleTags(page.streamed)).toHaveLength(2);
    expect(serverRules(page.streamed)).toEqual([`.${early}{color:red;}`, `.${late}{color:blue;}`]);
    expect(page.streamed.indexOf('id="late"')).toBeGreaterThan(page.shell.length);
    expect(page.chunks.join('')).toBe(page.streamed);

    const browser = await page.hydrate();

    expect(browser.recoverableErrors).toEqual([]);
    expect(browser.document.querySelector('[hidden]')).toBeNull();
    expect(browser.document.getElementById('fallback')).toBeNull();
    expect(browser.rules()).toEqual([`.${early} {color: red;}`, `.${late} {color: blue;}`]);
    expect(computedValue(browser.document, '#late', 'color')).toBe(BLUE);
    expect(computedValue(browser.document, '#early', 'color')).toBe(RED);

    browser.close();
  });

  it('leaves no browser globals behind and restores the server flag', async () => {
    const before = (globalThis as { __SERVER__?: boolean }).__SERVER__;
    const page = await renderPage({
      clients: ({ library }) => ({ Button: library.styled.button`color: red;` }),
      server: ({ clients }) => <clients.Button />,
    });

    (await page.hydrate()).close();

    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect((globalThis as { __SERVER__?: boolean }).__SERVER__).toBe(before);
  });
});
