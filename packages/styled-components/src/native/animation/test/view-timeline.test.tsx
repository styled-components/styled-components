/**
 * View progress timelines, node-level matrix + render integration.
 *
 * CSS Scroll-driven Animations L1 (drafts.csswg.org/scroll-animations-1/,
 * fetched 2026-06-10). Normative anchors quoted above each block.
 *
 * Native deviations (documented):
 * - The subject's offset within the scroller comes from its onLayout
 *   coordinates, which are parent-relative. The polyfill therefore
 *   supports view() on DIRECT children of the styled scroll container
 *   (the same direct-children subset as position: sticky, grid items,
 *   and anchors). Nested subjects keep an inactive timeline.
 * - view-timeline-inset adjustments are not implemented; a non-default
 *   inset warns once and the visibility range stays the scrollport.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated } from 'react-native';
import styled from '../../';
import { resetResponsiveCache } from '../../responsive';
import { resetNativeStyleCache } from '../../../models/compileNative';
import { resetWarningsForTest } from '../../transform/dev';
import {
  buildScrollProgressNode,
  createScrollTimelineEntry,
  type ScrollTimelineEntry,
} from '../../scrollTimeline';
import type { AnimationDescriptor, RangeBoundary } from '../types';
import '../'; // default adapter side-effect registration

function viewDescriptor(over: Partial<AnimationDescriptor> = {}): AnimationDescriptor {
  return {
    name: 'reveal',
    durationMs: 0,
    timingFunction: { kind: 'keyword', name: 'linear' } as any,
    delayMs: 0,
    iterationCount: 1,
    direction: 'normal',
    fillMode: 'both',
    playState: 'running',
    composition: 'replace',
    rangeStart: 'normal',
    rangeEnd: 'normal',
    timeline: { kind: 'view', axis: 'block', inset: null },
    ...over,
  } as AnimationDescriptor;
}

function namedBoundary(rangeName: string, value: number): RangeBoundary {
  return { rangeName: rangeName as any, value, unit: '%', calcRaw: null };
}

/**
 * Entry with a 500dp viewport and 1500dp of scrollable overflow; the
 * subject sits at content offset 600 and is 100dp tall. Cover range in
 * scroll offsets: [100, 700] (length 600).
 */
function makeEntry(): ScrollTimelineEntry {
  const entry = createScrollTimelineEntry('block')!;
  entry.extentY = 1500;
  entry.viewportH = 500;
  return entry;
}

const SUBJECT = { x: 0, y: 600, width: 300, height: 100 };

function progressAt(
  entry: ScrollTimelineEntry,
  desc: AnimationDescriptor,
  offset: number,
  subject = SUBJECT
): number | null {
  const node = buildScrollProgressNode(desc, entry, 'block', subject);
  if (node === null) return null;
  (entry.offsetY as Animated.Value).setValue(offset);
  return (node as any).__getValue();
}

let renderers: TestRenderer.ReactTestRenderer[] = [];
function track(r: TestRenderer.ReactTestRenderer) {
  renderers.push(r);
  return r;
}

beforeEach(() => {
  resetResponsiveCache();
  resetNativeStyleCache();
  resetWarningsForTest();
});

afterEach(() => {
  for (const r of renderers) {
    try {
      act(() => r.unmount());
    } catch {}
  }
  renderers = [];
});

