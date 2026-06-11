/**
 * position: sticky on React Native via a layout-pinned overlay twin.
 *
 * CSS Positioned Layout Level 3 (drafts.csswg.org/css-position-3/,
 * fetched 2026-06-09). Normative anchors:
 * - position: sticky: "identical to relative, except that its offsets
 *   are automatically adjusted in reference to the nearest ancestor
 *   scroll container's scrollport ... to try to keep the box in view
 *   within its containing block as the user scrolls."
 * - §3.4: "Sticky positioning is similar to relative positioning except
 *   the offsets are automatically calculated in reference to the
 *   nearest scrollport."
 *
 * Native mapping: the sticky element renders twice. The in-flow
 * original keeps its layout slot; a clone is registered into an
 * absolutely-positioned overlay host that the styled scroll container
 * renders as its sibling, pinned to the scrollport's top edge. The
 * handoff at the crossover is a pair of complementary UI-thread
 * opacity interpolations over half a pixel of scroll, so the stuck
 * position is fixed by layout and cannot trail or wobble during
 * flings. Per-frame translate driving (and React Native's own
 * `stickyHeaderIndices`, which syncs through a JS listener plus a
 * debounce) were abandoned: on the new architecture both visibly
 * shimmer during scroll momentum.
 *
 * Documented deviations:
 * - Top-edge sticking only, for direct children of a styled ScrollView
 *   (the element's layout is read from its own parent-relative
 *   onLayout). Inset offsets (`top: 8px`) are not applied.
 * - Multiple sticky siblings each stick independently and overlap at
 *   the top edge; there is no push-off between consecutive headers.
 * - The clone is a second render of the same element; component state
 *   inside sticky children is not shared between the two.
 * - The overlay host aligns to the scroller's frame; the scroller's
 *   own border widths are not subtracted (hairline-class offset).
 * - On the web bundle the browser handles `position: sticky` itself;
 *   the declaration passes through and no overlay machinery mounts.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import styled from '../';
import { resetResponsiveCache } from '../responsive';
import { resetNativeStyleCache, toNativeStyles } from '../../models/compileNative';
import { resetWarningsForTest } from '../transform/dev';
import { describeOnRnWeb } from '../transform/describeOnRnWeb';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

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

function scrollEvent(y: number, contentH = 2000, viewportH = 500) {
  return {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { height: contentH, width: 300 },
      layoutMeasurement: { height: viewportH, width: 300 },
    },
  };
}

function layoutEvent(y: number, height = 40, x = 0, width = 300) {
  return { nativeEvent: { layout: { x, y, width, height } } };
}

function findScroller(tree: TestRenderer.ReactTestRenderer) {
  const nodes = tree.root.findAllByType(ScrollView);
  return nodes[nodes.length - 1];
}

/** The in-flow original: the instance carrying the composed onLayout. */
function findInFlow(tree: TestRenderer.ReactTestRenderer, testID: string) {
  const nodes = tree.root.findAllByProps({ testID });
  for (let i = 0; i < nodes.length; i++) {
    if (typeof nodes[i].props.onLayout === 'function') return nodes[i];
  }
  throw new Error(`in-flow host with onLayout not found for ${testID}`);
}

/** The overlay host: absolute, box-none sibling rendered by the scroller. */
function findOverlayHosts(tree: TestRenderer.ReactTestRenderer) {
  return tree.root.findAll(n => {
    // Host elements only; the composite View wrapper duplicates props.
    if (typeof n.type !== 'string' || n.props.pointerEvents !== 'box-none') return false;
    const flat = [n.props.style].flat(Infinity).filter(Boolean);
    return flat.some((l: any) => l.position === 'absolute');
  });
}

/** The pinned clone for a testID: lives inside the overlay host. */
function findClone(tree: TestRenderer.ReactTestRenderer, testID: string) {
  const hosts = findOverlayHosts(tree);
  for (const host of hosts) {
    const matches = host.findAll(n => n.props.testID === testID);
    if (matches.length > 0) return matches[0];
  }
  return null;
}

function flatStyle(node: any): any[] {
  const style = node.props.style;
  return (Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean);
}

/** Current numeric opacity of a node's style (number or live Animated node). */
function opacityOf(node: any): number | null {
  for (const layer of flatStyle(node)) {
    const op = layer.opacity;
    if (typeof op === 'number') return op;
    if (op !== null && typeof op === 'object' && typeof op.__getValue === 'function') {
      return op.__getValue();
    }
  }
  return null;
}

function hasTransform(node: any): boolean {
  return flatStyle(node).some(l => l.transform !== undefined);
}

