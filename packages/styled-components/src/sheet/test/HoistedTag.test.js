// @flow

import { VirtualTag } from '../Tag';
import { DefaultHoistedTag } from '../HoistedTag';

describe('Works like a groupedTag if there are no hoisted rules', () => {
  /* 
  This set of tests is mostly copy/pasted from GroupedTag.test.js,
  but since we need to dig into the normal/hoisted tags
  it didn't make sense to try and reduce the duplication.
   */
  let hoistingTag, tag;
  beforeEach(() => {
    tag = new VirtualTag();
    hoistingTag = new DefaultHoistedTag(tag);
  });
  it('inserts and retrieves rules by groups correctly', () => {
    hoistingTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);

    // Insert out of order into the right group
    hoistingTag.insertRules(1, ['.g1-a {}', '.g1-b {}']);

    hoistingTag.insertRules(2, ['.g2-c {}', '.g2-d {}']);

    expect(hoistingTag.length).toBeGreaterThan(2);
    expect(tag.length).toBe(6);

    // Expect groups to contain inserted rules
    expect(hoistingTag.getGroup(0)).toBe('');
    expect(hoistingTag.getGroup(1)).toBe('.g1-a {}\n.g1-b {}\n');
    expect(hoistingTag.getGroup(2)).toBe('.g2-a {}\n.g2-b {}\n' + '.g2-c {}\n.g2-d {}\n');

    // Check some rules in the tag as well
    expect(tag.getRule(3)).toBe('.g2-b {}');
    expect(tag.getRule(0)).toBe('.g1-a {}');

    // And the indices for sizes: [0, 2, 4, 0, ...]
    expect(hoistingTag.normalTag.indexOfGroup(0)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(1)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(2)).toBe(2);
    expect(hoistingTag.normalTag.indexOfGroup(3)).toBe(6);
    expect(hoistingTag.normalTag.indexOfGroup(4)).toBe(6);

    // Check to make sure the hoistedTag is empty
    expect(hoistingTag.hoistedTag.getGroup(0)).toBe('');
    // Dig to the WindowedTag in order to avoid the array allocated by GroupedTag
    expect(hoistingTag.hoistedTag.tag.length).toBe(0);
  });

  it('inserts and deletes groups correctly', () => {
    hoistingTag.insertRules(1, ['.g1-a {}']);
    expect(tag.length).toBe(1);
    expect(hoistingTag.getGroup(1)).not.toBe('');
    hoistingTag.clearGroup(1);
    expect(tag.length).toBe(0);
    expect(hoistingTag.getGroup(1)).toBe('');

    // Noop test for non-existent group
    hoistingTag.clearGroup(0);
    expect(tag.length).toBe(0);
  });

  it('supports large group numbers', () => {
    const baseSize = hoistingTag.length;
    const group = 1 << 10;
    hoistingTag.insertRules(group, ['.test {}']);

    // We expect the internal buffer to have grown beyond its initial size
    expect(hoistingTag.length).toBeGreaterThan(baseSize);

    expect(hoistingTag.length).toBeGreaterThan(group);
    expect(tag.length).toBe(1);
    expect(hoistingTag.normalTag.indexOfGroup(group)).toBe(0);
    expect(hoistingTag.getGroup(group)).toBe('.test {}\n');
  });
});

