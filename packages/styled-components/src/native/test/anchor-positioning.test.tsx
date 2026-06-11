/**
 * CSS Anchor Positioning Level 1, core subset on React Native.
 *
 * Drafts source: https://drafts.csswg.org/css-anchor-position-1/
 * (fetched 2026-06-09). Normative anchors:
 * - §2.1: anchor-name: `none | <anchor-name>#`, `<anchor-name> =
 *   <dashed-ident>`, initial none.
 * - §3.2: "<anchor()> = anchor( <anchor-name>? && <anchor-side>,
 *   <length-percentage>? )". "An absolutely positioned box can use the
 *   anchor() function as a value in its inset properties to refer to
 *   the position of one or more anchor boxes. The anchor() function
 *   resolves to a <length>."
 * - §3.2 sides: "top right bottom left: Refers to the specified side of
 *   the anchor box. Note: These are only usable in the inset properties
 *   in the matching axis."
 * - §5.1: "anchor-size() = anchor-size( [ <anchor-name> ||
 *   <anchor-size> ]? , <length-percentage>? )" with "Unlike anchor(),
 *   there is no restriction on having to match axises".
 *
 * Native subset and deviations (documented):
 * - The positioned element and its anchor must share the same parent
 *   (the anchor's onLayout rect is parent-relative, which is exactly
 *   RN's absolute-positioning space for siblings). Cross-parent
 *   anchoring needs window-space measurement and is a follow-up.
 * - anchor() is supported in `top` and `left`. RN's `bottom` / `right`
 *   insets measure from the parent's far edges, which requires the
 *   parent's size; declaring anchor() there warns and falls back.
 * - Side keywords: physical top/right/bottom/left only (start/end/
 *   inside/outside/center/<percentage> are not mapped yet and fall
 *   back).
 * - anchor-size() requires an explicit width|height keyword (the
 *   omitted-keyword property-axis default is not implemented).
 * - Anchor names are app-global (module registry), matching the spec's
 *   global-by-default naming; duplicate names last-write-wins.
 * - On the web bundle the browser's own anchor positioning applies;
 *   declarations pass through untouched.
 */
