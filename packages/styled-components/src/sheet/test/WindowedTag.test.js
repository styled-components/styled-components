// @flow

import { VirtualTag } from '../Tag';
import { WindowedTag } from '../WindowedTag';
import { DefaultGroupedTag } from '../GroupedTag';

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

  it('deletes rules that have been inserted one window at a time', () => {
    const virtualTag = new VirtualTag();
    const windowedTag1 = new WindowedTag(virtualTag);
    const windowedTag2 = new WindowedTag(virtualTag);
    expect(windowedTag1.insertRule(0, '.b {}')).toBe(true);
    expect(windowedTag1.length).toBe(1);
    expect(virtualTag.length).toBe(1);
    expect(windowedTag2.insertRule(0, '.b-second {}')).toBe(true);
    expect(windowedTag2.length).toBe(1);
    expect(virtualTag.length).toBe(2);
    windowedTag1.deleteRule(0);
    expect(virtualTag.length).toBe(1);
    expect(virtualTag.getRule(0)).toBe('.b-second {}');
    windowedTag2.deleteRule(0);
    expect(virtualTag.length).toBe(0);
    expect(virtualTag.getRule(0)).toBe('');
  });

  it('handles interleaving additions and deletes', () => {
    const virtualTag = new VirtualTag();
    const windowedTag1 = new WindowedTag(virtualTag);
    const windowedTag2 = new WindowedTag(virtualTag);
    expect(windowedTag1.insertRule(0, '.b {}')).toBe(true);
    expect(windowedTag2.insertRule(0, '.b-second {}')).toBe(true);
    expect(windowedTag1.insertRule(0, '.a {}')).toBe(true);
    expect(windowedTag1.length).toBe(2);
    expect(windowedTag2.length).toBe(1);
    // Check some rules in the tag
    expect(virtualTag.getRule(2)).toBe('.b-second {}');
    expect(virtualTag.length).toBe(3);

    // Delete the second rule added to the first window
    windowedTag1.deleteRule(1); // This should delete the '.b' rule since '.a' was put in before it
    expect(windowedTag1.length).toBe(1);
    expect(windowedTag1.getRule(0)).toBe('.a {}');
    expect(windowedTag2.length).toBe(1);
    expect(windowedTag2.getRule(0)).toBe('.b-second {}');

    // Delete the first rule added to the first window
    windowedTag1.deleteRule(0);
    expect(windowedTag1.length).toBe(0);
    //We still bleed, and that should be okay
    expect(windowedTag1.getRule(0)).toBe('.b-second {}');
    expect(windowedTag2.length).toBe(1);
    expect(windowedTag2.getRule(0)).toBe('.b-second {}');

    // Add some more rules to the two tags
    expect(windowedTag2.insertRule(0, '.a-second {}')).toBe(true);
    // Note that this is inserted at 0 instead of 2 like the earlier test since we deleted rules
    // If you inserted at a number greater than offset + length you'd have the windows intermingling rules
    expect(windowedTag1.insertRule(0, '.c {}')).toBe(true);
    expect(windowedTag2.insertRule(2, '.c-second {}')).toBe(true);

    expect(windowedTag1.getRule(0)).toBe('.c {}');
    expect(windowedTag1.length).toBe(1);

    expect(windowedTag2.getRule(0)).toBe('.a-second {}');
    expect(windowedTag2.getRule(1)).toBe('.b-second {}');
    expect(windowedTag2.getRule(2)).toBe('.c-second {}');
    expect(windowedTag2.getRule(3)).toBe('');
    expect(windowedTag2.length).toBe(3);

    // Check some rules in the tag
    expect(virtualTag.getRule(2)).toBe('.b-second {}');
    expect(virtualTag.getRule(5)).toBe('');
    expect(virtualTag.length).toBe(4);

    // Delete the middle '.b-second' rule
    windowedTag2.deleteRule(1);
    // Validate the virtualTag and both windowedTags look right
    expect(virtualTag.length).toBe(3);
    expect(virtualTag.getRule(0)).toBe('.c {}');
    expect(virtualTag.getRule(1)).toBe('.a-second {}');
    expect(virtualTag.getRule(2)).toBe('.c-second {}');
    expect(virtualTag.getRule(3)).toBe('');
    expect(windowedTag1.getRule(0)).toBe('.c {}');
    expect(windowedTag1.length).toBe(1);
    expect(windowedTag2.getRule(0)).toBe('.a-second {}');
    expect(windowedTag2.getRule(1)).toBe('.c-second {}');
    expect(windowedTag2.length).toBe(2);
  });
});
