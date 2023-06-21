import { C } from 'ts-toolbelt';
import { CSSOMTag, TextTag, VirtualTag } from '../Tag';
import { Tag } from '../types';

const describeTag = (TagClass: C.Class<[], Tag>) => {
  it('inserts and retrieves rules at indices', () => {
    const tag = new TagClass();
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
    const tag = new TagClass();
    expect(tag.insertRule(0, '.b {}')).toBe(true);
    expect(tag.length).toBe(1);
    tag.deleteRule(0);
    expect(tag.length).toBe(0);
    expect(tag.getRule(0)).toBe('');
  });
};

describe('CSSOMTag', () => {
  describeTag(CSSOMTag);

  it('contains an empty TextNode to prevent an Edge quirk', () => {
    const tag = new CSSOMTag();
    const { childNodes } = tag.element;
    expect(childNodes.length).toBe(1);
    expect(childNodes[0].nodeName).toBe('#text');
  });
});

describe('TextTag', () => {
  describeTag(TextTag);
});

describe('VirtualTag', () => {
  describeTag(VirtualTag);
});