describe('view progress timeline ranges (Scroll-driven Animations L1 §3)', () => {
  // §3.2: "Progress (the current time) in a view progress timeline is
  // calculated as: distance / range where: distance is the current scroll
  // offset minus the scroll offset corresponding to the start of the
  // cover range; range is the scroll offset corresponding to the start of
  // the cover range minus the scroll offset corresponding to the end of
  // the cover range."
  it('default range is cover: 0 at subject entering, 1 at subject exited', () => {
    const entry = makeEntry();
    const desc = viewDescriptor();
    expect(progressAt(entry, desc, 100)).toBe(0);
    expect(progressAt(entry, desc, 400)).toBeCloseTo(0.5);
    expect(progressAt(entry, desc, 700)).toBe(1);
  });

  it('progress clamps outside the cover range', () => {
    const entry = makeEntry();
    const desc = viewDescriptor();
    expect(progressAt(entry, desc, 0)).toBe(0);
    expect(progressAt(entry, desc, 1200)).toBe(1);
  });

  // §3.1 cover: "0% progress represents the latest position at which the
  // start border edge of the element's principal box coincides with the
  // end edge of its view progress visibility range. 100% progress
  // represents the earliest position at which the end border edge of the
  // element's principal box coincides with the start edge of its view
  // progress visibility range."
  it('explicit cover range matches the default', () => {
    const entry = makeEntry();
    const desc = viewDescriptor({
      rangeStart: namedBoundary('cover', 0),
      rangeEnd: namedBoundary('cover', 100),
    });
    expect(progressAt(entry, desc, 400)).toBeCloseTo(0.5);
  });

  // §3.1 entry: "0% is equivalent to 0% of the cover range. 100% is
  // equivalent to 0% of the contain range." With subject (100) smaller
  // than viewport (500), contain starts at offset 200, so entry = [100, 200].
  it('entry range spans the subject crossing the end edge into full view', () => {
    const entry = makeEntry();
    const desc = viewDescriptor({
      rangeStart: namedBoundary('entry', 0),
      rangeEnd: namedBoundary('entry', 100),
    });
    expect(progressAt(entry, desc, 100)).toBe(0);
    expect(progressAt(entry, desc, 150)).toBeCloseTo(0.5);
    expect(progressAt(entry, desc, 200)).toBe(1);
    expect(progressAt(entry, desc, 400)).toBe(1);
  });

  // §3.1 exit: "0% is equivalent to 100% of the contain range. 100% is
  // equivalent to 100% of the cover range." contain ends at offset 600,
  // so exit = [600, 700].
  it('exit range spans the subject leaving across the start edge', () => {
    const entry = makeEntry();
    const desc = viewDescriptor({
      rangeStart: namedBoundary('exit', 0),
      rangeEnd: namedBoundary('exit', 100),
    });
    expect(progressAt(entry, desc, 400)).toBe(0);
    expect(progressAt(entry, desc, 600)).toBe(0);
    expect(progressAt(entry, desc, 650)).toBeCloseTo(0.5);
    expect(progressAt(entry, desc, 700)).toBe(1);
  });

  // §3.1 contain: "Represents the range during which the principal box is
  // either fully contained by, or fully covers, its view progress
  // visibility range within the scrollport." For this geometry: [200, 600].
  it('contain range spans full visibility', () => {
    const entry = makeEntry();
    const desc = viewDescriptor({
      rangeStart: namedBoundary('contain', 0),
      rangeEnd: namedBoundary('contain', 100),
    });
    expect(progressAt(entry, desc, 200)).toBe(0);
    expect(progressAt(entry, desc, 400)).toBeCloseTo(0.5);
    expect(progressAt(entry, desc, 600)).toBe(1);
  });

  // §3.1 contain with a subject TALLER than the scrollport: the
  // "fully covers" alternative. Subject 800 tall at offset 600:
  // coincidence offsets are 600 (start edges) and 900 (end edges);
  // contain = [600, 900].
  it('contain handles a subject taller than the scrollport (fully covers)', () => {
    const entry = makeEntry();
    const tall = { x: 0, y: 600, width: 300, height: 800 };
    const desc = viewDescriptor({
      rangeStart: namedBoundary('contain', 0),
      rangeEnd: namedBoundary('contain', 100),
    });
    expect(progressAt(entry, desc, 600, tall)).toBe(0);
    expect(progressAt(entry, desc, 750, tall)).toBeCloseTo(0.5);
    expect(progressAt(entry, desc, 900, tall)).toBe(1);
  });

  // §3.1 entry-crossing: "0% ... start border edge ... coincides with the
  // end edge ... 100% ... end border edge ... coincides with the end
  // edge." = [100, 200] for this geometry.
  it('entry-crossing spans the subject crossing the end border edge', () => {
    const entry = makeEntry();
    const desc = viewDescriptor({
      rangeStart: namedBoundary('entry-crossing', 0),
      rangeEnd: namedBoundary('entry-crossing', 100),
    });
    expect(progressAt(entry, desc, 150)).toBeCloseTo(0.5);
  });

  // §3.1 exit-crossing: "0% ... start border edge ... coincides with the
  // start edge ... 100% ... end border edge ... coincides with the start
  // edge." = [600, 700] for this geometry.
  it('exit-crossing spans the subject crossing the start border edge', () => {
    const entry = makeEntry();
    const desc = viewDescriptor({
      rangeStart: namedBoundary('exit-crossing', 0),
      rangeEnd: namedBoundary('exit-crossing', 100),
    });
    expect(progressAt(entry, desc, 650)).toBeCloseTo(0.5);
  });

  // §3.1 scroll: "Represents the full range of the scroll container on
  // which the view progress timeline is defined." = offsets [0, 1500].
  it('scroll range maps the full scroll container range', () => {
    const entry = makeEntry();
    const desc = viewDescriptor({
      rangeStart: namedBoundary('scroll', 0),
      rangeEnd: namedBoundary('scroll', 100),
    });
    expect(progressAt(entry, desc, 0)).toBe(0);
    expect(progressAt(entry, desc, 750)).toBeCloseTo(0.5);
    expect(progressAt(entry, desc, 1500)).toBe(1);
  });

  // Mixed boundaries compose: entry 50% -> exit 50% = [150, 650].
  it('boundaries from different named ranges compose', () => {
    const entry = makeEntry();
    const desc = viewDescriptor({
      rangeStart: namedBoundary('entry', 50),
      rangeEnd: namedBoundary('exit', 50),
    });
    expect(progressAt(entry, desc, 150)).toBe(0);
    expect(progressAt(entry, desc, 400)).toBeCloseTo(0.5);
    expect(progressAt(entry, desc, 650)).toBe(1);
  });

  it('is inactive before the subject has measured', () => {
    const entry = makeEntry();
    const node = buildScrollProgressNode(viewDescriptor(), entry, 'block', null);
    expect(node).toBeNull();
  });

  it('is inactive before the scroller viewport has measured', () => {
    const entry = createScrollTimelineEntry('block')!;
    entry.extentY = 1500;
    const node = buildScrollProgressNode(viewDescriptor(), entry, 'block', SUBJECT);
    expect(node).toBeNull();
  });

  // view(x): "By default, view() references the block axis; as for
  // scroll(), this can be changed by providing an explicit <axis> value."
  it('view(x) measures along the horizontal axis', () => {
    const entry = createScrollTimelineEntry('block')!;
    entry.extentX = 1500;
    entry.viewportW = 500;
    const subject = { x: 600, y: 0, width: 100, height: 50 };
    const desc = viewDescriptor({ timeline: { kind: 'view', axis: 'x', inset: null } });
    const node = buildScrollProgressNode(desc, entry, 'x', subject);
    expect(node).not.toBeNull();
    (entry.offsetX as Animated.Value).setValue(400);
    expect((node as any).__getValue()).toBeCloseTo(0.5);
  });
});

