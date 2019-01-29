// @flow
import { Sheet, GroupRegistry } from '../src';

it('should inject some CSS', () => {
  const group = GroupRegistry.registerRuleGroup('name');
  const sheet = new Sheet(undefined, true);
  sheet.inject(group, 'key', ['.class { color: blue; background: red; }']);
  expect(sheet.toString()).toMatchInlineSnapshot(`
"/*sc-1:name:key*/
.class { color: blue; background: red; }
"
`);
});
