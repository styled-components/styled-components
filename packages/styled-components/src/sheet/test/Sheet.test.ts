import { SC_ATTR, SC_ATTR_ACTIVE, SC_ATTR_VERSION, SC_VERSION } from '../../constants';
import * as GroupIDAllocator from '../GroupIDAllocator';
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

describe('reconstructWithOptions', () => {
  it('creates a new sheet with merged options', () => {
    const originalSheet = new StyleSheet({ isServer: true, useCSSOMInjection: false });
    originalSheet.insertRules('id1', 'name1', ['.original {}']);

    const newSheet = originalSheet.reconstructWithOptions({ useCSSOMInjection: true });

    // New sheet should have merged options
    expect(newSheet.options.isServer).toBe(true);
    expect(newSheet.options.useCSSOMInjection).toBe(true);

    // New sheet should share global styles
    expect(newSheet.gs).toBe(originalSheet.gs);

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
      expect(GroupIDAllocator.getIdForGroup(15)).toBe('shadowTestId');
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
      expect(GroupIDAllocator.getIdForGroup(17)).toBe('shadow2Id');
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
      expect(GroupIDAllocator.getIdForGroup(19)).toBe(undefined);
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