import React from 'react';
import { View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import styled from '../';
import { resetAnchorsForTest, setAnchorRect } from '../anchorRegistry';
import { resetResponsiveCache } from '../responsive';
import { resetNativeStyleCache, toNativeStyles } from '../../models/compileNative';
import { resetWarningsForTest } from '../transform/dev';
import { buildResolver } from '../transform/polyfills/resolvers';
import { describeOnRnWeb } from '../transform/describeOnRnWeb';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

const baseEnv: any = {
  media: {
    width: 400,
    height: 800,
    colorScheme: 'light',
    reduceMotion: false,
    fontScale: 1,
    pixelRatio: 1,
  },
  container: null,
  theme: {},
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  rootFontSize: 16,
  fontSize: 16,
  lineHeight: 24,
  direction: 'ltr',
  customProperties: null,
};

let renderers: TestRenderer.ReactTestRenderer[] = [];
function track(r: TestRenderer.ReactTestRenderer) {
  renderers.push(r);
  return r;
}

beforeEach(() => {
  resetResponsiveCache();
  resetNativeStyleCache();
  resetWarningsForTest();
  resetAnchorsForTest();
});

afterEach(() => {
  for (const r of renderers) {
    try {
      act(() => r.unmount());
    } catch {}
  }
  renderers = [];
});

function styleOf(tree: TestRenderer.ReactTestRenderer, testID: string): Record<string, any> {
  const nodes = tree.root.findAllByProps({ testID });
  const host = nodes[nodes.length - 1];
  const style = host.props.style;
  const layers = Array.isArray(style) ? style.flat(Infinity) : [style];
  return Object.assign({}, ...layers.filter(l => l && typeof l === 'object'));
}

describe('anchor() / anchor-size() resolvers (CSS Anchor Positioning §3.2 / §5.1)', () => {
  beforeEach(() => {
    setAnchorRect('--btn', { x: 12, y: 30, width: 100, height: 40 });
  });

  it('anchor(<name> top|bottom) resolves the vertical edges for a top inset', () => {
    expect(buildResolver('anchor(--btn top)', 'top')!(baseEnv)).toBe(30);
    expect(buildResolver('anchor(--btn bottom)', 'top')!(baseEnv)).toBe(70);
  });

  it('anchor(<name> left|right) resolves the horizontal edges for a left inset', () => {
    expect(buildResolver('anchor(--btn left)', 'left')!(baseEnv)).toBe(12);
    expect(buildResolver('anchor(--btn right)', 'left')!(baseEnv)).toBe(112);
  });

  it('side keywords are only usable in inset properties of the matching axis', () => {
    expect(buildResolver('anchor(--btn left)', 'top')!(baseEnv)).toBeNull();
    expect(buildResolver('anchor(--btn top)', 'left')!(baseEnv)).toBeNull();
  });

  it('a missing anchor resolves to the fallback', () => {
    expect(buildResolver('anchor(--nope bottom, 33px)', 'top')!(baseEnv)).toBe(33);
  });

  it('a missing anchor with no fallback invalidates the declaration', () => {
    expect(buildResolver('anchor(--nope bottom)', 'top')!(baseEnv)).toBeNull();
  });

  it('name and side compose in either order (&& grammar)', () => {
    expect(buildResolver('anchor(bottom --btn)', 'top')!(baseEnv)).toBe(70);
  });

  it('bottom/right insets are not supported yet (deviation: fallback)', () => {
    expect(buildResolver('anchor(--btn top, 5px)', 'bottom')!(baseEnv)).toBe(5);
    expect(buildResolver('anchor(--btn left)', 'right')!(baseEnv)).toBeNull();
  });

  it('anchor-size(width|height) resolves the anchor box dimensions', () => {
    expect(buildResolver('anchor-size(--btn width)', 'width')!(baseEnv)).toBe(100);
    expect(buildResolver('anchor-size(--btn height)', 'height')!(baseEnv)).toBe(40);
  });

  it('anchor-size() has no axis-matching restriction', () => {
    expect(buildResolver('anchor-size(--btn height)', 'width')!(baseEnv)).toBe(40);
  });

  it('anchor-size() falls back when the anchor is missing', () => {
    expect(buildResolver('anchor-size(--nope width, 64px)', 'width')!(baseEnv)).toBe(64);
  });

  it('composes inside calc() (offset tooltips)', () => {
    expect(buildResolver('calc(anchor(--btn bottom) + 6px)', 'top')!(baseEnv)).toBe(76);
    expect(buildResolver('calc(anchor-size(--btn width) / 2)', 'width')!(baseEnv)).toBe(50);
  });

  it('the implicit anchor comes from position-anchor', () => {
    const env = { ...baseEnv, positionAnchor: '--btn' };
    expect(buildResolver('anchor(bottom)', 'top')!(env)).toBe(70);
    expect(buildResolver('anchor(bottom)', 'top')!(baseEnv)).toBeNull();
  });
});

describe('anchor-name compilation (CSS Anchor Positioning §2.1)', () => {
  it('lifts anchor-name into the compiled output on native', () => {
    const r = toNativeStyles('anchor-name: --hero; height: 40px;', stubStyleSheet);
    expect(r.anchorName).toBe('--hero');
    expect((r.base as any).anchorName).toBeUndefined();
  });

  it('anchor-name: none declares nothing', () => {
    const r = toNativeStyles('anchor-name: none;', stubStyleSheet);
    expect(r.anchorName).toBeUndefined();
  });

  it('position-anchor is carried for implicit anchor() references', () => {
    const r = toNativeStyles('position-anchor: --hero;', stubStyleSheet);
    expect(r.positionAnchor).toBe('--hero');
    expect((r.base as any).positionAnchor).toBeUndefined();
  });

  describeOnRnWeb('on rn-web', () => {
    it('passes the declarations through for the browser', () => {
      const r = toNativeStyles('anchor-name: --hero;', stubStyleSheet);
      expect(r.anchorName).toBeUndefined();
      expect((r.base as any).anchorName).toBe('--hero');
    });
  });
});

describe('anchor positioning end-to-end (sibling tooltip)', () => {
  const Wrap = styled.View.withConfig({ displayName: 'AnchorWrap' })`
    flex: 1;
  `;
  const Button = styled.View.withConfig({ displayName: 'AnchorButton' })`
    anchor-name: --save;
    height: 40px;
  `;
  const Tip = styled.View.withConfig({ displayName: 'AnchorTip' })`
    position: absolute;
    top: anchor(--save bottom);
    left: anchor(--save left);
    width: anchor-size(--save width);
  `;

  function layout(x: number, y: number, width: number, height: number) {
    return { nativeEvent: { layout: { x, y, width, height } } };
  }

  it('positions the tooltip from the anchor onLayout rect and tracks re-layout', () => {
    const tree = track(
      TestRenderer.create(
        <Wrap>
          <Button testID="btn" />
          <Tip testID="tip" />
        </Wrap>
      )
    );
    const btnNodes = tree.root.findAllByProps({ testID: 'btn' });
    const btnHost = btnNodes[btnNodes.length - 1];
    act(() => {
      btnHost.props.onLayout(layout(16, 80, 120, 40));
    });
    let s = styleOf(tree, 'tip');
    expect(s.top).toBe(120);
    expect(s.left).toBe(16);
    expect(s.width).toBe(120);

    // The anchor moves: subscribers re-resolve.
    act(() => {
      btnHost.props.onLayout(layout(16, 200, 120, 40));
    });
    s = styleOf(tree, 'tip');
    expect(s.top).toBe(240);
  });

  it('an unresolved anchor drops the inset declarations (behaves as auto)', () => {
    const tree = track(
      TestRenderer.create(
        <Wrap>
          <Tip testID="tip" />
        </Wrap>
      )
    );
    const s = styleOf(tree, 'tip');
    expect(s.top).toBeUndefined();
    expect(s.left).toBeUndefined();
    expect(s.position).toBe('absolute');
  });
});
