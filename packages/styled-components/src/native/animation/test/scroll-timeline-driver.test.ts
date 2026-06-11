/**
 * Driver selection for scroll progress nodes. Native-driver-eligible
 * animations (opacity / transform keyframes) build their progress
 * interpolation off the entry's UI-thread offset pair so they keep pace
 * with the finger; everything else (width, colors) stays on the JS pair,
 * which a native tag would otherwise poison ("Style property 'width' is
 * not supported by native animated module"). The publisher's JS scroll
 * handler echoes offsets into both pairs, keeping the native pair's
 * JS-side shadow readable before attachment and in test renderers.
 */
import { Animated } from 'react-native';
import {
  axisOffsetNode,
  buildScrollProgressNode,
  createScrollTimelineEntry,
  resolveNativeViewTag,
} from '../../scrollTimeline';
import type { AnimationDescriptor } from '../types';

function scrollDescriptor(): AnimationDescriptor {
  return {
    name: 'grow',
    durationMs: 0,
    timingFunction: { kind: 'keyword', name: 'linear' },
    delayMs: 0,
    iterationCount: 1,
    direction: 'normal',
    fillMode: 'both',
    playState: 'running',
    composition: 'replace',
    rangeStart: 'normal',
    rangeEnd: 'normal',
    timeline: { kind: 'scroll', scroller: 'nearest', axis: 'block' },
  } as AnimationDescriptor;
}

function rootOf(node: any): any {
  let n = node;
  while (n && n._parent) n = n._parent;
  return n;
}

it('creates a distinct UI-thread offset pair on native hosts', () => {
  const entry = createScrollTimelineEntry('block')!;
  expect(entry.nativeDriven).toBe(true);
  expect(entry.offsetYNative).not.toBe(entry.offsetY);
  expect(entry.offsetXNative).not.toBe(entry.offsetX);
});

it('axisOffsetNode picks the pair by driver preference', () => {
  const entry = createScrollTimelineEntry('block')!;
  expect(axisOffsetNode(entry, 'block')).toBe(entry.offsetY);
  expect(axisOffsetNode(entry, 'block', true)).toBe(entry.offsetYNative);
  expect(axisOffsetNode(entry, 'x', true)).toBe(entry.offsetXNative);
});

it('native-eligible progress nodes root at the UI-thread pair', () => {
  const entry = createScrollTimelineEntry('block')!;
  entry.extentY = 400;
  const node = buildScrollProgressNode(scrollDescriptor(), entry, 'block', null, true);
  expect(rootOf(node)).toBe(entry.offsetYNative);
});

it('JS-driver progress nodes root at the JS pair', () => {
  const entry = createScrollTimelineEntry('block')!;
  entry.extentY = 400;
  const node = buildScrollProgressNode(scrollDescriptor(), entry, 'block', null, false);
  expect(rootOf(node)).toBe(entry.offsetY);
});

describe('resolveNativeViewTag', () => {
  // Fabric public instances (ReactNativeElement) carry the tag directly;
  // RN's own attachNativeEvent path reads it the same way. The cached RN
  // surface in `getRN()` has no `findNodeHandle`, so the direct read is
  // the only resolution that works on-device.
  it('reads __nativeTag off a Fabric public instance', () => {
    expect(resolveNativeViewTag({ __nativeTag: 4856 }, null)).toBe(4856);
  });

  it('reads _nativeTag off a Paper host instance', () => {
    expect(resolveNativeViewTag({ _nativeTag: 77 }, null)).toBe(77);
  });

  it('falls back to findNodeHandle when no tag field is present', () => {
    const find = (n: any) => (n.marker === true ? 9 : null);
    expect(resolveNativeViewTag({ marker: true }, find)).toBe(9);
  });

  it('returns null for untagged nodes without a resolver (test renderers)', () => {
    expect(resolveNativeViewTag({}, null)).toBeNull();
    expect(resolveNativeViewTag({ __nativeTag: 'not-a-number' }, null)).toBeNull();
  });
});

it('the native pair shadow tracks setValue (echo path observability)', () => {
  const entry = createScrollTimelineEntry('block')!;
  entry.extentY = 400;
  const node = buildScrollProgressNode(scrollDescriptor(), entry, 'block', null, true);
  (entry.offsetYNative as Animated.Value).setValue(200);
  expect((node as any).__getValue()).toBeCloseTo(0.5, 5);
});
