import React from 'react';

import { render } from '@testing-library/react';
import { ServerStyleSheet, StyleSheetManager } from '../../base';
import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION, SC_VERSION, SPLITTER } from '../../constants';
import { resetStyled } from '../../test/utils';
import { resetWarnOnce } from '../../utils/warnOnce';
import * as GroupIDAllocator from '../GroupIDAllocator';
import { TIER, makeKey } from '../Order';
import { MARKER_RE, outputSheet, rehydrateSheet } from '../Rehydration';
import { reconstructSheet } from '../reconstructSheet';
import { attachStreamFlush } from '../serverOrder';
import StyleSheet from '../Sheet';

let styled: ReturnType<typeof resetStyled>;

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  GroupIDAllocator.resetGroupIds();
  styled = resetStyled();
});

/** The text of tag blocks: each rule or marker line followed by the block splitter. */
const blocks = (...lines: string[]) => lines.map(line => line + '/*!sc*/\n').join('');

/** A server tag as the registry writes it, around the text of its blocks. */
const serverTag = (...lines: string[]) =>
  `<style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">${blocks(...lines)}</style>`;

/** Server tags only: the tags a sheet itself writes carry the active marker. */
const SERVER_TAGS = `style[${SC_ATTR}]:not([${SC_ATTR}="${SC_ATTR_ACTIVE}"])`;

/** The ids of the sheet's groups in output order. */
const idsInOrder = (sheet: StyleSheet) =>
  sheet.order.posList.map(group => GroupIDAllocator.idForGroup(group));

/** What one flush sends, then the flush itself: the tag's text is output, then cleared. */
const flush = (sheet: StyleSheet) => {
  const css = outputSheet(sheet);
  sheet.clearTag();
  return css;
};

