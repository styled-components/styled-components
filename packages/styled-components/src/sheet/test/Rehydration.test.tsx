import React from 'react';

import { render } from '@testing-library/react';
import { ServerStyleSheet, StyleSheetManager } from '../../base';
import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION, SC_VERSION } from '../../constants';
import { resetStyled } from '../../test/utils';
import { outputSheet, rehydrateSheet } from '../Rehydration';
import StyleSheet from '../Sheet';

let styled: ReturnType<typeof resetStyled>;

beforeEach(() => {
  styled = resetStyled();
});

describe('outputSheet', () => {
  it('outputs sheets correctly', () => {
    const sheet = new StyleSheet({ isServer: true });

    sheet.insertRules('idA', 'nameA', ['.a {}']);
    sheet.insertRules('idB', 'nameB', ['.b {}']);

    const output = outputSheet(sheet).trim().split('/*!sc*/');

    expect(output).toMatchInlineSnapshot(`
      [
        ".a {}",
        "
      data-styled.g[id="idA"]{content:"nameA,"}",
        "
      .b {}",
        "
      data-styled.g[id="idB"]{content:"nameB,"}",
        "",
      ]
    `);
  });
});

describe('rehydrateSheet', () => {
  it('rehydrates sheets correctly', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .a {}/*!sc*/
        ${SC_ATTR}.g[id="idA"]{content:"nameA,"}/*!sc*/
        ${SC_ATTR}.g[id="empty"]{content:""}/*!sc*/
      </style>
    `;

    document.body.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .b {}/*!sc*/
        ${SC_ATTR}.g[id="idB"]{content:"nameB,"}/*!sc*/
      </style>
    `;

    const styleHead = document.head.querySelector('style');
    const styleBody = document.body.querySelector('style');
    expect(styleHead!.parentElement).toBe(document.head);
    expect(styleBody!.parentElement).toBe(document.body);

    const sheet = new ServerStyleSheet();
    rehydrateSheet(sheet.instance);

    expect(sheet.instance.hasNameForId('idA', 'nameA')).toBe(true);
    expect(sheet.instance.hasNameForId('empty', 'empty')).toBe(false);
    expect(sheet.instance.hasNameForId('idB', 'nameB')).toBe(true);
    expect(sheet.instance.getTag().tag.length).toBe(2);
    expect(sheet.instance.getTag().getGroup('idA')).toBe('.a {}/*!sc*/\n');
    expect(sheet.instance.getTag().getGroup('idB')).toBe('.b {}/*!sc*/\n');
    expect(sheet.instance.getTag().getGroup('empty')).toBe('');
    expect(styleHead!.parentElement).toBe(null);
    expect(styleBody!.parentElement).toBe(null);

    const Foo = styled.div`
      color: burgundy;
    `;

    render(
      <StyleSheetManager sheet={sheet.instance}>
        <Foo />
      </StyleSheetManager>
    );

    expect(sheet.instance.getTag().tag.length).toBe(3);
    expect(sheet.getStyleTags()).toBe(
      `
<style data-styled=\"true\" data-styled-version=\"JEST_MOCK_VERSION\">.a {}/*!sc*/
data-styled.g[id=\"idA\"]{content:\"nameA,\"}/*!sc*/
.b {}/*!sc*/
data-styled.g[id=\"idB\"]{content:\"nameB,\"}/*!sc*/
.a{color:burgundy;}/*!sc*/
data-styled.g[id=\"sc-kqxcKS\"]{content:\"a,\"}/*!sc*/
</style>
    `.trim()
    );
  });

  it('ignores active style elements', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR}="${SC_ATTR_ACTIVE}" ${SC_ATTR_VERSION}="${SC_VERSION}">
        .a {}/*!sc*/
        ${SC_ATTR}.g[id="idA"]{content:"nameA,"}/*!sc*/
      </style>
    `;

    const styleHead = document.head.querySelector('style');
    expect(styleHead!.parentElement).toBe(document.head);
    const sheet = new StyleSheet({ isServer: true });
    rehydrateSheet(sheet);
    expect(sheet.hasNameForId('idA', 'nameA')).toBe(false);
    expect(sheet.getTag().tag.length).toBe(0);
    expect(styleHead!.parentElement).toBe(document.head);
  });

  it('tolerates long, malformed CSS', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        {xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
          xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
          }
        .rule {}/*!sc*/
        ${SC_ATTR}.g[id="idA"]{content:""}/*!sc*/
      </style>
    `;

    const sheet = new StyleSheet({ isServer: true });
    rehydrateSheet(sheet);
  });
});
