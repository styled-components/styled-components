// @flow

import RuleGroupTag from '../src/tags/RuleGroupTag';
import VirtualTag from '../src/tags/VirtualTag';

let tag;
let ruleGroupTag;

beforeEach(() => {
  tag = new VirtualTag();
  ruleGroupTag = new RuleGroupTag(tag);
});

it('correctly inserts rules in order of the given index', () => {
  const firstGroup = ['.a {}', '.b {}'];
  const secondGroup = ['.c {}', '.d {}'];

  // This is purposefully out of order and separated by 1 to test
  // that the order index actually matters
  expect(ruleGroupTag.insertRules(2, secondGroup)).toBe(2);
  expect(ruleGroupTag.insertRules(0, firstGroup)).toBe(2);

  expect(ruleGroupTag.rulesPerGroup.slice(0, 3)).toEqual([2, 0, 2]);

  expect(ruleGroupTag.getGroup(0)).toBe(
    firstGroup[0] + '\n' +
    firstGroup[1] + '\n'
  );

  expect(ruleGroupTag.getGroup(1)).toBe('');

  expect(ruleGroupTag.getGroup(2)).toBe(
    secondGroup[0] + '\n' +
    secondGroup[1] + '\n'
  );

  expect(tag.rules).toEqual([...firstGroup, ...secondGroup]);
});

it('is able to clear out groups', () => {
  const firstGroup = ['.a {}', '.b {}'];
  const secondGroup = ['.c {}', '.d {}'];

  ruleGroupTag.insertRules(0, firstGroup);
  ruleGroupTag.insertRules(1, secondGroup);
  expect(ruleGroupTag.rulesPerGroup.slice(0, 2)).toEqual([2, 2]);

  expect(ruleGroupTag.getGroup(0)).not.toBe('');
  expect(ruleGroupTag.getGroup(1)).not.toBe('');

  ruleGroupTag.clearGroup(1);

  expect(ruleGroupTag.getGroup(0)).not.toBe('');
  expect(ruleGroupTag.getGroup(1)).toBe('');
});