describe('outputSheet', () => {
  it('outputs sheets correctly', () => {
    const sheet = new StyleSheet({ isServer: true });

    // Make the group numbers a little more arbitrary
    GroupIDAllocator.adoptGroupForId('idA', 11);
    GroupIDAllocator.adoptGroupForId('idB', 22);

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

  it('walks groups in position order and writes the seq of server groups', () => {
    const sheet = new StyleSheet({ isServer: true });

    sheet.insertRules('server-component', 'a', ['.server {}'], { seq: 5, server: true });
    sheet.insertRules('sc-global-server', 'b', ['body {}'], { seq: 2, server: true });
    sheet.insertRules('client-component', 'c', ['.client {}']);
    sheet.insertRules('sc-global-client', 'd', ['html {}']);

    expect(outputSheet(sheet)).toBe(
      blocks(
        'body {}',
        'data-styled.g2[id="sc-global-server"].s2{content:"b,"}',
        'html {}',
        'data-styled.g4[id="sc-global-client"]{content:"d,"}',
        '.server {}',
        'data-styled.g1[id="server-component"].s5{content:"a,"}',
        '.client {}',
        'data-styled.g3[id="client-component"]{content:"c,"}'
      )
    );
  });

  describe('after a flush', () => {
    let warn: jest.SpyInstance;

    const streamingSheet = () => {
      const sheet = new StyleSheet({ isServer: true });
      attachStreamFlush(sheet);
      return sheet;
    };

    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('sends a group that gained rules and has no related flushed group as a normal block', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a1 {}']);
      flush(sheet);

      sheet.insertRules('A', 'a2', ['.a2 {}']);
      sheet.insertRules('C', 'c1', ['.c1 {}']);

      expect(outputSheet(sheet)).toBe(
        blocks(
          '.a2 {}',
          'data-styled.g1[id="A"]{content:"a1,a2,"}',
          '.c1 {}',
          'data-styled.g2[id="C"]{content:"c1,"}'
        )
      );
    });

    it('sends a moved outer in full after the group it now follows (late boundary)', () => {
      const sheet = streamingSheet();
      sheet.insertRules('B', 'b1', ['.b {}']);
      expect(flush(sheet)).toBe(blocks('.b {}', 'data-styled.g1[id="B"]{content:"b1,"}'));

      sheet.insertRules('A', 'a1', ['.a {}']);
      sheet.learn('B', 'A');

      expect(idsInOrder(sheet)).toEqual(['A', 'B']);
      expect(outputSheet(sheet)).toBe(
        blocks(
          '.a {}',
          'data-styled.g2[id="A"]{content:"a1,"}',
          '.b {}',
          'data-styled.g1[id="B"].f{content:"b1,"}'
        )
      );
    });

    it('sends the outer of a group that gained a dynamic name in full', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a1 {}']);
      sheet.insertRules('B', 'b1', ['.b {}']);
      sheet.learn('B', 'A');
      flush(sheet);

      sheet.insertRules('A', 'a2', ['.a2 {}']);

      expect(outputSheet(sheet)).toBe(
        blocks(
          '.a2 {}',
          'data-styled.g1[id="A"]{content:"a1,a2,"}',
          '.b {}',
          'data-styled.g2[id="B"].f{content:"b1,"}'
        )
      );
    });

    it('sends a flushed group of a later key in full after a late server global', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a {}']);
      sheet.insertRules('B', 'b1', ['.b {}']);
      flush(sheet);

      sheet.insertRules('sc-global-late', 'g1', ['body {}'], { seq: 1, server: true });

      expect(idsInOrder(sheet)).toEqual(['sc-global-late', 'A', 'B']);
      expect(outputSheet(sheet)).toBe(
        blocks(
          'body {}',
          'data-styled.g3[id="sc-global-late"].s1{content:"g1,"}',
          '.a {}',
          'data-styled.g1[id="A"].f{content:"a1,"}',
          '.b {}',
          'data-styled.g2[id="B"].f{content:"b1,"}'
        )
      );
    });

    it('sends every flushed group after a late client global in full', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a {}']);
      flush(sheet);

      sheet.insertRules('sc-global-late', 'g1', ['body {}']);

      expect(outputSheet(sheet)).toBe(
        blocks(
          'body {}',
          'data-styled.g2[id="sc-global-late"]{content:"g1,"}',
          '.a {}',
          'data-styled.g1[id="A"].f{content:"a1,"}'
        )
      );
    });

    it('sends a flushed global of a later key in full after a late server global', () => {
      const sheet = streamingSheet();
      sheet.insertRules('sc-global-early', 'g1', ['html {}']);
      sheet.insertRules('A', 'a1', ['.a {}']);
      flush(sheet);

      sheet.insertRules('sc-global-late', 'g2', ['body {}'], { seq: 1, server: true });

      expect(outputSheet(sheet)).toBe(
        blocks(
          'body {}',
          'data-styled.g3[id="sc-global-late"].s1{content:"g2,"}',
          'html {}',
          'data-styled.g1[id="sc-global-early"].f{content:"g1,"}',
          '.a {}',
          'data-styled.g2[id="A"].f{content:"a1,"}'
        )
      );
    });

    it('sends late keyframes alone, since keyframes never tie', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a {}']);
      flush(sheet);

      sheet.insertRules('sc-keyframes-spin', 'k1', ['@keyframes spin{from{opacity:0}}']);

      // The jsdom stylesheet reformats the rule text, so the output is compared by its blocks: the
      // keyframes rule and its marker, and nothing for A.
      expect(idsInOrder(sheet)).toEqual(['sc-keyframes-spin', 'A']);
      expect(outputSheet(sheet).split(SPLITTER).slice(1)).toEqual([
        'data-styled.g2[id="sc-keyframes-spin"]{content:"k1,"}',
        '',
      ]);
    });

    it('sends the moved group alone when an edge relates two flushed groups', () => {
      const sheet = streamingSheet();
      sheet.insertRules('B', 'b1', ['.b {}']);
      sheet.insertRules('A', 'a1', ['.a {}']);
      flush(sheet);

      sheet.learn('B', 'A');

      expect(idsInOrder(sheet)).toEqual(['A', 'B']);
      expect(outputSheet(sheet)).toBe(blocks('.b {}', 'data-styled.g1[id="B"].f{content:"b1,"}'));
    });

    it('sends the outer in full when an edge moves nothing but the last copies were out of order', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a1 {}']);
      sheet.insertRules('B', 'b1', ['.b {}']);
      flush(sheet);

      // A's newest copy now follows B's in the page, though no edge relates them yet.
      sheet.insertRules('A', 'a2', ['.a2 {}']);
      expect(outputSheet(sheet)).toBe(blocks('.a2 {}', 'data-styled.g1[id="A"]{content:"a1,a2,"}'));
      flush(sheet);

      sheet.learn('B', 'A');

      expect(idsInOrder(sheet)).toEqual(['A', 'B']);
      expect(outputSheet(sheet)).toBe(blocks('.b {}', 'data-styled.g2[id="B"].f{content:"b1,"}'));
    });

    it('sends the later member of a pair that became contested between two flushed groups in full', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a {}']);
      sheet.insertRules('B', 'b1', ['.b {}']);
      flush(sheet);

      sheet.learn('B', 'A');
      sheet.learn('A', 'B');

      expect(sheet.order.contested.size).toBe(1);
      expect(outputSheet(sheet)).toBe(blocks('.b {}', 'data-styled.g2[id="B"].f{content:"b1,"}'));
    });

    it('sends nothing for a flushed group no new rule or edge touches', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a {}']);
      flush(sheet);

      expect(outputSheet(sheet)).toBe('');
    });

    it('re-emits a flushed outer across an empty unflushed bridge component', () => {
      const sheet = streamingSheet();
      sheet.insertRules('Outer', 'o1', ['.outer {}']);
      sheet.insertRules('Base', 'b1', ['.base {}']);
      StyleSheet.registerId('Mid', 'Base');
      flush(sheet);

      sheet.learn('Outer', 'Mid');

      expect(idsInOrder(sheet)).toEqual(['Base', 'Mid', 'Outer']);
      expect(outputSheet(sheet)).toBe(
        blocks('.outer {}', 'data-styled.g1[id="Outer"].f{content:"o1,"}')
      );
    });

    it('re-emits a flushed outer reachable through an unflushed contested partner', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a1 {}']);
      sheet.insertRules('C', 'c1', ['.c1 {}']);
      sheet.learn('C', 'B');
      sheet.learn('B', 'A');
      sheet.learn('A', 'B');
      expect(sheet.order.contested.size).toBe(1);
      flush(sheet);

      sheet.insertRules('A', 'a2', ['.a2 {}']);

      expect(outputSheet(sheet)).toBe(
        blocks(
          '.a2 {}',
          'data-styled.g1[id="A"]{content:"a1,a2,"}',
          '.c1 {}',
          'data-styled.g2[id="C"].f{content:"c1,"}'
        )
      );
    });

    it('does not re-emit a flushed group whose rules were cleared', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a1 {}']);
      sheet.insertRules('B', 'b1', ['.b1 {}']);
      sheet.learn('B', 'A');
      flush(sheet);

      sheet.clearRules('B');
      sheet.insertRules('A', 'a2', ['.a2 {}']);

      expect(outputSheet(sheet)).toBe(blocks('.a2 {}', 'data-styled.g1[id="A"]{content:"a1,a2,"}'));
    });

    it('does not re-emit already-flushed keyframes when a late server global triggers a suffix re-emit', () => {
      const sheet = streamingSheet();
      sheet.insertRules('sc-keyframes-spin', 'k1', ['@keyframes spin{from{opacity:0}}']);
      sheet.insertRules('A', 'a1', ['.a {}']);
      flush(sheet);

      sheet.insertRules('sc-global-late', 'g1', ['body {}'], { seq: 1, server: true });

      expect(outputSheet(sheet)).toBe(
        blocks(
          'body {}',
          'data-styled.g3[id="sc-global-late"].s1{content:"g1,"}',
          '.a {}',
          'data-styled.g2[id="A"].f{content:"a1,"}'
        )
      );
    });

    it('re-emits multi-hop transitive outers when their inner gains a rule after flush', () => {
      const sheet = streamingSheet();
      sheet.insertRules('A', 'a1', ['.a1 {}']);
      sheet.insertRules('B', 'b1', ['.b {}']);
      sheet.insertRules('C', 'c1', ['.c {}']);
      sheet.learn('B', 'A');
      sheet.learn('C', 'B');
      flush(sheet);

      sheet.insertRules('A', 'a2', ['.a2 {}']);

      expect(outputSheet(sheet)).toBe(
        blocks(
          '.a2 {}',
          'data-styled.g1[id="A"]{content:"a1,a2,"}',
          '.b {}',
          'data-styled.g2[id="B"].f{content:"b1,"}',
          '.c {}',
          'data-styled.g3[id="C"].f{content:"c1,"}'
        )
      );
    });
  });
});

