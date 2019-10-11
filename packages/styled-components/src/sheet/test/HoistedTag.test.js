// @flow

import { VirtualTag } from '../Tag';
import { DefaultHoistedTag } from '../HoistedTag';

describe('DefaultHoistedTag', () => {
  let hoistingTag, tag;
  beforeEach(() => {
    tag = new VirtualTag();
    hoistingTag = new DefaultHoistedTag(tag);
  });
  // Start GroupedTag tests for when there's no hoisted rules
  it('inserts and retrieves normal rules by groups correctly', () => {
    hoistingTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);

    // Insert out of order into the right group
    hoistingTag.insertRules(1, ['.g1-a {}', '.g1-b {}']);

    hoistingTag.insertRules(2, ['.g2-c {}', '.g2-d {}']);

    expect(hoistingTag.groups).toBeGreaterThan(2);
    expect(tag.length).toBe(6);

    // Expect groups to contain inserted rules
    expect(hoistingTag.getHoistedAndNormalGroups(0)).toEqual({ hoisted: '', normal: '' });
    expect(hoistingTag.getHoistedAndNormalGroups(1)).toEqual({
      hoisted: '',
      normal: '.g1-a {}\n.g1-b {}\n',
    });
    expect(hoistingTag.getHoistedAndNormalGroups(2)).toEqual({
      hoisted: '',
      normal: '.g2-a {}\n.g2-b {}\n' + '.g2-c {}\n.g2-d {}\n',
    });

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

  it('inserts and deletes groups with normal rules correctly', () => {
    hoistingTag.insertRules(1, ['.g1-a {}']);
    expect(tag.length).toBe(1);
    expect(hoistingTag.getHoistedAndNormalGroups(1).normal).not.toBe('');
    hoistingTag.clearGroup(1);
    expect(tag.length).toBe(0);
    expect(hoistingTag.getHoistedAndNormalGroups(1).normal).toBe('');

    // Noop test for non-existent group
    hoistingTag.clearGroup(0);
    expect(tag.length).toBe(0);
  });

  it('supports large group numbers', () => {
    const baseSize = hoistingTag.groups;
    const group = 1 << 10;
    hoistingTag.insertRules(group, ['.test {}']);

    // We expect the internal buffer to have grown beyond its initial size
    expect(hoistingTag.groups).toBeGreaterThan(baseSize);

    expect(hoistingTag.groups).toBeGreaterThan(group);
    expect(tag.length).toBe(1);
    expect(hoistingTag.normalTag.indexOfGroup(group)).toBe(0);
    expect(hoistingTag.getHoistedAndNormalGroups(group).normal).toBe('.test {}\n');
  });

  // End GroupedTag tests, Start tests for hoisting @import rules
  it('should hoist @import rules to be first in a group', () => {
    // Insert some normal style rules
    hoistingTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);

    // Insert an @import and an @font-face rule to the same group
    hoistingTag.insertRules(2, [
      '@import url("");',
      '@font-face { font-family: "test", src: url("")}',
    ]);

    expect(hoistingTag.groups).toBeGreaterThan(2);
    expect(tag.length).toBe(4);

    // Expect groups to contain inserted rules
    expect(hoistingTag.getHoistedAndNormalGroups(0)).toEqual({ hoisted: '', normal: '' });
    expect(hoistingTag.getHoistedAndNormalGroups(1)).toEqual({ hoisted: '', normal: '' });
    expect(hoistingTag.getHoistedAndNormalGroups(2)).toEqual({
      hoisted: '@import url("");\n',
      normal: '.g2-a {}\n.g2-b {}\n@font-face { font-family: "test", src: url("")}\n',
    });

    // Check some rules in the tag as well
    expect(tag.getRule(2)).toBe('.g2-b {}');
    expect(tag.getRule(0)).toBe('@import url("");');

    // We added 3 rules to group 2, so check the indicies
    expect(hoistingTag.normalTag.indexOfGroup(0)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(1)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(2)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(3)).toBe(3);

    // Check to make sure the hoistedTag has the @import rules
    expect(hoistingTag.hoistedTag.getGroup(0)).toBe('');
    expect(hoistingTag.hoistedTag.getGroup(2)).toBe('@import url("");\n');
    expect(hoistingTag.hoistedTag.groups).toBeGreaterThan(2);
  });

  it('should hoist @import rules when interleaved in multiple groups', () => {
    // Insert some normal style rules
    hoistingTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);
    hoistingTag.insertRules(1, ['.g1-a {}', '.g1-b {}']);
    hoistingTag.insertRules(0, ['.g0-a {}', '.g0-b {}']);

    // Insert an @import and an @font-face rule to the each group, only the @import needs hoisting
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

    expect(hoistingTag.normalTag.tag.length).toBe(9); // Check the normal window
    expect(hoistingTag.hoistedTag.tag.length).toBe(3); // Check the hoisted window
    expect(tag.length).toBe(12);

    // Expect groups to contain inserted hoisted & normal rules
    expect(hoistingTag.getHoistedAndNormalGroups(0)).toEqual({
      hoisted: '@import url("0");\n',
      normal: '.g0-a {}\n.g0-b {}\n@font-face { font-family: "test", src: url("0")}\n',
    });
    expect(hoistingTag.getHoistedAndNormalGroups(1)).toEqual({
      hoisted: '@import url("1");\n',
      normal: '.g1-a {}\n.g1-b {}\n@font-face { font-family: "test", src: url("1")}\n',
    });
    expect(hoistingTag.getHoistedAndNormalGroups(2)).toEqual({
      hoisted: '@import url("2");\n',
      normal: '.g2-a {}\n.g2-b {}\n@font-face { font-family: "test", src: url("2")}\n',
    });

    // Expect tag to have hoisted rules in right order then normal rules

    expect(tag.getRule(0)).toBe('@import url("0");');
    expect(tag.getRule(1)).toBe('@import url("1");');
    expect(tag.getRule(2)).toBe('@import url("2");');
    expect(tag.getRule(3)).toBe('.g0-a {}');
    expect(tag.getRule(5)).toBe('@font-face { font-family: "test", src: url("0")}');
    expect(tag.getRule(6)).toBe('.g1-a {}');
    expect(tag.getRule(8)).toBe('@font-face { font-family: "test", src: url("1")}');
    expect(tag.getRule(9)).toBe('.g2-a {}');
    expect(tag.getRule(11)).toBe('@font-face { font-family: "test", src: url("2")}');
    expect(hoistingTag.normalTag.indexOfGroup(0)).toBe(0);
    expect(hoistingTag.normalTag.indexOfGroup(1)).toBe(3);
    expect(hoistingTag.normalTag.indexOfGroup(2)).toBe(6);
    expect(hoistingTag.normalTag.indexOfGroup(3)).toBe(9);

    // Check to make sure the hoistedTag has the @import and @font-face rules
    expect(hoistingTag.hoistedTag.getGroup(0)).toBe('@import url("0");\n');
    expect(hoistingTag.hoistedTag.getGroup(1)).toBe('@import url("1");\n');
    expect(hoistingTag.hoistedTag.getGroup(2)).toBe('@import url("2");\n');
  });
});