describe('Hoisting @import and @font-face rules', () => {
  let hoistingTag, tag;
  beforeEach(() => {
    tag = new VirtualTag();
    hoistingTag = new DefaultHoistedTag(tag);
  });
  it('should hoist @import and @font-face rules to be first in a group', () => {
    // Insert some normal style rules
    hoistingTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);

    // Insert an @import and an @font-face rule to the same group
    hoistingTag.insertRules(2, [
      '@import url("");',
      '@font-face { font-family: "test", src: url("")}',
    ]);

    expect(hoistingTag.length).toBeGreaterThan(2); // Currently the length is just the normalTag length
    expect(tag.length).toBe(4);

    // Expect groups to contain inserted rules
    expect(hoistingTag.getGroup(0)).toBe('');
    expect(hoistingTag.getGroup(1)).toBe('');
    expect(hoistingTag.getGroup(2)).toBe(
      '@import url("");\n@font-face { font-family: "test", src: url("")}\n' + '.g2-a {}\n.g2-b {}\n'
    );

    // Check some rules in the tag as well
    expect(tag.getRule(3)).toBe('.g2-b {}');
    expect(tag.getRule(0)).toBe('@import url("");');

    // We only added 2 rules to group 2, so check the indicies
    expect(hoistingTag.normalTag.indexOfGroup(0)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(1)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(2)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(3)).toBe(2);

    // Check to make sure the hoistedTag has the @import and @font-face rules
    expect(hoistingTag.hoistedTag.getGroup(0)).toBe('');
    expect(hoistingTag.hoistedTag.getGroup(2)).toBe(
      '@import url("");\n@font-face { font-family: "test", src: url("")}\n'
    );
    expect(hoistingTag.hoistedTag.length).toBeGreaterThan(2);
  });
  it('should hoist @import and @font-face rules when interleaved in multiple groups', () => {
    // Insert some normal style rules
    hoistingTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);
    hoistingTag.insertRules(1, ['.g1-a {}', '.g1-b {}']);
    hoistingTag.insertRules(0, ['.g0-a {}', '.g0-b {}']);

    // Insert an @import and an @font-face rule to the each group
    hoistingTag.insertRules(2, [
      '@import url("2");',
      '@font-face { font-family: "test", src: url("2")}',
    ]);
    hoistingTag.insertRules(1, [
      '@import url("1");',
      '@font-face { font-family: "test", src: url("1")}',
    ]);
    hoistingTag.insertRules(0, [
      '@import url("0");',
      '@font-face { font-family: "test", src: url("0")}',
    ]);

    expect(hoistingTag.normalTag.tag.length).toBe(6);
    expect(hoistingTag.hoistedTag.tag.length).toBe(6);
    expect(tag.length).toBe(12);

    // Expect groups to contain inserted hoisted & normal rules
    expect(hoistingTag.getGroup(0)).toBe(
      '@import url("0");\n@font-face { font-family: "test", src: url("0")}\n' +
        '.g0-a {}\n.g0-b {}\n'
    );
    expect(hoistingTag.getGroup(1)).toBe(
      '@import url("1");\n@font-face { font-family: "test", src: url("1")}\n' +
        '.g1-a {}\n.g1-b {}\n'
    );
    expect(hoistingTag.getGroup(2)).toBe(
      '@import url("2");\n@font-face { font-family: "test", src: url("2")}\n' +
        '.g2-a {}\n.g2-b {}\n'
    );

    // Expect tag to have hoisted rules in right order then normal rules

    expect(tag.getRule(0)).toBe('@import url("0");');
    expect(tag.getRule(1)).toBe('@font-face { font-family: "test", src: url("0")}');
    expect(tag.getRule(2)).toBe('@import url("1");');
    expect(tag.getRule(3)).toBe('@font-face { font-family: "test", src: url("1")}');
    expect(tag.getRule(4)).toBe('@import url("2");');
    expect(tag.getRule(5)).toBe('@font-face { font-family: "test", src: url("2")}');
    expect(tag.getRule(6)).toBe('.g0-a {}');
    expect(tag.getRule(8)).toBe('.g1-a {}');
    expect(tag.getRule(10)).toBe('.g2-a {}');

    expect(hoistingTag.normalTag.indexOfGroup(0)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(1)).toBe(2);
    expect(hoistingTag.normalTag.indexOfGroup(2)).toBe(4);
    expect(hoistingTag.normalTag.indexOfGroup(3)).toBe(6);

    // Check to make sure the hoistedTag has the @import and @font-face rules
    expect(hoistingTag.hoistedTag.getGroup(0)).toBe(
      '@import url("0");\n@font-face { font-family: "test", src: url("0")}\n'
    );
    expect(hoistingTag.hoistedTag.getGroup(2)).toBe(
      '@import url("2");\n@font-face { font-family: "test", src: url("2")}\n'
    );
  });
});
