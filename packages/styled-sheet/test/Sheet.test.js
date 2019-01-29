// @flow
import { Sheet, GroupRegistry } from '../src';

it('should inject CSS', () => {
  const group = GroupRegistry.registerRuleGroup('name');
  const sheet = new Sheet(undefined, true);
  sheet.inject(group, 'key', ['.class { color: blue; background: red; }']);
  expect(sheet.toString()).toMatchInlineSnapshot(`
"/*sc-1:name:key*/
.class { color: blue; background: red; }
"
`);
});

it('should handle multiple CSS groups', () => {
  const sheet = new Sheet(undefined, true);
  const group1 = GroupRegistry.registerRuleGroup('name1');
  const group2 = GroupRegistry.registerRuleGroup('name2');
  sheet.inject(group1, 'key1', ['.class1 { color: blue; background: red; }']);
  sheet.inject(group2, 'key2', ['.class2 { color: blue; background: red; }']);
  expect(sheet.toString()).toMatchInlineSnapshot(`
"/*sc-2:name1:key1*/
.class1 { color: blue; background: red; }
/*sc-3:name2:key2*/
.class2 { color: blue; background: red; }
"
`);
});
