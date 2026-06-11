/**
 * Scroll progress timelines driving keyframe animations, end to end.
 *
 * CSS Scroll-driven Animations L1 (drafts.csswg.org/scroll-animations-1/,
 * fetched 2026-06-09). Normative anchors:
 * - §2.1: "Progress (the current time) for a scroll progress timeline is
 *   calculated as: scroll offset ÷ (scrollable overflow size − scroll
 *   container size)". "If the 0% position and 100% position coincide
 *   (i.e. the denominator in the current time formula is zero), the
 *   timeline is inactive."
 * - §2: "The startmost scroll position represents 0% progress and the
 *   endmost scroll position represents 100% progress."
 * - §4.1: "the remaining range is divided by its iteration count
 *   (animation-iteration-count) to find the used duration." / (with the
 *   spec's dashes elided) "If the animation has an infinite iteration
 *   count, each iteration duration, and the resulting active duration,
 *   will be zero."
 * - css-animations-2 §4.9, <dashed-ident>: "If a named scroll progress
 *   timeline ... is in scope on this element, use the referenced
 *   timeline ... Otherwise the animation is not associated with a
 *   timeline."
 *
 * Native deviations (documented):
 * - Named-timeline scope is the ancestor chain (context), not the
 *   spec's tree-order global lookup; a timeline declared on a sibling
 *   subtree is out of scope here.
 * - scroll(root) has no React Native analogue (no document viewport
 *   scroller) and scroll(self) animates the scroller itself; both are
 *   treated as inactive timelines for now, with a dev warning.
 * - fill-mode: progress is clamped at the attachment-range edges, so
 *   outside the range the animation holds its edge frames (the `both`
 *   behavior) regardless of the declared fill-mode.
 *
 * The styled ScrollView publishes offset/extent from its scroll events;
 * the first scroll event seeds the extent, which re-renders consumers
 * with live interpolations. Test-renderer output resolves Animated
 * nodes to primitives at render time, so assertions re-render after
 * scrolling to read current values.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import styled from '../../';
import { resetResponsiveCache } from '../../responsive';
import { resetNativeStyleCache } from '../../../models/compileNative';
import { resetWarningsForTest } from '../../transform/dev';
import '../'; // default adapter side-effect registration

function scrollEvent(
  y: number,
  contentH = 900,
  viewportH = 500,
  x = 0,
  contentW = 300,
  viewportW = 300
) {
  return {
    nativeEvent: {
      contentOffset: { x, y },
      contentSize: { height: contentH, width: contentW },
      layoutMeasurement: { height: viewportH, width: viewportW },
    },
  };
}

function opacityOf(tree: TestRenderer.ReactTestRenderer, testID = 'subject'): number | undefined {
  // testID forwards through the styled wrapper AND the host; scan
  // innermost-first so we read the host element's resolved style.
  const nodes = tree.root.findAllByProps({ testID });
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

describe('scroll progress timelines (Scroll-driven Animations L1 §2)', () => {
  const Scroller = styled.ScrollView.withConfig({ displayName: 'TLScroller' })`
    flex: 1;
  `;

  it('progress = offset / (overflow - container size) drives keyframe interpolation', () => {
    const Child = styled.View.withConfig({ displayName: 'TLChild' })`
      animation: grow linear both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: scroll();
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Child testID="subject" />
        </Scroller>
      )
    );
    const sv = tree.root.findByType(ScrollView);
    // Extent: 900 - 500 = 400. Offset 200 → progress 0.5.
    act(() => {
      sv.props.onScroll(scrollEvent(200));
    });
    expect(opacityOf(tree)).toBeCloseTo(0.5, 5);
  });

  it('startmost position is 0% and endmost is 100%', () => {
    const Child = styled.View.withConfig({ displayName: 'TLChildEnds' })`
      animation: grow linear both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: scroll();
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Child testID="subject" />
        </Scroller>
      )
    );
    const sv = tree.root.findByType(ScrollView);
    act(() => {
      sv.props.onScroll(scrollEvent(0));
    });
    expect(opacityOf(tree)).toBeCloseTo(0, 5);
    act(() => {
      sv.props.onScroll(scrollEvent(400));
    });
    expect(opacityOf(tree)).toBeCloseTo(1, 5);
  });

  it('animation-range remaps the attachment range (25% to 75%)', () => {
    const Child = styled.View.withConfig({ displayName: 'TLChildRange' })`
      animation: grow linear both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: scroll();
      animation-range: 25% 75%;
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Child testID="subject" />
        </Scroller>
      )
    );
    const sv = tree.root.findByType(ScrollView);
    // Range covers offsets [100, 300] of the 400 extent. Offset 200 is
    // halfway through the range.
    act(() => {
      sv.props.onScroll(scrollEvent(200));
    });
    expect(opacityOf(tree)).toBeCloseTo(0.5, 5);
    // Before the range start: clamped to the from frame.
    act(() => {
      sv.props.onScroll(scrollEvent(50));
    });
    expect(opacityOf(tree)).toBeCloseTo(0, 5);
  });

  it('a named timeline declared on the scroller is referenced by descendants', () => {
    const Named = styled.ScrollView.withConfig({ displayName: 'TLNamed' })`
      scroll-timeline: --hero y;
    `;
    const Child = styled.View.withConfig({ displayName: 'TLChildNamed' })`
      animation: grow linear both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: --hero;
    `;
    const tree = track(
      TestRenderer.create(
        <Named>
          <View>
            <Child testID="subject" />
          </View>
        </Named>
      )
    );
    const sv = tree.root.findByType(ScrollView);
    act(() => {
      sv.props.onScroll(scrollEvent(300));
    });
    expect(opacityOf(tree)).toBeCloseTo(0.75, 5);
  });

  it('iteration count divides the finite range (sawtooth)', () => {
    const Child = styled.View.withConfig({ displayName: 'TLChildIter' })`
      animation: grow linear 2 both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: scroll();
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Child testID="subject" />
        </Scroller>
      )
    );
    const sv = tree.root.findByType(ScrollView);
    // Two iterations across the 400 extent: offset 100 = progress 0.25 =
    // halfway through the first iteration.
    act(() => {
      sv.props.onScroll(scrollEvent(100));
    });
    expect(opacityOf(tree)).toBeCloseTo(0.5, 5);
    // Offset 300 = progress 0.75 = halfway through the second iteration.
    act(() => {
      sv.props.onScroll(scrollEvent(300));
    });
    expect(opacityOf(tree)).toBeCloseTo(0.5, 5);
  });

  it('an animation without a scroll container ancestor is inactive (no overrides)', () => {
    const Child = styled.View.withConfig({ displayName: 'TLChildOrphan' })`
      opacity: 0.9;
      animation: grow linear both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: scroll();
    `;
    const tree = track(TestRenderer.create(<Child testID="subject" />));
    expect(opacityOf(tree)).toBe(0.9);
  });

  it('a named reference with no in-scope declaration is inactive', () => {
    const Child = styled.View.withConfig({ displayName: 'TLChildNoName' })`
      opacity: 0.9;
      animation: grow linear both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: --nope;
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Child testID="subject" />
        </Scroller>
      )
    );
    const sv = tree.root.findByType(ScrollView);
    act(() => {
      sv.props.onScroll(scrollEvent(200));
    });
    expect(opacityOf(tree)).toBe(0.9);
  });

  it('zero scrollable overflow makes the timeline inactive', () => {
    const Child = styled.View.withConfig({ displayName: 'TLChildZero' })`
      opacity: 0.9;
      animation: grow linear both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation-timeline: scroll();
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Child testID="subject" />
        </Scroller>
      )
    );
    const sv = tree.root.findByType(ScrollView);
    // Content fits the viewport exactly: denominator zero.
    act(() => {
      sv.props.onScroll(scrollEvent(0, 500, 500));
    });
    expect(opacityOf(tree)).toBe(0.9);
  });

  it('time-driven animations are unaffected (timeline auto keeps Animated.timing)', () => {
    const Child = styled.View.withConfig({ displayName: 'TLChildAuto' })`
      animation: grow 300ms linear both;
      @keyframes grow {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Child testID="subject" />
        </Scroller>
      )
    );
    // The timing path starts at progress 0; opacity present as a driven
    // value (from frame), proving the scroll branch didn't hijack it.
    expect(opacityOf(tree)).toBeCloseTo(0, 5);
  });
});
