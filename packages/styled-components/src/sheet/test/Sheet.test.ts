import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION, SC_VERSION } from '../../constants';
import ServerStyleSheet from '../../models/ServerStyleSheet';
import { resetWarnOnce } from '../../utils/warnOnce';
import * as GroupIDAllocator from '../GroupIDAllocator';
import { TIER, makeKey } from '../Order';
import { reconstructSheet } from '../reconstructSheet';
import { attachStreamFlush } from '../serverOrder';
import StyleSheet from '../Sheet';

let sheet: InstanceType<typeof StyleSheet>;
let tag;

beforeEach(() => {
  GroupIDAllocator.resetGroupIds();
  sheet = new StyleSheet({ isServer: true });
  tag = sheet.getTag().tag;
});

it('inserts rules correctly', () => {
  expect(tag.length).toBe(0);
  sheet.insertRules('id', 'name', ['.test {}']);
  expect(sheet.hasNameForId('id', 'name')).toBe(true);
  expect(tag.length).toBe(1);
});

it('claimNameForId reserves a name for the current turn without registering', () => {
  // Client sheet: server sheets skip the provisional store entirely.
  const client = new StyleSheet({ isServer: false });
  expect(client.claimNameForId('id', 'name')).toBe(true);
  expect(client.claimNameForId('id', 'name')).toBe(false);
  // Provisional only: not permanently registered until insertRules/registerName.
  expect(client.hasNameForId('id', 'name')).toBe(false);
  client.registerName('id', 'name');
  expect(client.hasNameForId('id', 'name')).toBe(true);
  expect(client.claimNameForId('id', 'name')).toBe(false);
});

it('shares stashed rules with same-turn followers and clears them after the turn', async () => {
  const client = new StyleSheet({ isServer: false });
  expect(client.claimNameForId('id', 'temp')).toBe(true);
  client.stashProvisionalRules('id', 'temp', ['.temp{}']);
  expect(client.claimNameForId('id', 'temp')).toBe(false);
  expect(client.getProvisionalRules('id', 'temp')).toEqual(['.temp{}']);
  await Promise.resolve();
  expect(client.getProvisionalRules('id', 'temp')).toBeUndefined();
  expect(client.claimNameForId('id', 'temp')).toBe(true);
});

it('skips provisional bookkeeping on server sheets', () => {
  expect(sheet.claimNameForId('id', 'a')).toBe(true);
  expect(sheet.claimNameForId('id', 'a')).toBe(true);
  expect(sheet.getProvisionalRules('id', 'a')).toBeUndefined();
});

it('allows to register and clear names for ids manually', () => {
  sheet.registerName('id', 'name');
  expect(sheet.hasNameForId('id', 'name')).toBe(true);
  // The name and IDs are only unique in combination
  expect(sheet.hasNameForId('id', 'name2')).toBe(false);
  expect(sheet.hasNameForId('id2', 'name')).toBe(false);

  sheet.clearNames('id');
  expect(sheet.hasNameForId('id', 'name')).toBe(false);
});

it('clears rules correctly', () => {
  // First we insert an unaffected group
  sheet.insertRules('dummy', 'dummy', ['.unaffected {}']);
  expect(sheet.hasNameForId('dummy', 'dummy')).toBe(true);
  expect(tag.length).toBe(1);

  sheet.insertRules('id', 'name', ['.test {}']);
  expect(sheet.hasNameForId('id', 'name')).toBe(true);
  expect(tag.length).toBe(2);

  sheet.clearRules('id');
  expect(tag.length).toBe(1);
  expect(sheet.hasNameForId('id', 'name')).toBe(false);
  expect(sheet.hasNameForId('dummy', 'dummy')).toBe(true);
});

it('converts to string correctly', () => {
  sheet.insertRules('id', 'name', ['.test {}']);
  expect(sheet.toString()).toMatchInlineSnapshot(`
    ".test {}/*!sc*/
    data-styled.g1[id="id"]{content:"name,"}/*!sc*/
    "
  `);
});

/** The ids of the sheet's groups in output order. */
const idsInOrder = (target: StyleSheet) =>
  target.order.posList.map(group => GroupIDAllocator.idForGroup(group));

