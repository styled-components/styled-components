import StyleSheet from '../Sheet';

let sheet: InstanceType<typeof StyleSheet>;
let tag;

beforeEach(() => {
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
