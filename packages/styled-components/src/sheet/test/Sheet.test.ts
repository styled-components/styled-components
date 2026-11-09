import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION, SC_VERSION } from '../../constants';
import { resetWarnOnce } from '../../utils/warnOnce';
import * as GroupIDAllocator from '../GroupIDAllocator';
import { TIER, makeKey } from '../Order';
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
  target.order.positions.map(group => GroupIDAllocator.idForGroup(group));

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
    sheet.insertRules('a', 'n1', ['.a {}']);
    sheet.insertRules('b', 'n2', ['.b {}']);
    sheet.learn('a', 'b');
    const positions = [...sheet.order.positions];

    sheet.clearTag();

    expect(sheet.order.positions).toEqual(positions);
    expect([...sheet.order.flushed]).toEqual([
      [2, '.b {}/*!sc*/\n'],
      [1, '.a {}/*!sc*/\n'],
    ]);
  });

  it('adds to what a group already flushed', () => {
    sheet.insertRules('a', 'n1', ['.a1 {}']);
    sheet.clearTag();
    sheet.insertRules('a', 'n2', ['.a2 {}']);

    sheet.clearTag();

    expect(sheet.order.flushed.get(GroupIDAllocator.groupForId('a'))).toBe(
      '.a1 {}/*!sc*/\n.a2 {}/*!sc*/\n'
    );
  });

  it('empties the edge seeds, and keeps contested pairs, of a server sheet', () => {
    sheet.insertRules('a', 'n1', ['.a {}']);
    sheet.insertRules('b', 'n2', ['.b {}']);
    sheet.clearTag();
    sheet.learn('b', 'a');
    sheet.learn('a', 'b');
    expect(sheet.order.edgeSeeds.size).toBe(1);
    expect(sheet.order.contested.size).toBe(1);

    sheet.clearTag();

    expect(sheet.order.edgeSeeds.size).toBe(0);
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

    expect(browser.order.positions).toEqual([]);
    expect(browser.order.contested.size).toBe(0);
    expect(browser.order.rehydrated).toBe(false);
    expect(browser.order.flushed.size).toBe(0);
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

describe('reconstructWithOptions', () => {
  it('copies the order of a browser sheet and leaves the original alone', () => {
    const browser = new StyleSheet({ isServer: false });
    browser.insertRules('a', 'n1', ['.a {}']);
    browser.insertRules('b', 'n2', ['.b {}']);

    const copy = browser.reconstructWithOptions({ nonce: 'abc' });
    expect(copy.order.positions).toEqual(browser.order.positions);
    copy.learn('a', 'b');

    expect(idsInOrder(copy)).toEqual(['b', 'a']);
    expect(idsInOrder(browser)).toEqual(['a', 'b']);
  });

  it('starts a server sheet with an empty order', () => {
    sheet.insertRules('a', 'n1', ['.a {}']);

    expect(sheet.reconstructWithOptions({ nonce: 'abc' }).order.positions).toEqual([]);
  });

  it('creates a new sheet with merged options', () => {
    const originalSheet = new StyleSheet({ isServer: true });
    originalSheet.insertRules('id1', 'name1', ['.original {}']);

    const newSheet = originalSheet.reconstructWithOptions({ nonce: 'abc' });

    // New sheet should have merged options
    expect(newSheet.options.isServer).toBe(true);
    expect(newSheet.options.nonce).toBe('abc');

    // New sheet should preserve names
    expect(newSheet.hasNameForId('id1', 'name1')).toBe(true);
  });

  it('preserves names when withNames is true', () => {
    const originalSheet = new StyleSheet({ isServer: true });
    originalSheet.registerName('id1', 'name1');
    originalSheet.registerName('id2', 'name2');

    const newSheet = originalSheet.reconstructWithOptions({}, true);

    expect(newSheet.hasNameForId('id1', 'name1')).toBe(true);
    expect(newSheet.hasNameForId('id2', 'name2')).toBe(true);
  });

  it('does not preserve names when withNames is false', () => {
    const originalSheet = new StyleSheet({ isServer: true });
    originalSheet.registerName('id1', 'name1');

    const newSheet = originalSheet.reconstructWithOptions({}, false);

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
      const newSheet = originalSheet.reconstructWithOptions({ target: shadowRoot });

      // Should have rehydrated from shadow root
      expect(GroupIDAllocator.idForGroup(15)).toBe('shadowTestId');
      expect(newSheet.hasNameForId('shadowTestId', 'shadowTestName')).toBe(true);

      // Cleanup
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
      const newSheet = originalSheet.reconstructWithOptions({ target: shadowRoot2 });

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
      const newSheet = originalSheet.reconstructWithOptions({ target: shadowRoot });

      // Should NOT attempt to rehydrate again (no styles to find)
      // But should still have the names from the original sheet
      expect(newSheet.hasNameForId('sameTargetId', 'sameTargetName')).toBe(true);

      // Cleanup
      document.body.removeChild(hostElement);
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
      const newSheet = originalSheet.reconstructWithOptions({ target: shadowRoot });

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
      const newSheet = originalSheet.reconstructWithOptions({ target: div2 });

      // Should NOT rehydrate again (same container)
      // Style tag count should remain the same
      const styleTagsAfterSecond = shadowRoot.querySelectorAll('style');
      expect(styleTagsAfterSecond.length).toBe(firstCount);

      // But should still have the names from the original sheet
      expect(newSheet.hasNameForId('sameContainerId', 'sameContainerName')).toBe(true);

      // Cleanup
      document.body.removeChild(hostElement);
    });
  });
});
