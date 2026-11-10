/**
 * @jest-environment jsdom
 */

import React from 'react';
import { SPLITTER } from '../constants';
import { renderInBrowser } from './rscStream';

describe('renderInBrowser', () => {
  it("renders the RSC graph payload with a browser graph in the file's own document", async () => {
    const { container, flight, graph } = await renderInBrowser({
      clients: ({ library }) => ({ Button: library.styled.button`color: red;` }),
      server: ({ clients }) => (
        <main>
          <clients.Button id="probe" />
        </main>
      ),
    });
    const button = container.querySelector('#probe');
    const [componentId, generated] = (button?.className ?? '').split(' ');

    expect(flight.errors).toEqual([]);
    expect(flight.clientProps).toEqual([{ id: 'probe' }]);
    expect(button?.tagName).toBe('BUTTON');
    expect(componentId).toMatch(/sc-/);
    expect(
      Array.from(document.styleSheets).flatMap(sheet =>
        Array.from(sheet.cssRules, rule => rule.cssText)
      )
    ).toEqual([`.${generated} {color: red;}`]);
    expect(graph.library.extractCSS()).toBe(`.${generated} {color: red;}${SPLITTER}`);
  });
});
