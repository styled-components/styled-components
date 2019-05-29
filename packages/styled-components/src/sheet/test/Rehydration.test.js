// @flow

import { SC_ATTR, SC_ATTR_ACTIVE, SC_VERSION_ATTR, SC_VERSION } from '../../constants';
import * as GroupIDAllocator from '../GroupIDAllocator';
import StyleSheet from '../Sheet';
import { outputSheet, rehydrateSheet } from '../Rehydration';

beforeEach(() => {
  GroupIDAllocator.resetGroupIds();
});

describe('outputSheet', () => {
  it('outputs sheets correctly', () => {
    const sheet = new StyleSheet(true /* isServer */);

    // Make the group numbers a little more arbitrary
    GroupIDAllocator.setGroupForId('idA', 11);
    GroupIDAllocator.setGroupForId('idB', 22);

    // Insert some rules
    sheet.insertRules('idA', 'nameA', ['.a {}']);
    sheet.insertRules('idB', 'nameB', ['.b {}']);

    const output = outputSheet(sheet).trim().split('\n');

    expect(output).toEqual([
      '.a {}',
      `${SC_ATTR}.g11[id="idA"]{content:"nameA,"}`,
      '.b {}',
      `${SC_ATTR}.g22[id="idB"]{content:"nameB,"}`
    ]);
  });
});

describe('rehydrateSheet', () => {
  it('rehydrates sheets correctly', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_VERSION_ATTR}="${SC_VERSION}">
        .a {}
        ${SC_ATTR}.g11[id="idA"]{content:"nameA,"}
        ${SC_ATTR}.g33[id="empty"]{content:""}
      </style>
    `;

    document.body.innerHTML = `
      <style ${SC_ATTR} ${SC_VERSION_ATTR}="${SC_VERSION}">
        .b {}
        ${SC_ATTR}.g22[id="idB"]{content:"nameB,"}
      </style>
    `;

    const styleHead = document.head.querySelector('style');
    const styleBody = document.body.querySelector('style');
    expect(styleHead.parentElement).toBe(document.head);
    expect(styleBody.parentElement).toBe(document.body);

    const sheet = new StyleSheet(true /* isServer */);
    rehydrateSheet(sheet);

    // Adds ID to Group mapping to GroupIDAllocator
    expect(GroupIDAllocator.getIdForGroup(11)).toBe('idA');
    expect(GroupIDAllocator.getIdForGroup(33)).toBe('empty');
    expect(GroupIDAllocator.getIdForGroup(22)).toBe('idB');
    // Registers ID + name combinations on the StyleSheet
    expect(sheet.hasNameForId('idA', 'nameA')).toBe(true);
    expect(sheet.hasNameForId('empty', 'empty')).toBe(false);
    expect(sheet.hasNameForId('idB', 'nameB')).toBe(true);
    // Populates the underlying tag
    expect(sheet.getTag().tag.length).toBe(2);
    expect(sheet.getTag().getGroup(11)).toBe('.a {}\n');
    expect(sheet.getTag().getGroup(22)).toBe('.b {}\n');
    expect(sheet.getTag().getGroup(33)).toBe('');
    // Removes the old tags
    expect(styleHead.parentElement).toBe(null);
    expect(styleBody.parentElement).toBe(null);
  });

  it('ignores active style elements', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR}="${SC_ATTR_ACTIVE}" ${SC_VERSION_ATTR}="${SC_VERSION}">
        .a {}
        ${SC_ATTR}.g11[id="idA"]{content:"nameA,"}
      </style>
    `;

    const styleHead = document.head.querySelector('style');
    expect(styleHead.parentElement).toBe(document.head);
    const sheet = new StyleSheet(true /* isServer */);
    rehydrateSheet(sheet);
    expect(GroupIDAllocator.getIdForGroup(11)).toBe(undefined);
    expect(sheet.hasNameForId('idA', 'nameA')).toBe(false);
    expect(sheet.getTag().tag.length).toBe(0);
    expect(styleHead.parentElement).toBe(document.head);
  });
});
