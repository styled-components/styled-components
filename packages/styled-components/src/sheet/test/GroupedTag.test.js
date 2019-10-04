// @flow

import { VirtualTag } from '../Tag';
import { DefaultGroupedTag } from '../GroupedTag';
import { WindowedTag } from '../WindowedTag';

const describeGroupedTag = makeTagAndGroupedTag => {
  let groupedTag, tag;
  beforeEach(() => {
    ({ groupedTag, tag } = makeTagAndGroupedTag());
  });

  it('inserts and retrieves rules by groups correctly', () => {
    groupedTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);

    // Insert out of order into the right group
    groupedTag.insertRules(1, ['.g1-a {}', '.g1-b {}']);

    groupedTag.insertRules(2, ['.g2-c {}', '.g2-d {}']);

    expect(groupedTag.groups).toBeGreaterThan(2);
    expect(tag.length).toBe(6);

    // Expect groups to contain inserted rules
    expect(groupedTag.getGroup(0)).toBe('');
    expect(groupedTag.getGroup(1)).toBe('.g1-a {}\n.g1-b {}\n');
    expect(groupedTag.getGroup(2)).toBe('.g2-a {}\n.g2-b {}\n' + '.g2-c {}\n.g2-d {}\n');

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
    const baseSize = groupedTag.groups;
    const group = 1 << 10;
    groupedTag.insertRules(group, ['.test {}']);

    // We expect the internal buffer to have grown beyond its initial size
    expect(groupedTag.groups).toBeGreaterThan(baseSize);

    expect(groupedTag.groups).toBeGreaterThan(group);
    expect(tag.length).toBe(1);
    expect(groupedTag.indexOfGroup(group)).toBe(0);
    expect(groupedTag.getGroup(group)).toBe('.test {}\n');
  });
};

describe('GroupedTag with a VirtualTag', () => {
  describeGroupedTag(() => {
    const tag = new VirtualTag();
    const groupedTag = new DefaultGroupedTag(tag);
    return { tag, groupedTag };
  });
});

describe('GroupedTag with a Windowed VirtualTag', () => {
  describeGroupedTag(() => {
    const tag = new WindowedTag(new VirtualTag());
    const groupedTag = new DefaultGroupedTag(tag);
    return { tag, groupedTag };
  });
});