describe('placement', () => {
  it('sorts groups by tier and seq whatever the insertion order', () => {
    // Allocation order is the client seq: `client` gets 1, `server` 2, `global` 3, `keyframes` 4.
    for (const id of ['client', 'server', 'sc-global-g', 'sc-keyframes-k']) {
      StyleSheet.registerId(id);
    }

    sheet.insertRules('client', 'a', ['.client {}']);
    sheet.insertRules('server', 'b', ['.server {}'], { seq: 7, server: true });
    // Placement reads the id, not the rule text (the jsdom stylesheet reformats keyframes text).
    sheet.insertRules('sc-keyframes-k', 'c', ['.k {}']);
    sheet.insertRules('sc-global-g', 'd', ['body {}']);

    expect(idsInOrder(sheet)).toEqual(['sc-global-g', 'sc-keyframes-k', 'server', 'client']);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body {}/*!sc*/
      data-styled.g3[id="sc-global-g"]{content:"d,"}/*!sc*/
      .k {}/*!sc*/
      data-styled.g4[id="sc-keyframes-k"]{content:"c,"}/*!sc*/
      .server {}/*!sc*/
      data-styled.g2[id="server"].s7{content:"b,"}/*!sc*/
      .client {}/*!sc*/
      data-styled.g1[id="client"]{content:"a,"}/*!sc*/
      "
    `);
  });

  it('puts a server global before a client global and both before every component', () => {
    sheet.insertRules('component', 'a', ['.c {}']);
    sheet.insertRules('sc-global-client', 'b', ['body {}']);
    sheet.insertRules('sc-global-server', 'c', ['html {}'], { seq: 1, server: true });

    expect(idsInOrder(sheet)).toEqual(['sc-global-server', 'sc-global-client', 'component']);
  });

  it('keeps the key a shared id first arrived with', () => {
    StyleSheet.registerId('other');
    sheet.insertRules('shared', 'a', ['.a {}'], { seq: 5, server: true });
    sheet.insertRules('other', 'b', ['.b {}']);

    sheet.insertRules('shared', 'c', ['.c {}']);

    expect(sheet.order.keyOf(GroupIDAllocator.groupForId('shared'))).toBe(makeKey(TIER.server, 5));
    expect(idsInOrder(sheet)).toEqual(['shared', 'other']);
  });

  it('positions a chain extension right after its base, whatever its own key', () => {
    StyleSheet.registerId('other');
    StyleSheet.registerId('extension', 'base');
    sheet.insertRules('other', 'o', ['.other {}']);

    sheet.insertRules('extension', 'e', ['.extension {}'], { seq: 1, server: true });
    sheet.insertRules('base', 'b', ['.base {}']);

    expect(idsInOrder(sheet)).toEqual(['other', 'base', 'extension']);
  });
});

describe('learn', () => {
  it('moves an outer after its inner in the output, rules and all', () => {
    sheet.insertRules('inner', 'a', ['.inner {}']);
    sheet.insertRules('outer', 'b', ['.outer {}']);
    expect(sheet.isSettled('inner', 'outer')).toBe(false);

    sheet.learn('inner', 'outer');

    expect(sheet.isSettled('inner', 'outer')).toBe(true);
    expect(idsInOrder(sheet)).toEqual(['outer', 'inner']);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      ".outer {}/*!sc*/
      data-styled.g2[id="outer"]{content:"b,"}/*!sc*/
      .inner {}/*!sc*/
      data-styled.g1[id="inner"]{content:"a,"}/*!sc*/
      "
    `);
  });

  it('allocates nothing for an id the register has not seen', () => {
    expect(sheet.isSettled('never-seen', 'also-never-seen')).toBe(false);

    expect(GroupIDAllocator.lookupGroup('never-seen')).toBe(undefined);
  });
});

