// @flow

import { VirtualTag } from '../Tag';
import { makeGroupedTag } from '../GroupedTag';

let tag;
let groupedTag;

beforeEach(() => {
  tag = new VirtualTag();
  groupedTag = makeGroupedTag(tag);
});

it('inserts and retrieves rules by groups correctly', () => {
  groupedTag.insertRules(2, [
    '.g2-a {}',
    '.g2-b {}'
  ]);

  // Insert out of order into the right group
  groupedTag.insertRules(1, [
    '.g1-a {}',
    '.g1-b {}'
  ]);

  groupedTag.insertRules(2, [
    '.g2-c {}',
    '.g2-d {}'
  ]);

  expect(groupedTag.length).toBeGreaterThan(2);
  expect(tag.length).toBe(6);

  // Expect groups to contain inserted rules
  expect(groupedTag.getGroup(0)).toBe('');
  expect(groupedTag.getGroup(1)).toBe('.g1-a {}/*!sc*/\n.g1-b {}/*!sc*/\n');
  expect(groupedTag.getGroup(2)).toBe(
    '.g2-a {}/*!sc*/\n.g2-b {}/*!sc*/\n' +
    '.g2-c {}/*!sc*/\n.g2-d {}/*!sc*/\n'
  );

  // Check some rules in the tag as well
  expect(tag.getRule(3)).toBe('.g2-b {}');
  expect(tag.getRule(0)).toBe('.g1-a {}');

  // And the indices for sizes: [0, 2, 4, 0, ...]
  expect(groupedTag.indexOfGroup(0)).toBe(0);
  expect(groupedTag.indexOfGroup(1)).toBe(0);
  expect(groupedTag.indexOfGroup(2)).toBe(2);
  expect(groupedTag.indexOfGroup(3)).toBe(6);
  expect(groupedTag.indexOfGroup(4)).toBe(6);
});

it('inserts rules at correct indices if some rules are dropped', () => {
  const tag = new VirtualTag();
  const insertRule = jest.spyOn(tag, 'insertRule').mockImplementationOnce(() => false);
  const groupedTag = makeGroupedTag(tag);

  groupedTag.insertRules(1, [
    '.skipped {}',
    '.inserted {}'
  ]);

  expect(tag.length).toBe(1);
  expect(groupedTag.getGroup(1)).toBe('.inserted {}/*!sc*/\n');
});

it('inserts and deletes groups correctly', () => {
  groupedTag.insertRules(1, ['.g1-a {}']);
  expect(tag.length).toBe(1);
  expect(groupedTag.getGroup(1)).not.toBe('');
  groupedTag.clearGroup(1);
  expect(tag.length).toBe(0);
  expect(groupedTag.getGroup(1)).toBe('');

  // Noop test for non-existent group
  groupedTag.clearGroup(0);
  expect(tag.length).toBe(0);
});

it('does supports large group numbers', () => {
  const baseSize = groupedTag.length;
  const group = 1 << 10;
  groupedTag.insertRules(group, ['.test {}']);

  // We expect the internal buffer to have grown beyond its initial size
  expect(groupedTag.length).toBeGreaterThan(baseSize);

  expect(groupedTag.length).toBeGreaterThan(group);
  expect(tag.length).toBe(1);
  expect(groupedTag.indexOfGroup(group)).toBe(0);
  expect(groupedTag.getGroup(group)).toBe('.test {}/*!sc*/\n');
});

it('throws when the upper group limit is reached', () => {
  const group = Math.pow(2, 31) + 1; // This can't be converted to an SMI to prevent cutoff

  expect(() => {
    groupedTag.insertRules(group, ['.test {}']);
  }).toThrowError(/reached the limit/i);
});
