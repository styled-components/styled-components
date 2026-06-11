/**
 * Minimal `display: grid` subset on React Native.
 *
 * CSS Grid Layout Module Level 2 (drafts.csswg.org/css-grid-2/,
 * fetched 2026-06-09). Normative anchors quoted verbatim above the
 * tests they lock. Only the fixed-equal-columns subset is supported on
 * native; everything outside it warns and drops so the container still
 * renders as a wrapping flex row.
 *
 * Supported subset:
 * - container: `display: grid` + `grid-template-columns: repeat(N, 1fr)`
 *   or an explicit all-`1fr` track list, plus `gap` / `row-gap` /
 *   `column-gap`. `grid-auto-flow: row` is accepted (the implicit
 *   default); other flow values warn.
 * - item: `grid-column: span N` (integer N >= 1).
 *
 * Native mapping: the grid container lays out as `display: flex;
 * flex-direction: row; flex-wrap: wrap` and measures its content-box
 * width via onLayout. Each direct styled child reads the published grid
 * entry from the cascade and computes a pixel width from the fr-unit
 * leftover-space formula. rn-web passes the raw grid CSS through to the
 * browser untouched.
 */
import React from 'react';
import { View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import styled from '../';
import { resetResponsiveCache } from '../responsive';
import { resetNativeStyleCache, toNativeStyles } from '../../models/compileNative';
import { resetWarningsForTest } from '../transform/dev';
import { transformDecl } from '../transform';
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

describe('display: grid subset spec compliance (CSS Grid 2)', () => {
  describe('transformDecl emissions (native)', () => {
    // §2: "a grid container establishes a new grid formatting context for
    // its contents." Native has no grid formatting context; the closest
    // primitive is a wrapping flex row, which the grid item math then
    // sizes exactly.
    it('maps `display: grid` to a wrapping flex row plus a container sentinel', () => {
      expect(transformDecl('display', 'grid')).toEqual({
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        __scGridContainer: true,
      });
    });

    it('leaves other `display` values untouched', () => {
      expect(transformDecl('display', 'flex')).toEqual({ display: 'flex' });
      expect(transformDecl('display', 'none')).toEqual({ display: 'none' });
    });

    // §7.2.4: "A flexible length or <flex> is a dimension with the fr
    // unit, which represents a fraction of the leftover space in the
    // grid container." §7.2.3 repeat() "represents a repeated fragment of
    // the track list." `repeat(N, 1fr)` yields N equal flexible columns.
    it('parses `grid-template-columns: repeat(N, 1fr)` to a column count', () => {
      expect(transformDecl('grid-template-columns', 'repeat(3, 1fr)')).toEqual({
        __scGridColumns: 3,
      });
    });

    it('parses an explicit all-`1fr` track list to a column count', () => {
      expect(transformDecl('grid-template-columns', '1fr 1fr 1fr')).toEqual({
        __scGridColumns: 3,
      });
    });

    // §7.2.4: each track's share is `<flex> * <leftover space> / <sum of
    // all flex factors>`. The subset requires every factor to be `1fr`;
    // mixed track lists (px / minmax / auto / auto-fill / auto-fit /
    // unequal fr) are not supported and drop.
    it('drops and warns on px track lists', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('grid-template-columns', '100px 1fr')).toEqual({});
        const messages = warnSpy.mock.calls.map(c => String(c[0]));
        expect(
          messages.some(
            m =>
              m.includes('native-grid-template-unsupported is not in scope') ||
              m.includes('grid-template-columns')
          )
        ).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('drops and warns on auto-fill / minmax track lists', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(
          transformDecl('grid-template-columns', 'repeat(auto-fill, minmax(100px, 1fr))')
        ).toEqual({});
        expect(transformDecl('grid-template-columns', '2fr 1fr')).toEqual({});
        const messages = warnSpy.mock.calls.map(c => String(c[0]));
        expect(messages.some(m => m.includes('grid-template-columns'))).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });

    // §8.3: the `span` keyword on grid-column-start/end means the item
    // spans the given number of tracks. The subset accepts `span N`
    // (integer N >= 1) and drops line-number / named-line / grid-row /
    // grid-area placement.
    it('parses `grid-column: span N` to a span count', () => {
      expect(transformDecl('grid-column', 'span 2')).toEqual({ __scGridSpan: 2 });
      expect(transformDecl('grid-column', 'span 1')).toEqual({ __scGridSpan: 1 });
    });

    it('drops and warns on line-number / named-line / range placement', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('grid-column', '1 / 3')).toEqual({});
        expect(transformDecl('grid-column', '2')).toEqual({});
        expect(transformDecl('grid-row', 'span 2')).toEqual({});
        expect(transformDecl('grid-area', '1 / 1 / 2 / 3')).toEqual({});
        const messages = warnSpy.mock.calls.map(c => String(c[0]));
        expect(
          messages.some(
            m => m.includes('grid-column') || m.includes('grid-row') || m.includes('grid-area')
          )
        ).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });

    // Different placement properties that share the same raw value must
    // each warn. A dedupe suffix of the bare value would collapse
    // `grid-column: 1`, `grid-row: 1`, and `grid-area: 1` into one warning.
    it('warns per placement property even when values collide', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('grid-column', '1')).toEqual({});
        expect(transformDecl('grid-row', '1')).toEqual({});
        expect(transformDecl('grid-area', '1')).toEqual({});
        const messages = warnSpy.mock.calls.map(c => String(c[0]));
        expect(messages.some(m => m.includes('`grid-column` value "1"'))).toBe(true);
        expect(messages.some(m => m.includes('`grid-row` property is not supported'))).toBe(true);
        expect(messages.some(m => m.includes('`grid-area` property is not supported'))).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });

    // §8.5 grid-auto-flow controls the auto-placement direction; `row`
    // is the initial value and the only flow the subset implements.
    it('accepts `grid-auto-flow: row` as a no-op', () => {
      expect(transformDecl('grid-auto-flow', 'row')).toEqual({});
    });

    it('drops and warns on other `grid-auto-flow` values', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('grid-auto-flow', 'column')).toEqual({});
        expect(transformDecl('grid-auto-flow', 'dense')).toEqual({});
        const messages = warnSpy.mock.calls.map(c => String(c[0]));
        expect(messages.some(m => m.includes('grid-auto-flow'))).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describeOnRnWeb('transformDecl emissions (rn-web passthrough)', () => {
    // Browsers ship CSS grid. The rn-web branch passes raw values through
    // so the host engine lays out a real grid; no lifts, no warnings.
    it('passes `display: grid` through unchanged', () => {
      expect(transformDecl('display', 'grid')).toEqual({ display: 'grid' });
    });

    it('passes track lists, placement, and flow through as raw strings', () => {
      expect(transformDecl('grid-template-columns', 'repeat(3, 1fr)')).toEqual({
        gridTemplateColumns: 'repeat(3, 1fr)',
      });
      expect(transformDecl('grid-template-columns', '100px 1fr')).toEqual({
        gridTemplateColumns: '100px 1fr',
      });
      expect(transformDecl('grid-column', 'span 2')).toEqual({ gridColumn: 'span 2' });
      expect(transformDecl('grid-column', '1 / 3')).toEqual({ gridColumn: '1 / 3' });
      expect(transformDecl('grid-auto-flow', 'column')).toEqual({ gridAutoFlow: 'column' });
    });

    it('does not warn for unsupported track lists on rn-web', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        transformDecl('grid-template-columns', '2fr 1fr');
        transformDecl('grid-column', '1 / 3');
        transformDecl('grid-auto-flow', 'dense');
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('compile extraction (toNativeStyles)', () => {
    it('lifts a container with columns into gridInfo and strips the sentinels', () => {
      const r = toNativeStyles(
        'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;',
        stubStyleSheet
      );
      expect(r.gridInfo).toEqual({ columns: 3 });
      expect((r.base as any).__scGridContainer).toBeUndefined();
      expect((r.base as any).__scGridColumns).toBeUndefined();
      // Container still lays out as a wrapping flex row.
      expect((r.base as any).display).toBe('flex');
      expect((r.base as any).flexDirection).toBe('row');
      expect((r.base as any).flexWrap).toBe('wrap');
      // single-value `gap` stays as the `gap` shorthand key.
      expect((r.base as any).gap).toBe(10);
    });

    it('lifts an item span into gridSpan and strips the sentinel', () => {
      const r = toNativeStyles('grid-column: span 2;', stubStyleSheet);
      expect(r.gridSpan).toBe(2);
      expect((r.base as any).__scGridSpan).toBeUndefined();
    });

    it('warns and falls back to wrapping flex when a container has no template', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const r = toNativeStyles('display: grid;', stubStyleSheet);
        expect(r.gridInfo).toBeUndefined();
        expect((r.base as any).display).toBe('flex');
        expect((r.base as any).flexWrap).toBe('wrap');
        const messages = warnSpy.mock.calls.map(c => String(c[0]));
        expect(messages.some(m => m.includes('grid-template-columns'))).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });

    describeOnRnWeb('on rn-web', () => {
      it('leaves grid CSS in the base for the browser; no gridInfo/gridSpan', () => {
        const r = toNativeStyles(
          'display: grid; grid-template-columns: repeat(3, 1fr); grid-column: span 2;',
          stubStyleSheet
        );
        expect(r.gridInfo).toBeUndefined();
        expect(r.gridSpan).toBeUndefined();
        expect((r.base as any).display).toBe('grid');
        expect((r.base as any).gridTemplateColumns).toBe('repeat(3, 1fr)');
        expect((r.base as any).gridColumn).toBe('span 2');
      });
    });
  });

  describe('render-level layout (native)', () => {
    // §7.2.4: each 1fr column's share of leftover space is
    // contentWidth/N after gutters are subtracted. A span-N item is
    // N columns plus the (N-1) interior gutters it bridges.
    // Distinct displayNames give distinct styledComponentIds in the
    // no-babel test harness, so the parent / child identity check that
    // gates grid-item sizing has stable ids to compare.
    const Grid = styled.View.withConfig({ displayName: 'Grid' })`
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding: 12px;
    `;
    const Tile = styled.View.withConfig({ displayName: 'GridTile' })``;
    const Wide = styled.View.withConfig({ displayName: 'GridWide' })`
      grid-column: span 2;
    `;

    function renderGrid() {
      return track(
        TestRenderer.create(
          React.createElement(
            Grid,
            null,
            React.createElement(Tile, { key: 1 }),
            React.createElement(Wide, { key: 2 }),
            React.createElement(Tile, { key: 3 }),
            React.createElement(Tile, { key: 4 })
          )
        )
      );
    }

    function fireLayout(tree: TestRenderer.ReactTestRenderer, width: number) {
      const host = tree.root.findAllByType(View)[0];
      act(() => {
        host.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 200 } } });
      });
    }

    function tileWidths(tree: TestRenderer.ReactTestRenderer): any[] {
      // Innermost View hosts (skip the grid container at index 0).
      const hosts = tree.root.findAllByType(View);
      return hosts.slice(1).map(h => flattenWidth(h.props.style));
    }

    function flattenWidth(style: any): any {
      if (Array.isArray(style)) {
        let w: any;
        for (const s of style) {
          const x = flattenWidth(s);
          if (x !== undefined) w = x;
        }
        return w;
      }
      return style && typeof style === 'object' ? style.width : undefined;
    }

    it('gives children a percentage fallback before layout', () => {
      const tree = renderGrid();
      const widths = tileWidths(tree);
      // 3-col grid: a single-span tile is 1/3, the span-2 tile is 2/3.
      expect(widths[0]).toBe(`${(100 * 1) / 3}%`);
      expect(widths[1]).toBe(`${(100 * 2) / 3}%`);
      expect(widths[2]).toBe(`${(100 * 1) / 3}%`);
      expect(widths[3]).toBe(`${(100 * 1) / 3}%`);
    });

    it('computes pixel widths from the fr formula after layout', () => {
      const tree = renderGrid();
      // border-box width 336 with padding 12 each side => content 312.
      // columnGap 10, 3 columns. Single column:
      //   (312 - 2*10) / 3 = 292/3 = 97.333... -> 97.33
      // Span 2: span * single + (span-1)*gap = 2*97.33 + 10 = 204.67
      fireLayout(tree, 336);
      const widths = tileWidths(tree);
      // Rounding happens on the final width, not on the intermediate
      // single-column value, so a span-2 reads the full-precision single.
      const singleRaw = (312 - 2 * 10) / 3;
      const single = Math.round(singleRaw * 100) / 100;
      const span2 = Math.round((singleRaw * 2 + 10) * 100) / 100;
      expect(widths[0]).toBeCloseTo(single, 2);
      expect(widths[1]).toBeCloseTo(span2, 2);
      expect(widths[2]).toBeCloseTo(single, 2);
      expect(widths[3]).toBeCloseTo(single, 2);
    });

    it('updates widths when the container re-lays-out', () => {
      const tree = renderGrid();
      fireLayout(tree, 336);
      const before = tileWidths(tree)[0];
      fireLayout(tree, 636); // content 612
      const after = tileWidths(tree)[0];
      const expected = Math.round(((612 - 2 * 10) / 3) * 100) / 100;
      expect(after).toBeCloseTo(expected, 2);
      expect(after).not.toBeCloseTo(before, 2);
    });

    it('does not size a non-direct grandchild', () => {
      const Inner = styled.View.withConfig({ displayName: 'GridInner' })``;
      const tree = track(
        TestRenderer.create(
          React.createElement(
            Grid,
            null,
            React.createElement(Tile, { key: 1 }, React.createElement(Inner, { key: 'a' }))
          )
        )
      );
      const host = tree.root.findAllByType(View)[0];
      act(() => {
        host.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 336, height: 200 } } });
      });
      const hosts = tree.root.findAllByType(View);
      // index 0 grid, index 1 direct child (sized), index 2 grandchild (not sized).
      expect(flattenWidth(hosts[2].props.style)).toBeUndefined();
    });
  });

  describe('container without a styled component (showcase parity)', () => {
    it('clamps a span larger than the column count', () => {
      const Grid = styled.View.withConfig({ displayName: 'ClampGrid' })`
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      `;
      const Wide = styled.View.withConfig({ displayName: 'ClampWide' })`
        grid-column: span 5;
      `;
      const tree = track(
        TestRenderer.create(React.createElement(Grid, null, React.createElement(Wide, { key: 1 })))
      );
      const host = tree.root.findAllByType(View)[0];
      act(() => {
        host.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 100 } } });
      });
      const child = tree.root.findAllByType(View)[1];
      const style = child.props.style;
      const w = Array.isArray(style) ? style[style.length - 1].width : (style as any).width;
      // span clamps to 2 columns: full content width (no interior gutter
      // beyond what the 2 columns already span). content 200, gap 8:
      //   single = (200 - 8)/2 = 96; span2 = 96*2 + 8 = 200.
      expect(w).toBeCloseTo(200, 2);
    });
  });

  describe('grid container that is also a container-query container', () => {
    // CSS Conditional 5 / css-contain-3: declaring `container-type` makes
    // the element a query container regardless of its display type. A
    // `display: grid` container must therefore publish BOTH the grid
    // entry (for item sizing) and its container box (for @container
    // rules and cq* units on descendants); the grid role must not eat
    // the container role.
    function flattenStyle(style: any): Record<string, any> {
      const out: Record<string, any> = {};
      const walk = (s: any) => {
        if (s == null) return;
        if (Array.isArray(s)) {
          for (const item of s) walk(item);
          return;
        }
        if (typeof s === 'object') Object.assign(out, s);
      };
      walk(style);
      return out;
    }

    it('descendant cq* units resolve against the grid container box', () => {
      const Grid = styled.View.withConfig({ displayName: 'CqGrid' })`
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        container-type: inline-size;
      `;
      const Tile = styled.View.withConfig({ displayName: 'CqTile' })`
        height: 50cqw;
      `;
      const tree = track(
        TestRenderer.create(React.createElement(Grid, null, React.createElement(Tile, { key: 1 })))
      );
      const host = tree.root.findAllByType(View)[0];
      act(() => {
        host.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } } });
      });
      const child = tree.root.findAllByType(View)[1];
      // 50cqw of the 320 content box (no padding/border declared) = 160.
      expect(flattenStyle(child.props.style).height).toBeCloseTo(160, 2);
    });

    it('descendant @container rules match against the grid container box', () => {
      const Grid = styled.View.withConfig({ displayName: 'CqRuleGrid' })`
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        container-type: inline-size;
      `;
      const Tile = styled.View.withConfig({ displayName: 'CqRuleTile' })`
        background-color: blue;
        @container (min-width: 300px) {
          background-color: red;
        }
      `;
      const tree = track(
        TestRenderer.create(React.createElement(Grid, null, React.createElement(Tile, { key: 1 })))
      );
      const host = tree.root.findAllByType(View)[0];
      act(() => {
        host.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } } });
      });
      const child = tree.root.findAllByType(View)[1];
      expect(flattenStyle(child.props.style).backgroundColor).toBe('red');
    });

    it('grid item sizing keeps working alongside the container role', () => {
      const Grid = styled.View.withConfig({ displayName: 'CqBothGrid' })`
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        container-type: inline-size;
      `;
      const Tile = styled.View.withConfig({ displayName: 'CqBothTile' })``;
      const tree = track(
        TestRenderer.create(
          React.createElement(
            Grid,
            null,
            React.createElement(Tile, { key: 1 }),
            React.createElement(Tile, { key: 2 })
          )
        )
      );
      const host = tree.root.findAllByType(View)[0];
      act(() => {
        host.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 100 } } });
      });
      const child = tree.root.findAllByType(View)[1];
      // single = (200 - 8) / 2 = 96.
      expect(flattenStyle(child.props.style).width).toBeCloseTo(96, 2);
    });
  });
});