describe('clearTag', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    resetWarnOnce();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('keeps the order of a server sheet and moves what the tag held to the flushed rules', () => {
    const stream = attachStreamFlush(sheet);
    sheet.insertRules('a', 'n1', ['.a {}']);
    sheet.insertRules('b', 'n2', ['.b {}']);
    sheet.learn('a', 'b');
    const positions = [...sheet.order.posList];

    sheet.clearTag();

    expect(sheet.order.posList).toEqual(positions);
    expect([...stream.flushed]).toEqual([
      [2, '.b {}/*!sc*/\n'],
      [1, '.a {}/*!sc*/\n'],
    ]);
  });

  it('adds to what a group already flushed', () => {
    const stream = attachStreamFlush(sheet);
    sheet.insertRules('a', 'n1', ['.a1 {}']);
    sheet.clearTag();
    sheet.insertRules('a', 'n2', ['.a2 {}']);

    sheet.clearTag();

    expect(stream.flushed.get(GroupIDAllocator.groupForId('a'))).toBe(
      '.a1 {}/*!sc*/\n.a2 {}/*!sc*/\n'
    );
  });

  it('empties the edge seeds, and keeps contested pairs, of a server sheet', () => {
    const stream = attachStreamFlush(sheet);
    sheet.insertRules('a', 'n1', ['.a {}']);
    sheet.insertRules('b', 'n2', ['.b {}']);
    sheet.clearTag();
    sheet.learn('b', 'a');
    sheet.learn('a', 'b');
    expect(stream.edgeSeeds.size).toBe(1);
    expect(sheet.order.contested.size).toBe(1);

    sheet.clearTag();

    expect(stream.edgeSeeds.size).toBe(0);
    expect(sheet.order.contested.size).toBe(1);
  });

  it('keeps names, so a server sheet sends only new rules after a flush', () => {
    sheet.insertRules('a', 'n1', ['.a {}']);

    sheet.clearTag();

    expect(sheet.hasNameForId('a', 'n1')).toBe(true);
    expect(sheet.getTag().tag.length).toBe(0);
  });

  it('resets the order of a browser sheet', () => {
    const browser = new StyleSheet({ isServer: false });
    browser.insertRules('a', 'n1', ['.a {}']);
    browser.insertRules('b', 'n2', ['.b {}']);
    browser.learn('a', 'b');
    browser.learn('b', 'a');
    browser.order.rehydrated = true;
    expect(browser.order.contested.size).toBe(1);

    browser.clearTag();

    expect(browser.order.posList).toEqual([]);
    expect(browser.order.contested.size).toBe(0);
    expect(browser.order.rehydrated).toBe(false);
    expect(browser.order.streamFlush).toBeUndefined();
  });

  it('auto-attaches streamFlush only to server sheets when __SERVER__ is true', () => {
    const globals = globalThis as unknown as { __SERVER__: boolean };
    const previous = globals.__SERVER__;
    globals.__SERVER__ = true;

    try {
      const serverSheet = new StyleSheet({ isServer: true });
      const browserSheet = new StyleSheet({ isServer: false });

      expect(serverSheet.order.streamFlush).toBeDefined();
      expect(browserSheet.order.streamFlush).toBeUndefined();

      serverSheet.insertRules('a', 'n1', ['.a {}']);
      serverSheet.insertRules('b', 'n2', ['.b {}']);
      serverSheet.clearTag();
      serverSheet.learn('b', 'a');

      expect(serverSheet.toString()).toBe(
        '.b {}/*!sc*/\ndata-styled.g2[id="b"].f{content:"n2,"}/*!sc*/\n'
      );
    } finally {
      globals.__SERVER__ = previous;
    }
  });

  it('attaches streamFlush on ServerStyleSheet even when __SERVER__ is false', () => {
    expect(__SERVER__).toBe(false);

    const ssrSheet = new ServerStyleSheet();
    expect(ssrSheet.instance.order.streamFlush).toBeDefined();

    ssrSheet.instance.insertRules('a', 'n1', ['.a {}']);
    ssrSheet.instance.insertRules('b', 'n2', ['.b {}']);
    ssrSheet.instance.clearTag();
    ssrSheet.instance.learn('b', 'a');

    expect(ssrSheet.instance.toString()).toBe(
      '.b {}/*!sc*/\ndata-styled.g2[id="b"].f{content:"n2,"}/*!sc*/\n'
    );
  });
});