describe('position: sticky spec compliance (CSS Position 3 §3.4)', () => {
  describe('compilation', () => {
    it('lifts position: sticky off the style object into the sticky flag', () => {
      const out = toNativeStyles('position: sticky; height: 40px;', stubStyleSheet);
      expect(out.sticky).toBe(true);
      expect((out.base as any).position).toBeUndefined();
      expect((out.base as any).height).toBe(40);
    });

    it('leaves other position values untouched', () => {
      const out = toNativeStyles('position: absolute;', stubStyleSheet);
      expect(out.sticky).toBeUndefined();
      expect((out.base as any).position).toBe('absolute');
    });

    describeOnRnWeb('on rn-web', () => {
      it('passes position: sticky through for the browser', () => {
        const out = toNativeStyles('position: sticky;', stubStyleSheet);
        expect(out.sticky).toBeUndefined();
        expect((out.base as any).position).toBe('sticky');
      });
    });
  });

  describe('sticky positioning (overlay twin)', () => {
    const Scroller = styled.ScrollView.withConfig({ displayName: 'StickyScroller' })`
      flex: 1;
    `;
    const Header = styled.View.withConfig({ displayName: 'StickyHeader' })`
      position: sticky;
      height: 40px;
    `;

    function mount(children: React.ReactNode) {
      const tree = track(TestRenderer.create(<Scroller testID="scroller">{children}</Scroller>));
      act(() => {
        findScroller(tree).props.onLayout(layoutEvent(0, 500, 0, 300));
        findScroller(tree).props.onScroll(scrollEvent(0));
      });
      return tree;
    }

    function measure(tree: TestRenderer.ReactTestRenderer, testID: string, y: number) {
      act(() => {
        findInFlow(tree, testID).props.onLayout(layoutEvent(y));
      });
    }

    it('registers a layout-pinned clone in the scroller overlay', () => {
      const tree = mount(<Header testID="subject" />);
      measure(tree, 'subject', 100);
      const clone = findClone(tree, 'subject');
      expect(clone).not.toBeNull();
      const pin = flatStyle(clone).find((l: any) => l.position === 'absolute');
      expect(pin).toMatchObject({ position: 'absolute', top: 0, left: 0, width: 300 });
    });

    it('the overlay host pins to the scroller frame and lets touches through', () => {
      const tree = mount(<Header testID="subject" />);
      measure(tree, 'subject', 100);
      const hosts = findOverlayHosts(tree);
      expect(hosts.length).toBe(1);
      const hostStyle = Object.assign({}, ...flatStyle(hosts[0]));
      expect(hostStyle.position).toBe('absolute');
      expect(hostStyle.top).toBe(0);
      expect(hostStyle.left).toBe(0);
      expect(hostStyle.width).toBe(300);
      expect(hostStyle.height).toBe(500);
    });

    it('the in-flow element never carries a translate', () => {
      const tree = mount(<Header testID="subject" />);
      measure(tree, 'subject', 100);
      for (const y of [50, 150, 400]) {
        act(() => {
          findScroller(tree).props.onScroll(scrollEvent(y));
        });
        expect(hasTransform(findInFlow(tree, 'subject'))).toBe(false);
      }
    });

    it('hands off visibility at the crossover (complementary opacities)', () => {
      const tree = mount(<Header testID="subject" />);
      measure(tree, 'subject', 100);
      act(() => {
        findScroller(tree).props.onScroll(scrollEvent(50));
      });
      expect(opacityOf(findInFlow(tree, 'subject'))).toBe(1);
      expect(opacityOf(findClone(tree, 'subject'))).toBe(0);
      act(() => {
        findScroller(tree).props.onScroll(scrollEvent(150));
      });
      expect(opacityOf(findInFlow(tree, 'subject'))).toBe(0);
      expect(opacityOf(findClone(tree, 'subject'))).toBe(1);
      // Scrolling back restores the in-flow original.
      act(() => {
        findScroller(tree).props.onScroll(scrollEvent(60));
      });
      expect(opacityOf(findInFlow(tree, 'subject'))).toBe(1);
      expect(opacityOf(findClone(tree, 'subject'))).toBe(0);
    });

    it('routes touches and accessibility to whichever twin is visible', () => {
      const tree = mount(<Header testID="subject" />);
      measure(tree, 'subject', 100);
      act(() => {
        findScroller(tree).props.onScroll(scrollEvent(50));
      });
      expect(findClone(tree, 'subject')!.props.pointerEvents).toBe('none');
      expect(findClone(tree, 'subject')!.props.accessibilityElementsHidden).toBe(true);
      expect(findInFlow(tree, 'subject').props.accessibilityElementsHidden).not.toBe(true);
      act(() => {
        findScroller(tree).props.onScroll(scrollEvent(150));
      });
      expect(findClone(tree, 'subject')!.props.pointerEvents).toBe('auto');
      expect(findClone(tree, 'subject')!.props.accessibilityElementsHidden).toBe(false);
      expect(findInFlow(tree, 'subject').props.accessibilityElementsHidden).toBe(true);
    });

    it('renders the same children in both twins', () => {
      const Label = styled.Text``;
      const tree = mount(
        <Header testID="subject">
          <Label>section</Label>
        </Header>
      );
      measure(tree, 'subject', 100);
      const texts = tree.root.findAll(
        n => typeof n.props.children === 'string' && n.props.children === 'section'
      );
      expect(texts.length).toBeGreaterThanOrEqual(2);
    });

    it('the clone carries no ref or layout listener', () => {
      const tree = mount(<Header testID="subject" />);
      measure(tree, 'subject', 100);
      const clone = findClone(tree, 'subject')!;
      expect(clone.props.onLayout).toBeUndefined();
      expect(clone.props.ref).toBeUndefined();
    });

    it('multiple sticky siblings get independent clones', () => {
      const tree = mount(
        <>
          <Header testID="a" />
          <View />
          <Header testID="b" />
        </>
      );
      measure(tree, 'a', 100);
      measure(tree, 'b', 300);
      act(() => {
        findScroller(tree).props.onScroll(scrollEvent(200));
      });
      // Past a (stuck), before b (in flow).
      expect(opacityOf(findClone(tree, 'a'))).toBe(1);
      expect(opacityOf(findClone(tree, 'b'))).toBe(0);
      act(() => {
        findScroller(tree).props.onScroll(scrollEvent(350));
      });
      expect(opacityOf(findClone(tree, 'a'))).toBe(1);
      expect(opacityOf(findClone(tree, 'b'))).toBe(1);
    });

    it('a function-interpolated position: sticky gets a clone too', () => {
      const Dyn = styled.View.withConfig({ displayName: 'StickyDyn' })<{ $stick: boolean }>`
        position: ${p => (p.$stick ? 'sticky' : 'relative')};
        height: 40px;
      `;
      const tree = mount(<Dyn $stick testID="subject" />);
      measure(tree, 'subject', 100);
      act(() => {
        findScroller(tree).props.onScroll(scrollEvent(160));
      });
      expect(opacityOf(findClone(tree, 'subject'))).toBe(1);
      expect(hasTransform(findInFlow(tree, 'subject'))).toBe(false);
    });

    it('an unmounting sticky child removes its clone', () => {
      const tree = mount(<Header testID="subject" />);
      measure(tree, 'subject', 100);
      expect(findClone(tree, 'subject')).not.toBeNull();
      act(() => {
        tree.update(<Scroller testID="scroller" />);
      });
      expect(findClone(tree, 'subject')).toBeNull();
    });

    it('no styled scroller in scope leaves the element untouched', () => {
      const tree = track(
        TestRenderer.create(
          <View>
            <Header testID="subject" />
          </View>
        )
      );
      expect(findOverlayHosts(tree).length).toBe(0);
      const nodes = tree.root.findAllByProps({ testID: 'subject' });
      for (const node of nodes) {
        for (const layer of flatStyle(node)) {
          // position was lifted off the style; no invalid value ships to RN.
          expect((layer as any).position).toBeUndefined();
          expect((layer as any).opacity).toBeUndefined();
        }
      }
    });

    it('a scroller without sticky children renders no overlay host', () => {
      const tree = mount(<View testID="plain" />);
      expect(findOverlayHosts(tree).length).toBe(0);
    });

    it('does not inject stickyHeaderIndices onto the scroller', () => {
      const tree = mount(<Header testID="subject" />);
      expect(tree.root.findByType(ScrollView).props.stickyHeaderIndices).toBeUndefined();
    });

    it('a user-supplied stickyHeaderIndices prop passes through untouched', () => {
      const tree = track(
        TestRenderer.create(
          <Scroller stickyHeaderIndices={[1]}>
            <View />
            <View />
          </Scroller>
        )
      );
      expect(tree.root.findByType(ScrollView).props.stickyHeaderIndices).toEqual([1]);
    });

    describeOnRnWeb('on rn-web', () => {
      it('mounts no overlay machinery; the browser handles sticking', () => {
        const WebScroller = styled.ScrollView``;
        const WebHeader = styled.View`
          position: sticky;
        `;
        const tree = track(
          TestRenderer.create(
            <WebScroller testID="scroller">
              <WebHeader testID="subject" />
            </WebScroller>
          )
        );
        act(() => {
          findScroller(tree).props.onLayout(layoutEvent(0, 500, 0, 300));
          findScroller(tree).props.onScroll(scrollEvent(150));
        });
        expect(findOverlayHosts(tree).length).toBe(0);
        const nodes = tree.root.findAllByProps({ testID: 'subject' });
        expect(nodes.length).toBeGreaterThan(0);
        const flat = flatStyle(nodes[nodes.length - 1]);
        // The raw declaration reaches the browser; no fade layer attaches.
        expect(flat.some((l: any) => l.position === 'sticky')).toBe(true);
        expect(flat.some((l: any) => l.opacity !== undefined)).toBe(false);
      });
    });
  });
});
