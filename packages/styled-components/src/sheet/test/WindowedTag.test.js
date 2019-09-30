// @flow

import { VirtualTag } from '../Tag';
import { WindowedTag } from '../WindowedTag';
import { DefaultGroupedTag } from '../GroupedTag';

describe('WindowedTag acts like a tag', () => {
  let virtualTag;
  let tag;
  beforeEach(() => {
    virtualTag = new VirtualTag();
    tag = new WindowedTag(virtualTag);
  });

  /*
   * Copy/Pasted from Tag.test.js since it requires different setup than the tags tested there
   */
  it('inserts and retrieves rules at indices', () => {
    expect(tag.insertRule(0, '.b {}')).toBe(true);
    expect(tag.insertRule(0, '.a {}')).toBe(true);
    expect(tag.insertRule(2, '.c {}')).toBe(true);
    expect(tag.insertRule(99, '.x {}')).toBe(false);
    expect(tag.getRule(0)).toBe('.a {}');
    expect(tag.getRule(1)).toBe('.b {}');
    expect(tag.getRule(2)).toBe('.c {}');
    expect(tag.getRule(3)).toBe('');
    expect(tag.length).toBe(3);
  });

  it('deletes rules that have been inserted', () => {
    expect(tag.insertRule(0, '.b {}')).toBe(true);
    expect(tag.length).toBe(1);
    tag.deleteRule(0);
    expect(tag.length).toBe(0);
    expect(tag.getRule(0)).toBe('');
  });
});

describe('WindowedTag used in a GroupedTag', () => {
  /*
   * Tests copied from GroupedTag.test.js to allow for using a WindowedTag
   */
  let tag;
  let groupedTag;
  beforeEach(() => {
    tag = new WindowedTag(new VirtualTag());
    groupedTag = new DefaultGroupedTag(tag);
  });

  it('inserts and retrieves rules by groups correctly', () => {
    groupedTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);

    // Insert out of order into the right group
    groupedTag.insertRules(1, ['.g1-a {}', '.g1-b {}']);

    groupedTag.insertRules(2, ['.g2-c {}', '.g2-d {}']);

    expect(groupedTag.length).toBeGreaterThan(2);
    expect(tag.length).toBe(6);

    // Expect groups to contain inserted rules
    expect(groupedTag.getGroup(0)).toBe('');
    expect(groupedTag.getGroup(1)).toBe('.g1-a {}\n.g1-b {}\n');
    expect(groupedTag.getGroup(2)).toBe('.g2-a {}\n.g2-b {}\n.g2-c {}\n.g2-d {}\n');

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
    const baseSize = groupedTag.length;
    const group = 1 << 10;
    groupedTag.insertRules(group, ['.test {}']);

    // We expect the internal buffer to have grown beyond its initial size
    expect(groupedTag.length).toBeGreaterThan(baseSize);

    expect(groupedTag.length).toBeGreaterThan(group);
    expect(tag.length).toBe(1);
    expect(groupedTag.indexOfGroup(group)).toBe(0);
    expect(groupedTag.getGroup(group)).toBe('.test {}\n');
  });
});

describe('WindowedTag uses a sliding window', () => {
  beforeEach(() => {});

  it('Correctly builds the linked list', () => {
    const virtualTag = new VirtualTag();
    const windowedTag1 = new WindowedTag(virtualTag);

    expect(windowedTag1.prev).toBe(undefined);
    expect(virtualTag.window).toBe(windowedTag1);
    const windowedTag2 = new WindowedTag(virtualTag);
    expect(windowedTag2.prev).toBe(windowedTag1);
    expect(virtualTag.window).toBe(windowedTag2);
  });

  it('Inserts rules one window at a time', () => {
    const virtualTag = new VirtualTag();
    const windowedTag1 = new WindowedTag(virtualTag);
    const windowedTag2 = new WindowedTag(virtualTag);

    // Insertions into the windowedTag1
    expect(windowedTag1.insertRule(0, '.b {}')).toBe(true);
    expect(windowedTag1.insertRule(0, '.a {}')).toBe(true);
    expect(windowedTag1.insertRule(2, '.c {}')).toBe(true);
    expect(windowedTag1.getRule(0)).toBe('.a {}');
    expect(windowedTag1.getRule(1)).toBe('.b {}');
    expect(windowedTag1.getRule(2)).toBe('.c {}');
    expect(windowedTag1.getRule(3)).toBe('');
    expect(windowedTag1.length).toBe(3);

    // Check some rules in the tag
    expect(virtualTag.getRule(2)).toBe('.c {}');
    expect(virtualTag.length).toBe(3);

    // Insertions into the windowedTag2
    expect(windowedTag2.insertRule(0, '.b-second {}')).toBe(true);
    expect(windowedTag2.insertRule(0, '.a-second {}')).toBe(true);
    expect(windowedTag2.insertRule(2, '.c-second {}')).toBe(true);
    expect(windowedTag2.getRule(0)).toBe('.a-second {}');
    expect(windowedTag2.getRule(1)).toBe('.b-second {}');
    expect(windowedTag2.getRule(2)).toBe('.c-second {}');
    expect(windowedTag2.getRule(3)).toBe('');
    expect(windowedTag2.length).toBe(3);

    // Check some rules in the tag
    expect(virtualTag.getRule(2)).toBe('.c {}');
    expect(virtualTag.getRule(5)).toBe('.c-second {}');
    expect(virtualTag.length).toBe(6);
  });

  it('Can interleave rule insertions between two windows', () => {
    const virtualTag = new VirtualTag();
    const windowedTag1 = new WindowedTag(virtualTag);
    const windowedTag2 = new WindowedTag(virtualTag);

    expect(windowedTag1.insertRule(0, '.b {}')).toBe(true);
    expect(windowedTag2.insertRule(0, '.b-second {}')).toBe(true);
    expect(windowedTag1.insertRule(0, '.a {}')).toBe(true);

    // Check some rules in the tag
    expect(virtualTag.getRule(2)).toBe('.b-second {}');
    expect(virtualTag.length).toBe(3);

    expect(windowedTag2.insertRule(0, '.a-second {}')).toBe(true);
    expect(windowedTag1.insertRule(2, '.c {}')).toBe(true);
    expect(windowedTag2.insertRule(2, '.c-second {}')).toBe(true);

    expect(windowedTag1.getRule(0)).toBe('.a {}');
    expect(windowedTag1.getRule(1)).toBe('.b {}');
    expect(windowedTag1.getRule(2)).toBe('.c {}');
    expect(windowedTag1.length).toBe(3);

    // The current implementation allows windows to "bleed" if you request an offset that lands in another window
    expect(windowedTag1.getRule(3)).toBe('.a-second {}');

    // Insertions into the windowedTag2
    expect(windowedTag2.getRule(0)).toBe('.a-second {}');
    expect(windowedTag2.getRule(1)).toBe('.b-second {}');
    expect(windowedTag2.getRule(2)).toBe('.c-second {}');
    expect(windowedTag2.getRule(3)).toBe('');
    expect(windowedTag2.length).toBe(3);

    // Check some rules in the tag
    expect(virtualTag.getRule(2)).toBe('.c {}');
    expect(virtualTag.getRule(5)).toBe('.c-second {}');
    expect(virtualTag.length).toBe(6);
  });
});