describe('MARKER_RE', () => {
  it.each([
    [
      'an old marker',
      'data-styled.g11[id="idA"]{content:"nameA,"}',
      ['11', 'idA', undefined, undefined, 'nameA,'],
    ],
    [
      'a spaced old marker',
      'data-styled.g3[id="idA"]{content: "b,"}',
      ['3', 'idA', undefined, undefined, 'b,'],
    ],
    [
      'a server marker',
      'data-styled.g2[id="B"].s7{content:"b1,b2,"}',
      ['2', 'B', '7', undefined, 'b1,b2,'],
    ],
    [
      'a full marker',
      'data-styled.g2[id="B"].f{content:"b1,"}',
      ['2', 'B', undefined, '.f', 'b1,'],
    ],
    [
      'a full server marker',
      'data-styled.g2[id="B"].s7.f{content:"b1,"}',
      ['2', 'B', '7', '.f', 'b1,'],
    ],
    [
      'an empty names list',
      'data-styled.g2[id="B"]{content:""}',
      ['2', 'B', undefined, undefined, ''],
    ],
  ])('reads %s into number, id, seq, full flag and names', (_title, marker, expected) => {
    const match = marker.match(MARKER_RE);

    expect(match && Array.from(match).slice(1)).toEqual(expected);
  });

  it.each([
    ['a field after the full flag', 'data-styled.g2[id="B"].f.s7{content:"b1,"}'],
    ['an unknown field', 'data-styled.g2[id="B"].x9{content:"b1,"}'],
    [
      'a rule that only mentions a marker',
      '.a{content:"data-styled.g2[id=\\"B\\"]{content:\\"b1,\\"}"}',
    ],
  ])('does not read %s as a marker', (_title, text) => {
    expect(MARKER_RE.test(text)).toBe(false);
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
    // A free marker number is kept as the browser number
    expect(GroupIDAllocator.idForGroup(11)).toBe('idA');
    expect(GroupIDAllocator.idForGroup(33)).toBe('empty');
    expect(GroupIDAllocator.idForGroup(22)).toBe('idB');
    // Registers ID + name combinations on the StyleSheet
    expect(sheet.instance.hasNameForId('idA', 'nameA')).toBe(true);
    expect(sheet.instance.hasNameForId('empty', 'empty')).toBe(false);
    expect(sheet.instance.hasNameForId('idB', 'nameB')).toBe(true);
    // Populates the underlying tag
    expect(sheet.instance.getTag().tag.length).toBe(2);
    expect(sheet.instance.getTag().getGroup(11)).toBe('.a {}/*!sc*/\n');
    expect(sheet.instance.getTag().getGroup(22)).toBe('.b {}/*!sc*/\n');
    expect(sheet.instance.getTag().getGroup(33)).toBe('');
    // Groups sit in the order their tags list them, not by number
    expect(idsInOrder(sheet.instance)).toEqual(['idA', 'empty', 'idB']);
    // Removes the old tags
    expect(styleHead!.parentElement).toBe(null);
    expect(styleBody!.parentElement).toBe(null);

    const Foo = styled.div`
      color: burgundy;
    `;

    /*
     * Contract: adopting never moves the allocator pointer, so the next group a client component
     * allocates is the lowest free number (1, not 34), and a client group sorts by that number among
     * the client groups of the tags (their keys are their marker numbers 11, 22, 33).
     */
    render(
      <StyleSheetManager sheet={sheet.instance}>
        <Foo />
      </StyleSheetManager>
    );

    expect(GroupIDAllocator.lookupGroup('sc-kqxcKS')).toBe(1);
    expect(sheet.instance.getTag().tag.length).toBe(3);
    expect(sheet.getStyleTags()).toMatchInlineSnapshot(`
      <style data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .a {color: burgundy;}/*!sc*/
      data-styled.g1[id="sc-kqxcKS"]{content:"a,"}/*!sc*/
      .a {}/*!sc*/
      data-styled.g11[id="idA"]{content:"nameA,"}/*!sc*/
      .b {}/*!sc*/
      data-styled.g22[id="idB"]{content:"nameB,"}/*!sc*/
      </style>
    `);
  });

  it.each([
    ['keeps a free marker number', 99, 11, 11],
    ['gives a fresh number when another id holds it', 11, 11, 1],
  ])('%s for an id the browser has not numbered', (_title, heldNumber, markerNumber, expected) => {
    GroupIDAllocator.adoptGroupForId('other', heldNumber);
    document.head.innerHTML = serverTag(
      '.a {}',
      `data-styled.g${markerNumber}[id="idA"]{content:"nameA,"}`
    );

    rehydrateSheet(new StyleSheet({ isServer: true }));

    expect(GroupIDAllocator.groupForId('idA')).toBe(expected);
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
    expect(GroupIDAllocator.idForGroup(11)).toBe(undefined);
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

  /**
   * A `<style>` given both `precedence` and `href` becomes a React hoistable
   * resource. React re-emits it from a fixed `data-precedence` + `data-href`
   * template and reads only `children` / `dangerouslySetInnerHTML` off the
   * props, so `data-styled` and `data-styled-version` cannot survive however
   * they were spelled. Shape confirmed against react-dom 19.2.3.
   */
  describe('server styles React hoisted via precedence', () => {
    let warn: jest.SpyInstance;

    const emitHoistedTag = () => {
      document.head.innerHTML = `
        <style data-precedence="styled-components" data-href="sc-registry-0">
          .a {}/*!sc*/
          ${SC_ATTR}.g11[id="idA"]{content:"nameA,"}/*!sc*/
        </style>
      `;
      return document.head.querySelector('style')!;
    };

    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('leaves the rules unadopted and the tag in place', () => {
      const node = emitHoistedTag();
      const sheet = new StyleSheet({ isServer: true });

      rehydrateSheet(sheet);

      expect(GroupIDAllocator.idForGroup(11)).toBe(undefined);
      expect(sheet.hasNameForId('idA', 'nameA')).toBe(false);
      expect(sheet.getTag().tag.length).toBe(0);
      // React owns the tag as a permanent resource, so the rules it holds
      // stay in the document alongside whatever the client injects.
      expect(node.parentElement).toBe(document.head);
    });

    it('warns and names the alternative', () => {
      emitHoistedTag();

      rehydrateSheet(new StyleSheet({ isServer: true }));

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatchInlineSnapshot(
        `"[sc] server-rendered styles were found in a <style> tag with a \`precedence\` prop, so every rule is injected again on the client. Render the tag from \`ServerStyleSheet#getStyleElement()\` with no \`precedence\` or \`href\` prop."`
      );
    });

    it('warns once however many sheets rehydrate', () => {
      emitHoistedTag();

      rehydrateSheet(new StyleSheet({ isServer: true }));
      rehydrateSheet(new StyleSheet({ isServer: true }));

      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('stays silent when the marker attributes survived', () => {
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .a {}/*!sc*/
          ${SC_ATTR}.g11[id="idA"]{content:"nameA,"}/*!sc*/
        </style>
      `;
      const sheet = new StyleSheet({ isServer: true });

      rehydrateSheet(sheet);

      expect(sheet.hasNameForId('idA', 'nameA')).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    });

    it('stays silent for another library\u2019s precedence styles', () => {
      document.head.innerHTML = `
        <style data-precedence="high" data-href="some-other-library">
          .not-ours { color: red; }
        </style>
      `;

      rehydrateSheet(new StyleSheet({ isServer: true }));

      expect(warn).not.toHaveBeenCalled();
    });

    it('stays silent when there are no server styles at all', () => {
      document.head.innerHTML = '';

      rehydrateSheet(new StyleSheet({ isServer: true }));

      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn in a production build', () => {
      emitHoistedTag();
      (global as { __DEV__: boolean }).__DEV__ = false;

      try {
        rehydrateSheet(new StyleSheet({ isServer: true }));
      } finally {
        (global as { __DEV__: boolean }).__DEV__ = true;
      }

      expect(warn).not.toHaveBeenCalled();
    });
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
      expect(GroupIDAllocator.idForGroup(11)).toBe('shadowIdA');
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
      expect(GroupIDAllocator.idForGroup(12)).toBe(undefined);
      expect(sheet.hasNameForId('shadowIdB', 'shadowNameB')).toBe(false);
      expect(sheet.getTag().tag.length).toBe(0);

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

describe('adoption', () => {
  /** Puts a server tag in the body, the way a streamed boundary does, and adopts it into `sheet`. */
  const adopt = (sheet: StyleSheet, ...lines: string[]) => {
    document.body.innerHTML = serverTag(...lines);
    rehydrateSheet(sheet);
  };

  const groupText = (sheet: StyleSheet, id: string) =>
    sheet.getTag().getGroup(GroupIDAllocator.groupForId(id));

  describe('the key of a group', () => {
    it.each([
      ['a server component', 'comp', '.s3', makeKey(TIER.server, 3)],
      ['a client component', 'comp', '', makeKey(TIER.client, 5)],
      ['a server global', 'sc-global-x', '.s3', makeKey(TIER.serverGlobal, 3)],
      ['a client global', 'sc-global-x', '', makeKey(TIER.clientGlobal, 5)],
      ['server keyframes', 'sc-keyframes-x', '.s3', makeKey(TIER.serverGlobal, 3)],
      ['client keyframes', 'sc-keyframes-x', '', makeKey(TIER.clientGlobal, 5)],
    ])('comes from the marker of %s', (_title, id, fields, key) => {
      const sheet = new StyleSheet({ isServer: true });

      adopt(sheet, '.r {}', `data-styled.g5[id="${id}"]${fields}{content:"n,"}`);

      expect(sheet.order.keyOf(GroupIDAllocator.groupForId(id))).toBe(key);
    });

    it('keeps the marker number as the client seq when the browser numbers the id differently', () => {
      GroupIDAllocator.adoptGroupForId('other', 5);
      const sheet = new StyleSheet({ isServer: true });

      adopt(sheet, '.r {}', 'data-styled.g5[id="comp"]{content:"n,"}');

      const group = GroupIDAllocator.groupForId('comp');
      expect(group).not.toBe(5);
      expect(sheet.order.keyOf(group)).toBe(makeKey(TIER.client, 5));
    });
  });

  describe('first rehydration', () => {
    it('appends groups in the order the tags list them, whatever their numbers', () => {
      const sheet = new StyleSheet({ isServer: true });

      adopt(
        sheet,
        '.b {}',
        'data-styled.g2[id="idB"]{content:"nameB,"}',
        '.a {}',
        'data-styled.g1[id="idA"]{content:"nameA,"}'
      );

      expect(sheet.order.posList).toEqual([2, 1]);
      expect(outputSheet(sheet)).toBe(
        blocks(
          '.b {}',
          'data-styled.g2[id="idB"]{content:"nameB,"}',
          '.a {}',
          'data-styled.g1[id="idA"]{content:"nameA,"}'
        )
      );
    });

    it('appends a global after the components listed before it', () => {
      const sheet = new StyleSheet({ isServer: true });

      adopt(
        sheet,
        '.a {}',
        'data-styled.g1[id="A"]{content:"a1,"}',
        'body {}',
        'data-styled.g2[id="sc-global-g"]{content:"g1,"}'
      );

      expect(idsInOrder(sheet)).toEqual(['A', 'sc-global-g']);
    });
  });

  describe('a block whose names are already registered', () => {
    it('inserts nothing', () => {
      const sheet = new StyleSheet({ isServer: true });
      sheet.insertRules('idA', 'nameA', ['.a1 {}']);

      adopt(sheet, '.a1 {}', 'data-styled.g1[id="idA"]{content:"nameA,"}');

      expect(groupText(sheet, 'idA')).toBe('.a1 {}/*!sc*/\n');
    });

    it('inserts every rule when one name is new, repeating the rules of the others', () => {
      const sheet = new StyleSheet({ isServer: true });
      sheet.insertRules('idA', 'nameA', ['.a1 {}']);

      adopt(sheet, '.a1 {}', '.a2 {}', 'data-styled.g1[id="idA"]{content:"nameA,nameB,"}');

      expect(groupText(sheet, 'idA')).toBe('.a1 {}/*!sc*/\n.a1 {}/*!sc*/\n.a2 {}/*!sc*/\n');
      expect(sheet.hasNameForId('idA', 'nameB')).toBe(true);
    });

    it('inserts the rules of a block that lists no names', () => {
      const sheet = new StyleSheet({ isServer: true });

      adopt(sheet, '.x {}', 'data-styled.g1[id="idA"]{content:""}');

      expect(groupText(sheet, 'idA')).toBe('.x {}/*!sc*/\n');
    });
  });

  describe('a full block', () => {
    it('moves its group and the groups that wrap it to the end, keeping their order', () => {
      const sheet = new StyleSheet({ isServer: true });
      adopt(
        sheet,
        '.a {}',
        'data-styled.g1[id="A"]{content:"a1,"}',
        '.b {}',
        'data-styled.g2[id="B"]{content:"b1,"}',
        '.c {}',
        'data-styled.g3[id="C"]{content:"c1,"}'
      );
      sheet.learn('B', 'A');
      expect(idsInOrder(sheet)).toEqual(['A', 'B', 'C']);

      adopt(sheet, '.a {}', 'data-styled.g1[id="A"].f{content:"a1,"}');

      expect(idsInOrder(sheet)).toEqual(['C', 'A', 'B']);
      expect(groupText(sheet, 'A')).toBe('.a {}/*!sc*/\n');
    });

    it('appends a group the sheet has not seen', () => {
      const sheet = new StyleSheet({ isServer: true });
      sheet.insertRules('A', 'a1', ['.a {}']);

      adopt(sheet, '.b {}', 'data-styled.g2[id="B"].f{content:"b1,"}');

      expect(idsInOrder(sheet)).toEqual(['A', 'B']);
    });

    it.each([
      ['every name is registered', '', 'b1,', '.b1 {}/*!sc*/\n.b2 {}/*!sc*/\n'],
      [
        'it lists a new name',
        '.b3 {}',
        'b1,b3,',
        '.b1 {}/*!sc*/\n.b2 {}/*!sc*/\n.b1 {}/*!sc*/\n.b3 {}/*!sc*/\n',
      ],
    ])('keeps a name the browser inserted first when %s', (_title, newRule, names, expected) => {
      const sheet = new StyleSheet({ isServer: true });
      adopt(sheet, '.b1 {}', 'data-styled.g1[id="B"]{content:"b1,"}');
      sheet.insertRules('B', 'b2', ['.b2 {}']);

      adopt(
        sheet,
        '.a {}',
        'data-styled.g2[id="A"]{content:"a1,"}',
        '.b1 {}',
        ...(newRule ? [newRule] : []),
        `data-styled.g1[id="B"].f{content:"${names}"}`
      );

      expect(idsInOrder(sheet)).toEqual(['A', 'B']);
      expect(groupText(sheet, 'B')).toBe(expected);
      expect(sheet.hasNameForId('B', 'b2')).toBe(true);
    });
  });

  describe('late adoption', () => {
    it('places a global by key before every component and appends a component', () => {
      const sheet = new StyleSheet({ isServer: true });
      adopt(sheet, '.a {}', 'data-styled.g1[id="A"]{content:"a1,"}');
      sheet.insertRules('C', 'c1', ['.c {}']);

      adopt(
        sheet,
        'body {}',
        'data-styled.g3[id="sc-global-g"].s1{content:"g1,"}',
        '.d {}',
        'data-styled.g4[id="D"]{content:"d1,"}'
      );

      expect(idsInOrder(sheet)).toEqual(['sc-global-g', 'A', 'C', 'D']);
    });

    it('places keyframes by key too', () => {
      const sheet = new StyleSheet({ isServer: true });
      adopt(sheet, '.a {}', 'data-styled.g1[id="A"]{content:"a1,"}');

      adopt(
        sheet,
        '@keyframes spin{from{opacity:0}}',
        'data-styled.g2[id="sc-keyframes-spin"]{content:"k1,"}'
      );

      expect(idsInOrder(sheet)).toEqual(['sc-keyframes-spin', 'A']);
    });
  });

  describe('a marker number another id holds', () => {
    it('gives the id a fresh number at the first rehydration', () => {
      GroupIDAllocator.adoptGroupForId('C', 40);
      const sheet = new StyleSheet({ isServer: true });
      sheet.insertRules('C', 'c1', ['.c {}']);

      adopt(sheet, '.x {}', 'data-styled.g40[id="X"]{content:"x1,"}');

      expect(GroupIDAllocator.groupForId('X')).not.toBe(40);
      expect(GroupIDAllocator.idForGroup(40)).toBe('C');
      expect(groupText(sheet, 'X')).toBe('.x {}/*!sc*/\n');
      expect(groupText(sheet, 'C')).toBe('.c {}/*!sc*/\n');
    });

    it('gives the id a fresh number at a container change', () => {
      GroupIDAllocator.adoptGroupForId('C', 40);
      const parent = new StyleSheet({ isServer: false });
      parent.insertRules('C', 'c1', ['.c {}']);

      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = serverTag('.x {}', 'data-styled.g40[id="X"]{content:"x1,"}');

      const copy = reconstructSheet(parent, { target: shadowRoot });

      expect(GroupIDAllocator.groupForId('X')).not.toBe(40);
      expect(GroupIDAllocator.idForGroup(40)).toBe('C');
      expect(idsInOrder(parent)).toEqual(['C']);
      expect(idsInOrder(copy)).toEqual(['X']);
      expect(groupText(copy, 'X')).toBe('.x {}/*!sc*/\n');
    });
  });

  describe('removing adopted tags', () => {
    it('removes a tag from the head whatever follows it', () => {
      document.head.innerHTML =
        serverTag('.a {}', 'data-styled.g1[id="A"]{content:"a1,"}') + '<meta charset="utf-8">';

      rehydrateSheet(new StyleSheet({ isServer: true }));

      expect(document.head.querySelector(SERVER_TAGS)).toBeNull();
    });

    it('removes a tag from a shadow root whatever follows it', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML =
        serverTag('.a {}', 'data-styled.g1[id="A"]{content:"a1,"}') + '<div id="app"></div>';

      rehydrateSheet(new StyleSheet({ isServer: true, target: shadowRoot }));

      expect(shadowRoot.querySelector(SERVER_TAGS)).toBeNull();
    });

    it('removes body tags that only other server tags follow', () => {
      document.body.innerHTML =
        serverTag('.a {}', 'data-styled.g1[id="A"]{content:"a1,"}') +
        serverTag('.b {}', 'data-styled.g2[id="B"]{content:"b1,"}');

      rehydrateSheet(new StyleSheet({ isServer: true }));

      expect(document.body.querySelector('style')).toBeNull();
    });

    it('adopts a tag that sits before a page element but leaves it in place, marked adopted and empty', () => {
      document.body.innerHTML =
        serverTag('.a {}', 'data-styled.g1[id="A"]{content:"a1,"}') + '<div id="app"></div>';
      const sheet = new StyleSheet({ isServer: true });

      rehydrateSheet(sheet);

      const left = document.body.querySelector('style');
      expect(sheet.hasNameForId('A', 'a1')).toBe(true);
      expect(left).not.toBeNull();
      expect(left?.hasAttribute('data-sc-adopted')).toBe(true);
      // Its rules live on in the sheet; a second copy later in the page would outrank rules the sheet adds after it.
      expect(left?.textContent).toBe('');

      const other = new StyleSheet({ isServer: true });
      rehydrateSheet(other);

      expect(other.hasNameForId('A', 'a1')).toBe(false);
    });

    it('keeps and empties every adjacent server tag that precedes a page element in body', () => {
      document.body.innerHTML =
        serverTag('.a {}', 'data-styled.g1[id="A"]{content:"a1,"}') +
        serverTag('.b {}', 'data-styled.g2[id="B"]{content:"b1,"}') +
        '<div id="app"></div>';
      const sheet = new StyleSheet({ isServer: true });

      rehydrateSheet(sheet);

      const left = Array.from(document.body.querySelectorAll('style'));
      expect(sheet.hasNameForId('A', 'a1')).toBe(true);
      expect(sheet.hasNameForId('B', 'b1')).toBe(true);
      expect(left).toHaveLength(2);
      for (const tag of left) {
        expect(tag.hasAttribute('data-sc-adopted')).toBe(true);
        expect(tag.textContent).toBe('');
      }
    });
  });

  describe('cascade layers after rehydration', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('suppresses order-layer-moved when a rehydrated global declared the layer order up front', () => {
      const sheet = new StyleSheet({ isServer: true });
      adopt(sheet, '@layer a, b;', 'data-styled.g1[id="sc-global-layers"]{content:"g1,"}');
      sheet.insertRules('second', 'n1', ['@layer b { .b { color: red; } }']);
      sheet.insertRules('first', 'n2', ['@layer a { .a { color: blue; } }']);

      sheet.learn('second', 'first');

      expect(warn).not.toHaveBeenCalled();
    });

    it('warns order-layer-moved when rehydrated layered components reorder without an up-front declaration', () => {
      const sheet = new StyleSheet({ isServer: true });
      adopt(
        sheet,
        '@layer b { .b { color: red; } }',
        'data-styled.g1[id="second"]{content:"n1,"}',
        '@layer a { .a { color: blue; } }',
        'data-styled.g2[id="first"]{content:"n2,"}'
      );

      sheet.learn('second', 'first');

      expect(warn.mock.calls.map(call => call[0])).toEqual([
        '[sc] Reordering components changed the order of the cascade layers "a", "b". Declare the order up front in a global style, for example "@layer a, b;", so it does not depend on component order.',
      ]);
    });
  });
});

describe('late adoption while the document loads', () => {
  const setReadyState = (state: DocumentReadyState) => {
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => state });
  };

  /** Runs `run` against a Sheet module no other test has touched, so its first sheet rehydrates. */
  const withFreshSheet = (run: (Sheet: typeof StyleSheet) => Promise<void> | void) =>
    jest.isolateModulesAsync(async () => {
      const { default: Sheet } = await import('../Sheet');
      await run(Sheet);
    });

  afterEach(() => {
    // Lets every sheet's one-time listener fire on an empty page, so none outlives its test.
    document.body.innerHTML = '';
    document.dispatchEvent(new Event('DOMContentLoaded'));
    Reflect.deleteProperty(document, 'readyState');
  });

  it('adopts a tag that arrived since, on the next write', () =>
    withFreshSheet(Sheet => {
      setReadyState('loading');
      const sheet = new Sheet({ isServer: false });
      document.body.innerHTML = serverTag(
        '.late {}',
        'data-styled.g7[id="lateId"]{content:"late,"}'
      );
      expect(sheet.hasNameForId('lateId', 'late')).toBe(false);

      sheet.insertRules('own', 'o1', ['.own {}']);

      expect(sheet.hasNameForId('lateId', 'late')).toBe(true);
      expect(document.body.querySelector('style')).toBeNull();
    }));

  it('does not insert a rule twice when late adoption just adopted the caller', () =>
    withFreshSheet(Sheet => {
      setReadyState('loading');
      const sheet = new Sheet({ isServer: false });
      document.body.innerHTML = serverTag('.dup {}', 'data-styled.g7[id="dupId"]{content:"dup,"}');

      sheet.insertRules('dupId', 'dup', ['.dup {}']);

      expect(sheet.toString().match(/\.dup \{\}/g)).toHaveLength(1);
    }));

  it('adopts once per microtask however many writes it holds', () =>
    withFreshSheet(async Sheet => {
      setReadyState('loading');
      const sheet = new Sheet({ isServer: false });
      document.body.innerHTML = serverTag(
        '.one {}',
        'data-styled.g7[id="firstId"]{content:"first,"}'
      );
      sheet.insertRules('own', 'o1', ['.own1 {}']);
      expect(sheet.hasNameForId('firstId', 'first')).toBe(true);

      document.body.insertAdjacentHTML(
        'beforeend',
        serverTag('.two {}', 'data-styled.g8[id="secondId"]{content:"second,"}')
      );
      sheet.insertRules('own', 'o2', ['.own2 {}']);
      expect(sheet.hasNameForId('secondId', 'second')).toBe(false);

      await Promise.resolve();
      sheet.insertRules('own', 'o3', ['.own3 {}']);

      expect(sheet.hasNameForId('secondId', 'second')).toBe(true);
    }));

  it('adopts what arrived when the document finishes parsing, with no write', () =>
    withFreshSheet(Sheet => {
      setReadyState('loading');
      const sheet = new Sheet({ isServer: false });
      document.body.innerHTML = serverTag(
        '.late {}',
        'data-styled.g7[id="lateId"]{content:"late,"}'
      );

      document.dispatchEvent(new Event('DOMContentLoaded'));

      expect(sheet.hasNameForId('lateId', 'late')).toBe(true);
      expect(document.body.querySelector('style')).toBeNull();
    }));

  it('leaves a tag alone once the document has loaded', () =>
    withFreshSheet(Sheet => {
      setReadyState('complete');
      const sheet = new Sheet({ isServer: false });
      document.body.innerHTML = serverTag(
        '.late {}',
        'data-styled.g7[id="lateId"]{content:"late,"}'
      );

      sheet.insertRules('own', 'o1', ['.own {}']);
      document.dispatchEvent(new Event('DOMContentLoaded'));

      expect(sheet.hasNameForId('lateId', 'late')).toBe(false);
      expect(document.body.querySelector('style')).not.toBeNull();
    }));

  it('adopts pending tags before clearRules so a global rebuild neither drops nor duplicates rules', () =>
    withFreshSheet(async Sheet => {
      setReadyState('loading');
      const sheet = new Sheet({ isServer: false });
      sheet.insertRules('id', 'id:r1', ['body{color:red;}']);
      await Promise.resolve();

      document.body.innerHTML = serverTag(
        'h1{color:blue;}',
        'data-styled.g1[id="id"]{content:"id:r1,id:r2,"}'
      );

      sheet.clearRules('id');
      sheet.insertRules('id', 'id:r1', ['body{color:red;}']);
      sheet.insertRules('id', 'id:r2', ['h1{color:blue;}']);

      const css = sheet.toString();
      expect(css.match(/body\s*\{\s*color:\s*red;?\s*\}/g)).toHaveLength(1);
      expect(css.match(/h1\s*\{\s*color:\s*blue;?\s*\}/g)).toHaveLength(1);
    }));

  it('checks the target document readyState and DOMContentLoaded for an iframe target', () =>
    withFreshSheet(Sheet => {
      setReadyState('complete');
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument!;
      Object.defineProperty(iframeDoc, 'readyState', { configurable: true, get: () => 'loading' });

      try {
        const sheet = new Sheet({ isServer: false, target: iframeDoc.head });
        iframeDoc.body.innerHTML = serverTag(
          '.iframe-late {}',
          'data-styled.g7[id="iframeLate"]{content:"late,"}'
        );

        sheet.insertRules('own', 'o1', ['.own {}']);

        expect(sheet.hasNameForId('iframeLate', 'late')).toBe(true);
        expect(iframeDoc.body.querySelector('style')).toBeNull();

        iframeDoc.body.innerHTML = serverTag(
          '.iframe-dcl {}',
          'data-styled.g8[id="iframeDcl"]{content:"dcl,"}'
        );
        iframeDoc.dispatchEvent(new Event('DOMContentLoaded'));

        expect(sheet.hasNameForId('iframeDcl', 'dcl')).toBe(true);
        expect(iframeDoc.body.querySelector('style')).toBeNull();
      } finally {
        document.body.removeChild(iframe);
      }
    }));

  it('adopts a late tag on DOMContentLoaded when reconstructSheet switches into a loading iframe', () =>
    jest.isolateModulesAsync(async () => {
      const { default: Sheet } = await import('../Sheet');
      const { reconstructSheet: reconstruct } = await import('../reconstructSheet');
      setReadyState('complete');

      // Consumes the one-time initial rehydration flag on the main document.
      const parent = new Sheet({ isServer: false });

      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument!;
      Object.defineProperty(iframeDoc, 'readyState', { configurable: true, get: () => 'loading' });

      try {
        const iframeSheet = reconstruct(parent, { target: iframeDoc.head });
        iframeDoc.body.innerHTML = serverTag(
          '.iframe-dcl {}',
          'data-styled.g8[id="iframeDcl"]{content:"dcl,"}'
        );

        expect(iframeSheet.hasNameForId('iframeDcl', 'dcl')).toBe(false);

        iframeDoc.dispatchEvent(new Event('DOMContentLoaded'));

        expect(iframeSheet.hasNameForId('iframeDcl', 'dcl')).toBe(true);
        expect(iframeDoc.body.querySelector('style')).toBeNull();
      } finally {
        document.body.removeChild(iframe);
      }
    }));

  it('checks the target document readyState and DOMContentLoaded when a Document node is passed as target', () =>
    jest.isolateModulesAsync(async () => {
      const { default: Sheet } = await import('../Sheet');
      const { makeGroupedTag } = await import('../GroupedTag');
      const { makeTag } = await import('../Tag');
      setReadyState('complete');
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument!;
      Object.defineProperty(iframeDoc, 'readyState', { configurable: true, get: () => 'loading' });

      try {
        const sheet = new Sheet({
          isServer: false,
          target: iframeDoc as unknown as HTMLElement,
        });
        sheet.tag = makeGroupedTag(makeTag({ isServer: true }), sheet.order);
        iframeDoc.body.innerHTML = serverTag(
          '.doc-late {}',
          'data-styled.g7[id="docLate"]{content:"late,"}'
        );

        sheet.insertRules('own', 'o1', ['.own {}']);

        expect(sheet.hasNameForId('docLate', 'late')).toBe(true);
        expect(iframeDoc.body.querySelector('style')).toBeNull();

        iframeDoc.body.innerHTML = serverTag(
          '.doc-dcl {}',
          'data-styled.g8[id="docDcl"]{content:"dcl,"}'
        );
        iframeDoc.dispatchEvent(new Event('DOMContentLoaded'));

        expect(sheet.hasNameForId('docDcl', 'dcl')).toBe(true);
        expect(iframeDoc.body.querySelector('style')).toBeNull();
      } finally {
        document.body.removeChild(iframe);
      }
    }));
});

describe('version mismatch warning', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('warns once with the exact message when a mismatched-version tag exists', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="5.4.0">
        .a {}/*!sc*/
        ${SC_ATTR}.g11[id="idA"]{content:"nameA,"}/*!sc*/
      </style>
    `;

    rehydrateSheet(new StyleSheet({ isServer: true }));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      `[sc] found server-rendered styles from styled-components 5.4.0, but this copy is ${SC_VERSION}. If both come from the same app, class names will not match and hydration will fail: make sure the server and the browser load the same version (run \`npm ls styled-components\` to find duplicates). Pages that intentionally host separate apps on different versions can ignore this.`
    );
  });

  it('does not warn when the server and browser versions match', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
        .a {}/*!sc*/
        ${SC_ATTR}.g11[id="idA"]{content:"nameA,"}/*!sc*/
      </style>
    `;

    rehydrateSheet(new StyleSheet({ isServer: true }));

    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn when there are no style tags', () => {
    document.head.innerHTML = '';

    rehydrateSheet(new StyleSheet({ isServer: true }));

    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn about a mismatched-version active tag created at runtime by another client copy', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR}="${SC_ATTR_ACTIVE}" ${SC_ATTR_VERSION}="5.4.0">.a {}/*!sc*/</style>
    `;

    rehydrateSheet(new StyleSheet({ isServer: true }));

    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once even with several mismatched-version tags, across multiple rehydration calls', () => {
    document.head.innerHTML = `
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="5.4.0">.a {}/*!sc*/</style>
      <style ${SC_ATTR} ${SC_ATTR_VERSION}="5.5.0">.b {}/*!sc*/</style>
    `;

    // Neither tag matches the running version, so both stay in the DOM for the second call.
    rehydrateSheet(new StyleSheet({ isServer: true }));
    rehydrateSheet(new StyleSheet({ isServer: true }));

    expect(warn).toHaveBeenCalledTimes(1);
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