describe('cascade layers', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    resetWarnOnce();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  /*
   * css-cascade-5, 6.4.3 Layer Ordering: "Cascade layers are sorted by the order in which they first
   * are declared, with nested layers grouped within their parent layer. Unlayered rules are sorted
   * later than any layered rules within the same parent layer (if any)."
   */
  it('warns once when a move changes which layer is first declared', () => {
    sheet.insertRules('second', 'n1', ['@layer b { .b { color: red; } }']);
    sheet.insertRules('first', 'n2', ['@layer a { .a { color: blue; } }']);
    expect(idsInOrder(sheet)).toEqual(['second', 'first']);

    sheet.learn('second', 'first');

    expect(idsInOrder(sheet)).toEqual(['first', 'second']);
    expect(warn.mock.calls.map(call => call[0])).toEqual([
      '[sc] Reordering components changed the order of the cascade layers "a", "b". Declare the order up front in a global style, for example "@layer a, b;", so it does not depend on component order.',
    ]);
  });

  it('stays silent, and keeps the statement first, when a global declares the order up front', () => {
    sheet.insertRules('sc-global-layers', 'g', ['@layer b, a;']);
    sheet.insertRules('second', 'n1', ['@layer b { .b { color: red; } }']);
    sheet.insertRules('first', 'n2', ['@layer a { .a { color: blue; } }']);

    sheet.learn('second', 'first');

    expect(idsInOrder(sheet)).toEqual(['sc-global-layers', 'first', 'second']);
    expect(warn).not.toHaveBeenCalled();
  });

  it('stays silent when a move leaves the layer order alone', () => {
    sheet.insertRules('second', 'n1', ['@layer b { .b { color: red; } }']);
    sheet.insertRules('first', 'n2', ['.plain { color: blue; }']);

    sheet.learn('second', 'first');

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('reconstructSheet', () => {
  it('copies the order of a browser sheet and leaves the original alone', () => {
    resetWarnOnce();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const browser = new StyleSheet({ isServer: false });
      StyleSheet.registerId('ext', 'base');
      browser.insertRules('a', 'n1', ['.a {}']);
      browser.insertRules('b', 'n2', ['.b {}']);
      browser.insertRules('e1', 'ne1', ['.e1 {}']);
      browser.insertRules('e2', 'ne2', ['.e2 {}']);
      browser.learn('e2', 'e1');
      browser.insertRules('c1', 'nc1', ['.c1 {}']);
      browser.insertRules('c2', 'nc2', ['.c2 {}']);
      browser.learn('c2', 'c1');
      browser.learn('c1', 'c2');
      browser.insertRules('base', 'nb', ['.base {}']);
      browser.insertRules('ext', 'ne', ['.ext {}']);
      browser.learn('base', 'ext');
      browser.insertRules('l1', 'nl1', ['@layer b { .lb {} }']);
      browser.insertRules('l2', 'nl2', ['@layer a { .la {} }']);

      const copy = reconstructSheet(browser, { nonce: 'abc' });
      expect(copy.order.posList).toEqual(browser.order.posList);
      expect(
        copy.order.outerMap
          .get(GroupIDAllocator.groupForId('e1'))
          ?.get(GroupIDAllocator.groupForId('e2'))
      ).toBe(false);
      expect(
        copy.order.outerMap
          .get(GroupIDAllocator.groupForId('base'))
          ?.get(GroupIDAllocator.groupForId('ext'))
      ).toBe(true);
      expect(copy.order.contested.size).toBe(1);
      expect(copy.order.refused.size).toBe(1);
      expect(copy.order.pinned.size).toBe(1);
      expect(copy.order.layerGroups?.has('a')).toBe(true);
      expect(copy.order.layerGroups?.has('b')).toBe(true);

      copy.insertRules('a', 'ca', ['.a-copy {}']);
      copy.insertRules('b', 'cb', ['.b-copy {}']);
      copy.insertRules('l3', 'nl3', ['@layer c { .lc {} }']);
      copy.learn('a', 'b');

      expect(copy.toString().indexOf('.b-copy {}')).toBeLessThan(
        copy.toString().indexOf('.a-copy {}')
      );
      expect(browser.toString().indexOf('.a {}')).toBeLessThan(browser.toString().indexOf('.b {}'));
      expect(idsInOrder(copy).indexOf('b')).toBeLessThan(idsInOrder(copy).indexOf('a'));
      expect(idsInOrder(browser).indexOf('a')).toBeLessThan(idsInOrder(browser).indexOf('b'));
      expect(browser.isSettled('a', 'b')).toBe(false);
      expect(browser.order.layerGroups?.has('c')).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });

  it('leaves copy.order.rehydrated false on same-container reconstruct so it does not steal pending body tags', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    const portalDiv = document.createElement('div');
    document.body.appendChild(portalDiv);

    try {
      const browser = new StyleSheet({ isServer: false });
      browser.rehydrate();
      expect(browser.order.rehydrated).toBe(true);

      const copy = reconstructSheet(browser, { target: portalDiv });
      expect(copy.order.rehydrated).toBe(false);

      const lateStyle = document.createElement('style');
      lateStyle.setAttribute(SC_ATTR, '');
      lateStyle.setAttribute(SC_ATTR_VERSION, SC_VERSION);
      lateStyle.textContent = `.late {}/*!sc*/\n${SC_ATTR}.g9[id="lateId"]{content:"late,"}/*!sc*/\n`;
      document.body.appendChild(lateStyle);

      copy.insertRules('portal', 'p1', ['.portal {}']);

      expect(copy.hasNameForId('lateId', 'late')).toBe(false);
      expect(lateStyle.parentNode).toBe(document.body);
    } finally {
      Reflect.deleteProperty(document, 'readyState');
      document.head.innerHTML = '';
      document.body.innerHTML = '';
    }
  });

  it('starts a server sheet with an empty order', () => {
    sheet.insertRules('a', 'n1', ['.a {}']);

    expect(reconstructSheet(sheet, { nonce: 'abc' }).order.posList).toEqual([]);
  });

  it('creates a new sheet with merged options', () => {
    const originalSheet = new StyleSheet({ isServer: true });
    originalSheet.insertRules('id1', 'name1', ['.original {}']);

    const newSheet = reconstructSheet(originalSheet, { nonce: 'abc' });

    // New sheet should have merged options
    expect(newSheet.options.isServer).toBe(true);
    expect(newSheet.options.nonce).toBe('abc');

    // New sheet should preserve names
    expect(newSheet.hasNameForId('id1', 'name1')).toBe(true);
  });

  it('does not preserve names when withNames is false', () => {
    const originalSheet = new StyleSheet({ isServer: true });
    originalSheet.registerName('id1', 'name1');

    const newSheet = reconstructSheet(originalSheet, {}, false);

    expect(newSheet.hasNameForId('id1', 'name1')).toBe(false);
  });

  describe('Shadow DOM rehydration on target change', () => {
    beforeEach(() => {
      // Clean up document
      document.head.innerHTML = '';
      document.body.innerHTML = '';
    });

    it('rehydrates when target changes from undefined to shadow root', () => {
      // Create shadow root with server-rendered styles
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      shadowRoot.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow-test {}/*!sc*/
          ${SC_ATTR}.g15[id="shadowTestId"]{content:"shadowTestName,"}/*!sc*/
        </style>
      `;

      // Create initial sheet without target (client-side)
      const originalSheet = new StyleSheet({ isServer: false });

      // Reconstruct with shadow root target
      const newSheet = reconstructSheet(originalSheet, { target: shadowRoot });

      // Should have rehydrated from shadow root
      expect(GroupIDAllocator.idForGroup(15)).toBe('shadowTestId');
      expect(newSheet.hasNameForId('shadowTestId', 'shadowTestName')).toBe(true);

      // Cleanup
      document.body.removeChild(hostElement);
    });

    it('preserves first-pass document order when reconstructing an already-rehydrated sheet onto a shadow root', () => {
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .doc-a {}/*!sc*/
          ${SC_ATTR}.g1[id="docA"]{content:"nameA,"}/*!sc*/
        </style>
      `;

      const originalSheet = new StyleSheet({ isServer: false });
      originalSheet.rehydrate();
      expect(originalSheet.order.rehydrated).toBe(true);
      expect(idsInOrder(originalSheet)).toEqual(['docA']);

      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      shadowRoot.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow-b {}/*!sc*/
          ${SC_ATTR}.g2[id="shadowB"]{content:"nameB,"}/*!sc*/
          body {}/*!sc*/
          ${SC_ATTR}.g3[id="sc-global-shadowG"]{content:"nameG,"}/*!sc*/
          .shadow-a {}/*!sc*/
          ${SC_ATTR}.g1[id="docA"]{content:"nameAShadow,"}/*!sc*/
        </style>
      `;

      const newSheet = reconstructSheet(originalSheet, { target: shadowRoot });

      expect(newSheet.order.rehydrated).toBe(true);
      expect(idsInOrder(newSheet)).toEqual(['shadowB', 'sc-global-shadowG', 'docA']);
      expect(idsInOrder(originalSheet)).toEqual(['docA']);

      document.body.removeChild(hostElement);
    });

    it('rehydrates when target changes from one shadow root to another', () => {
      // Create first shadow root
      const host1 = document.createElement('div');
      document.body.appendChild(host1);
      const shadowRoot1 = host1.attachShadow({ mode: 'open' });

      shadowRoot1.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow1 {}/*!sc*/
          ${SC_ATTR}.g16[id="shadow1Id"]{content:"shadow1Name,"}/*!sc*/
        </style>
      `;

      // Create second shadow root
      const host2 = document.createElement('div');
      document.body.appendChild(host2);
      const shadowRoot2 = host2.attachShadow({ mode: 'open' });

      shadowRoot2.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow2 {}/*!sc*/
          ${SC_ATTR}.g17[id="shadow2Id"]{content:"shadow2Name,"}/*!sc*/
        </style>
      `;

      // Create sheet with first shadow root
      const originalSheet = new StyleSheet({ isServer: false, target: shadowRoot1 });

      // Reconstruct with second shadow root
      const newSheet = reconstructSheet(originalSheet, { target: shadowRoot2 });

      // Should have rehydrated from second shadow root
      expect(GroupIDAllocator.idForGroup(17)).toBe('shadow2Id');
      expect(newSheet.hasNameForId('shadow2Id', 'shadow2Name')).toBe(true);

      // Cleanup
      document.body.removeChild(host1);
      document.body.removeChild(host2);
    });

    it('does not rehydrate when target remains the same', () => {
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      shadowRoot.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .same-target {}/*!sc*/
          ${SC_ATTR}.g18[id="sameTargetId"]{content:"sameTargetName,"}/*!sc*/
        </style>
      `;

      // Create sheet with shadow root and manually rehydrate
      const originalSheet = new StyleSheet({ isServer: false, target: shadowRoot });
      originalSheet.rehydrate();

      // After rehydration, the old server-rendered tag should be removed
      // and a new active tag should be created
      const styleTags = shadowRoot.querySelectorAll('style');
      expect(styleTags.length).toBe(1);
      expect(styleTags[0].getAttribute(SC_ATTR)).toBe(SC_ATTR_ACTIVE);

      // Reconstruct with same target
      const newSheet = reconstructSheet(originalSheet, { target: shadowRoot });

      // Should NOT attempt to rehydrate again (no styles to find)
      // But should still have the names from the original sheet
      expect(newSheet.hasNameForId('sameTargetId', 'sameTargetName')).toBe(true);

      // Cleanup
      document.body.removeChild(hostElement);
    });

    it('does not rehydrate when target is omitted and inherited shadow root stays the same', () => {
      const host1 = document.createElement('div');
      document.body.appendChild(host1);
      const shadowRoot1 = host1.attachShadow({ mode: 'open' });

      const originalSheet = new StyleSheet({ isServer: false, target: shadowRoot1 });

      shadowRoot1.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow-nonce {}/*!sc*/
          ${SC_ATTR}.g21[id="shadowNonceId"]{content:"shadowNonceName,"}/*!sc*/
        </style>
      `;

      const reconstructed = reconstructSheet(originalSheet, { nonce: 'abc' });

      expect(reconstructed.options.target).toBe(shadowRoot1);
      expect(reconstructed.options.nonce).toBe('abc');
      expect(reconstructed.hasNameForId('shadowNonceId', 'shadowNonceName')).toBe(false);
      expect(shadowRoot1.querySelector('style')).not.toBeNull();

      const host2 = document.createElement('div');
      document.body.appendChild(host2);
      const shadowRoot2 = host2.attachShadow({ mode: 'open' });
      shadowRoot2.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .shadow-next {}/*!sc*/
          ${SC_ATTR}.g22[id="shadowNextId"]{content:"shadowNextName,"}/*!sc*/
        </style>
      `;

      const retargeted = reconstructSheet(reconstructed, { target: shadowRoot2 });

      expect(retargeted.hasNameForId('shadowNextId', 'shadowNextName')).toBe(true);
      expect(
        shadowRoot2.querySelector(`style[${SC_ATTR}]:not([${SC_ATTR}="${SC_ATTR_ACTIVE}"])`)
      ).toBeNull();

      document.body.removeChild(host1);
      document.body.removeChild(host2);
    });

    it('does not rehydrate on server', () => {
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      shadowRoot.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .server-test {}/*!sc*/
          ${SC_ATTR}.g19[id="serverTestId"]{content:"serverTestName,"}/*!sc*/
        </style>
      `;

      // Create server-side sheet
      const originalSheet = new StyleSheet({ isServer: true });

      // Reconstruct with shadow root target
      const newSheet = reconstructSheet(originalSheet, { target: shadowRoot });

      // Should NOT rehydrate on server
      expect(GroupIDAllocator.idForGroup(19)).toBe(undefined);
      expect(newSheet.hasNameForId('serverTestId', 'serverTestName')).toBe(false);

      // Cleanup
      document.body.removeChild(hostElement);
    });

    it('does not rehydrate when target changes within same container', () => {
      const hostElement = document.createElement('div');
      document.body.appendChild(hostElement);
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      // Add server-rendered styles to shadow root
      shadowRoot.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .same-container {}/*!sc*/
          ${SC_ATTR}.g20[id="sameContainerId"]{content:"sameContainerName,"}/*!sc*/
        </style>
      `;

      // Create two different elements in the same shadow root
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      shadowRoot.appendChild(div1);
      shadowRoot.appendChild(div2);

      // Create sheet with first div as target and rehydrate
      const originalSheet = new StyleSheet({ isServer: false, target: div1 });
      originalSheet.rehydrate();

      // Verify rehydration happened
      expect(originalSheet.hasNameForId('sameContainerId', 'sameContainerName')).toBe(true);

      // Count style tags after first rehydration
      const styleTagsAfterFirst = shadowRoot.querySelectorAll('style');
      const firstCount = styleTagsAfterFirst.length;

      // Reconstruct with second div (different target, same shadow root container)
      const newSheet = reconstructSheet(originalSheet, { target: div2 });

      // Should NOT rehydrate again (same container)
      // Style tag count should remain the same
      const styleTagsAfterSecond = shadowRoot.querySelectorAll('style');
      expect(styleTagsAfterSecond.length).toBe(firstCount);

      // But should still have the names from the original sheet
      expect(newSheet.hasNameForId('sameContainerId', 'sameContainerName')).toBe(true);

      // Cleanup
      document.body.removeChild(hostElement);
    });

    it('rehydrates from an iframe Document target without stealing outer document tags', () => {
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .outer {}/*!sc*/
          ${SC_ATTR}.g23[id="outerId"]{content:"outerName,"}/*!sc*/
        </style>
      `;

      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument!;
      iframeDoc.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${SC_VERSION}">
          .iframe {}/*!sc*/
          ${SC_ATTR}.g24[id="iframeId"]{content:"iframeName,"}/*!sc*/
        </style>
        <meta charset="utf-8">
      `;

      try {
        const parent = new StyleSheet({ isServer: false });
        const iframeSheet = reconstructSheet(parent, { target: iframeDoc.head });

        expect(iframeSheet.hasNameForId('iframeId', 'iframeName')).toBe(true);
        expect(iframeSheet.hasNameForId('outerId', 'outerName')).toBe(false);
        expect(
          iframeDoc.head.querySelector(`style[${SC_ATTR}]:not([${SC_ATTR}="${SC_ATTR_ACTIVE}"])`)
        ).toBeNull();
        expect(
          document.head.querySelector(`style[${SC_ATTR}]:not([${SC_ATTR}="${SC_ATTR_ACTIVE}"])`)
        ).not.toBeNull();
      } finally {
        document.body.removeChild(iframe);
      }
    });
  });
});