describe('view progress timelines, render integration (§3.3.1 view() notation)', () => {
  const Scroller = styled.ScrollView.withConfig({ displayName: 'VTScroller' })`
    flex: 1;
  `;

  function scrollEvent(y: number, contentH = 2000, viewportH = 500) {
    return {
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { height: contentH, width: 300 },
        layoutMeasurement: { height: viewportH, width: 300 },
      },
    };
  }

  function layoutEvent(y: number, height: number, x = 0, width = 300) {
    return { nativeEvent: { layout: { x, y, width, height } } };
  }

  function findScroller(tree: TestRenderer.ReactTestRenderer) {
    const nodes = tree.root.findAllByProps({ testID: 'scroller' });
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (typeof nodes[i].props.onScroll === 'function') return nodes[i];
    }
    throw new Error('scroller host with onScroll not found');
  }

  function findSubject(tree: TestRenderer.ReactTestRenderer) {
    const nodes = tree.root.findAllByProps({ testID: 'subject' });
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (typeof nodes[i].props.onLayout === 'function') return nodes[i];
    }
    throw new Error('subject host with onLayout not found');
  }

  function opacityOf(tree: TestRenderer.ReactTestRenderer): number | undefined {
    const nodes = tree.root.findAllByProps({ testID: 'subject' });
    for (let i = nodes.length - 1; i >= 0; i--) {
      const style = nodes[i].props.style;
      const layers = Array.isArray(style) ? style.flat(Infinity) : [style];
      let v: number | undefined;
      for (const layer of layers) {
        if (layer && typeof layer === 'object' && 'opacity' in layer) {
          const o = layer.opacity;
          v =
            typeof o === 'object' && o !== null && typeof o.__getValue === 'function'
              ? o.__getValue()
              : o;
        }
      }
      if (v !== undefined) return v;
    }
    return undefined;
  }

  it('animation-timeline: view() drives keyframes from the subject layout', () => {
    const Subject = styled.View.withConfig({ displayName: 'VTSubject' })`
      height: 100px;
      animation: reveal linear both;
      @keyframes reveal {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: view();
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller testID="scroller">
          <Subject testID="subject" />
        </Scroller>
      )
    );
    // Seed scroller extent/viewport, then the subject's layout.
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(0));
    });
    act(() => {
      findSubject(tree).props.onLayout(layoutEvent(600, 100));
    });
    // Cover range [100, 700]; mid-point at 400.
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(400));
    });
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(400));
    });
    expect(opacityOf(tree)).toBeCloseTo(0.5);
  });

  it('animation-range named ranges apply to view timelines', () => {
    const Subject = styled.View.withConfig({ displayName: 'VTRangeSubject' })`
      height: 100px;
      animation: reveal linear both;
      @keyframes reveal {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: view();
      animation-range: entry;
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller testID="scroller">
          <Subject testID="subject" />
        </Scroller>
      )
    );
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(0));
    });
    act(() => {
      findSubject(tree).props.onLayout(layoutEvent(600, 100));
    });
    // entry = [100, 200]; mid-point 150.
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(150));
    });
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(150));
    });
    expect(opacityOf(tree)).toBeCloseTo(0.5);
    // Past the entry range the animation holds its final frame.
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(400));
    });
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(400));
    });
    expect(opacityOf(tree)).toBe(1);
  });

  it('a non-default view-timeline inset warns once and is ignored', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const Subject = styled.View.withConfig({ displayName: 'VTInsetSubject' })`
      height: 100px;
      animation: reveal linear both;
      @keyframes reveal {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: view(block 10px);
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller testID="scroller">
          <Subject testID="subject" />
        </Scroller>
      )
    );
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(0));
    });
    act(() => {
      findSubject(tree).props.onLayout(layoutEvent(600, 100));
    });
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(400));
    });
    act(() => {
      findScroller(tree).props.onScroll(scrollEvent(400));
    });
    const insetWarn = warnSpy.mock.calls.find(c => /view-timeline inset/.test(c[0]));
    expect(insetWarn).toBeDefined();
    // The timeline still runs with the scrollport as the visibility range.
    expect(opacityOf(tree)).toBeCloseTo(0.5);
    warnSpy.mockRestore();
  });
});
