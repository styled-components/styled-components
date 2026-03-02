import React from 'react';

import { render } from '@testing-library/react';
import { ServerStyleSheet, StyleSheetManager } from '../../base';
import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION, SC_VERSION } from '../../constants';
import { resetStyled } from '../../test/utils';
import * as GroupIDAllocator from '../GroupIDAllocator';
import { outputSheet, rehydrateSheet } from '../Rehydration';
import StyleSheet from '../Sheet';

let styled: ReturnType<typeof resetStyled>;

beforeEach(() => {
  GroupIDAllocator.resetGroupIds();
  styled = resetStyled();
});

describe('outputSheet', () => {
  it('outputs sheets correctly', () => {
    const sheet = new StyleSheet({ isServer: true });

    // Make the group numbers a little more arbitrary
    GroupIDAllocator.setGroupForId('idA', 11);
    GroupIDAllocator.setGroupForId('idB', 22);

    // Insert some rules
    sheet.insertRules('idA', 'nameA', ['.a {}']);
    sheet.insertRules('idB', 'nameB', ['.b {}']);

    const output = outputSheet(sheet).trim().split('/*!sc*/');

    expect(output).toMatchInlineSnapshot(`
      [
        ".a {}",
        "
      data-styled.g11[id="idA"]{content:"nameA,"}",
        "
      .b {}",
        "
      data-styled.g22[id="idB"]{content:"nameB,"}",
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
        ${SC_ATTR}.g11[id="idA"]{content:"nameA,"}/*!sc*/
        ${SC_ATTR}.g33[id="empty"]{content:""}/*!sc*/
      </style>
    `;

    document.body.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .b {}/*!sc*/
        ${SC_ATTR}.g22[id="idB"]{content:"nameB,"}/*!sc*/
      </style>
    `;

    const styleHead = document.head.querySelector('style');
    const styleBody = document.body.querySelector('style');
    expect(styleHead!.parentElement).toBe(document.head);
    expect(styleBody!.parentElement).toBe(document.body);

    const sheet = new ServerStyleSheet();
    rehydrateSheet(sheet.instance);

    // Adds ID to Group mapping to GroupIDAllocator
    expect(GroupIDAllocator.getIdForGroup(11)).toBe('idA');
    expect(GroupIDAllocator.getIdForGroup(33)).toBe('empty');
    expect(GroupIDAllocator.getIdForGroup(22)).toBe('idB');
    // Registers ID + name combinations on the StyleSheet
    expect(sheet.instance.hasNameForId('idA', 'nameA')).toBe(true);
    expect(sheet.instance.hasNameForId('empty', 'empty')).toBe(false);
    expect(sheet.instance.hasNameForId('idB', 'nameB')).toBe(true);
    // Populates the underlying tag
    expect(sheet.instance.getTag().tag.length).toBe(2);
    expect(sheet.instance.getTag().getGroup(11)).toBe('.a {}/*!sc*/\n');
    expect(sheet.instance.getTag().getGroup(22)).toBe('.b {}/*!sc*/\n');
    expect(sheet.instance.getTag().getGroup(33)).toBe('');
    // Removes the old tags
    expect(styleHead!.parentElement).toBe(null);
    expect(styleBody!.parentElement).toBe(null);

    const Foo = styled.div`
      color: burgundy;
    `;

    // new insertion is placed after the rehydrated styles
    render(
      <StyleSheetManager sheet={sheet.instance}>
        <Foo />
      </StyleSheetManager>
    );

    expect(sheet.instance.getTag().tag.length).toBe(3);
    expect(sheet.getStyleTags()).toBe(
      `
<style data-styled=\"true\" data-styled-version=\"JEST_MOCK_VERSION\">.a {}/*!sc*/
data-styled.g11[id=\"idA\"]{content:\"nameA,\"}/*!sc*/
.b {}/*!sc*/
data-styled.g22[id=\"idB\"]{content:\"nameB,\"}/*!sc*/
.a{color:burgundy;}/*!sc*/
data-styled.g23[id=\"sc-kqxcKS\"]{content:\"a,\"}/*!sc*/
</style>
    `.trim()
    );
  });

  it('ignores active style elements', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR}="${SC_ATTR_ACTIVE}" ${SC_ATTR_VERSION}="${SC_VERSION}">
        .a {}/*!sc*/
        ${SC_ATTR}.g11[id="idA"]{content:"nameA,"}/*!sc*/
      </style>
    `;

    const styleHead = document.head.querySelector('style');
    expect(styleHead!.parentElement).toBe(document.head);
    const sheet = new StyleSheet({ isServer: true });
    rehydrateSheet(sheet);
    expect(GroupIDAllocator.getIdForGroup(11)).toBe(undefined);
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
        ${SC_ATTR}.g1[id="idA"]{content:""}/*!sc*/
      </style>
    `;

    const sheet = new StyleSheet({ isServer: true });
    rehydrateSheet(sheet);
  });

  describe('Shadow DOM support', () => {
    it('rehydrates from Shadow DOM when container is provided', () => {
      // Create a host element and attach a shadow root
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      // Add server-rendered styles to the shadow root
      shadowRoot.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow-a {}/*!sc*/
          ${SC_ATTR}.g11[id="shadowIdA"]{content:"shadowNameA,"}/*!sc*/
        </style>
      `;

      const styleInShadow = shadowRoot.querySelector('style');
      expect(styleInShadow).not.toBeNull();
      expect(styleInShadow!.parentNode).toBe(shadowRoot);

      // Create sheet with shadow root as target
      const sheet = new StyleSheet({ isServer: true, target: shadowRoot });

      // Rehydrate from the shadow root
      rehydrateSheet(sheet);

      // Verify the styles were rehydrated
      expect(GroupIDAllocator.getIdForGroup(11)).toBe('shadowIdA');
      expect(sheet.hasNameForId('shadowIdA', 'shadowNameA')).toBe(true);
      expect(sheet.getTag().tag.length).toBe(1);
      expect(sheet.getTag().getGroup(11)).toBe('.shadow-a {}/*!sc*/\n');

      // Verify the old tag was removed from shadow root
      expect(styleInShadow!.parentNode).toBe(null);

      // Cleanup
      document.body.removeChild(hostElement);
    });

    it('does not find styles in Shadow DOM when searching document', () => {
      // Create a host element and attach a shadow root
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      // Add server-rendered styles to the shadow root
      shadowRoot.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow-b {}/*!sc*/
          ${SC_ATTR}.g12[id="shadowIdB"]{content:"shadowNameB,"}/*!sc*/
        </style>
      `;

      // Create sheet without target (defaults to document)
      const sheet = new StyleSheet({ isServer: true });

      // Rehydrate from document (default) - should NOT find shadow DOM styles
      rehydrateSheet(sheet);

      // Verify the styles were NOT rehydrated
      expect(GroupIDAllocator.getIdForGroup(12)).toBe(undefined);
      expect(sheet.hasNameForId('shadowIdB', 'shadowNameB')).toBe(false);
      expect(sheet.getTag().tag.length).toBe(0);

      // Cleanup
      document.body.removeChild(hostElement);
    });

    it('removes global style tags inside Shadow DOM when target is provided', async () => {
      const { removeGlobalStyleTag } = await import('../dom');

      // Create a host element and attach a shadow root
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      // Simulate SSR-rendered global style tag inside shadow root
      const globalStyleTag = document.createElement('style');
      globalStyleTag.setAttribute('data-styled-global', 'sc-global-test');
      globalStyleTag.textContent = 'body { margin: 0; }';
      shadowRoot.appendChild(globalStyleTag);

      // Also add one to the document
      const docStyleTag = document.createElement('style');
      docStyleTag.setAttribute('data-styled-global', 'sc-global-test');
      docStyleTag.textContent = 'body { margin: 0; }';
      document.head.appendChild(docStyleTag);

      // With target, removeGlobalStyleTag finds the shadow DOM tag
      removeGlobalStyleTag('sc-global-test', shadowRoot);
      expect(globalStyleTag.parentNode).toBe(null);

      // Without target, it cleans up document-level tags
      removeGlobalStyleTag('sc-global-test');
      expect(docStyleTag.parentNode).toBe(null);

      // Cleanup
      document.body.removeChild(hostElement);
    });

    it('rehydrates from both document and Shadow DOM separately', () => {
      // Add styles to document
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .doc-style {}/*!sc*/
          ${SC_ATTR}.g10[id="docId"]{content:"docName,"}/*!sc*/
        </style>
      `;

      // Create shadow root with styles
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow-style {}/*!sc*/
          ${SC_ATTR}.g20[id="shadowId"]{content:"shadowName,"}/*!sc*/
        </style>
      `;

      // First sheet rehydrates from document
      const docSheet = new StyleSheet({ isServer: true });
      rehydrateSheet(docSheet);
      expect(docSheet.hasNameForId('docId', 'docName')).toBe(true);
      expect(docSheet.hasNameForId('shadowId', 'shadowName')).toBe(false);

      // Second sheet rehydrates from shadow root
      const shadowSheet = new StyleSheet({ isServer: true, target: shadowRoot });
      rehydrateSheet(shadowSheet);
      expect(shadowSheet.hasNameForId('shadowId', 'shadowName')).toBe(true);
      expect(shadowSheet.hasNameForId('docId', 'docName')).toBe(false);

      // Cleanup
      document.body.removeChild(hostElement);
    });
  });
});

describe('rehydrateSheet with different target types', () => {
  it('rehydrates from document when no target is provided', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .doc-no-target {}/*!sc*/
        ${SC_ATTR}.g30[id="docNoTargetId"]{content:"docNoTargetName,"}/*!sc*/
      </style>
    `;

    const sheet = new StyleSheet({ isServer: true });
    rehydrateSheet(sheet);

    expect(sheet.hasNameForId('docNoTargetId', 'docNoTargetName')).toBe(true);
  });

  it('rehydrates from document when target is undefined', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .doc-undefined {}/*!sc*/
        ${SC_ATTR}.g31[id="docUndefinedId"]{content:"docUndefinedName,"}/*!sc*/
      </style>
    `;

    const sheet = new StyleSheet({ isServer: true, target: undefined });
    rehydrateSheet(sheet);

    expect(sheet.hasNameForId('docUndefinedId', 'docUndefinedName')).toBe(true);
  });

  it('rehydrates from ShadowRoot when target is a ShadowRoot', () => {
    const hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });

    shadowRoot.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .shadow-root-target {}/*!sc*/
        ${SC_ATTR}.g32[id="shadowRootId"]{content:"shadowRootName,"}/*!sc*/
      </style>
    `;

    const sheet = new StyleSheet({ isServer: true, target: shadowRoot });
    rehydrateSheet(sheet);

    expect(sheet.hasNameForId('shadowRootId', 'shadowRootName')).toBe(true);

    // Cleanup
    document.body.removeChild(hostElement);
  });

  it('rehydrates from ShadowRoot when target is an HTMLElement inside a ShadowRoot', () => {
    const hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });

    // Add styles first
    shadowRoot.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .shadow-inner-element {}/*!sc*/
        ${SC_ATTR}.g33[id="shadowInnerId"]{content:"shadowInnerName,"}/*!sc*/
      </style>
    `;

    // Then create and append the inner div (so it's not lost)
    const innerDiv = document.createElement('div');
    shadowRoot.appendChild(innerDiv);

    const sheet = new StyleSheet({ isServer: true, target: innerDiv });
    rehydrateSheet(sheet);

    expect(sheet.hasNameForId('shadowInnerId', 'shadowInnerName')).toBe(true);

    // Cleanup
    document.body.removeChild(hostElement);
  });

  it('rehydrates from document when target is a regular HTMLElement', () => {
    const regularDiv = document.createElement('div');
    document.body.appendChild(regularDiv);

    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .regular-element {}/*!sc*/
        ${SC_ATTR}.g34[id="regularId"]{content:"regularName,"}/*!sc*/
      </style>
    `;

    const sheet = new StyleSheet({ isServer: true, target: regularDiv });
    rehydrateSheet(sheet);

    expect(sheet.hasNameForId('regularId', 'regularName')).toBe(true);

    // Cleanup
    document.body.removeChild(regularDiv);
  });
});
