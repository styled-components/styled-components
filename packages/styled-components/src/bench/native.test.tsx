/**
 * Native path benchmarks for styled-components.
 *
 * Parser/cache tests:  pnpm --filter styled-components bench
 * Render tests:        pnpm --filter styled-components bench:native
 */

import React from 'react';
import { View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled from '../native';
import { parseCSSDeclarations, cssToStyleObject, resetStyleCache } from '../models/InlineStyle';
import { bench, COLORS } from './bench-utils';

const mockStyleSheet = { create: (s: any) => s };

const CSS_SIMPLE = 'color: red; font-size: 14px; margin: 0;';

const CSS_MEDIUM = `
  padding-top: 10px;
  padding-bottom: 20px;
  background-color: rgba(0, 0, 0, 0.5);
  flex: 1;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: rgb(200, 200, 200);
  margin: 10px 20px 30px 40px;
  font-size: 14px;
`;

const CSS_COMPLEX = `
  padding-top: 10px;
  padding-bottom: 20px;
  background-color: rgba(0, 0, 0, 0.5);
  flex: 1;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: rgb(200, 200, 200);
  margin: 10px 20px 30px 40px;
  font-size: 14px;
  /* component styles */
  shadow-offset: 0px 2px;
  shadow-radius: 4;
  shadow-color: rgba(0,0,0,0.3);
  shadow-opacity: 1;
  transform: translate(10px, 20px) scale(1.5);
  line-height: 20px;
  letter-spacing: 0.5px;
  opacity: 0.95;
  overflow: hidden;
`;

const CSS_WITH_COMMENTS = `
  /* header styles */
  color: red;
  /* layout */
  flex: 1;
  justify-content: center;
  /* spacing */
  padding: 10px;
  margin: 20px;
  /* visual */
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
`;

let r: any;

describe('native parser benchmarks', () => {
  it('parseCSSDeclarations throughput', () => {
    console.log('\n--- parseCSSDeclarations (100K iterations, median of 5) ---');
    bench('simple (3 declarations)', 100_000, () => {
      r = parseCSSDeclarations(CSS_SIMPLE);
    });
    bench('medium (10 declarations)', 100_000, () => {
      r = parseCSSDeclarations(CSS_MEDIUM);
    });
    bench('complex (20 decls, quotes, parens, comments)', 100_000, () => {
      r = parseCSSDeclarations(CSS_COMPLEX);
    });
    bench('with comments (6 comments, 6 declarations)', 100_000, () => {
      r = parseCSSDeclarations(CSS_WITH_COMMENTS);
    });
    bench('empty string', 100_000, () => {
      r = parseCSSDeclarations('');
    });
  });

  it('cssToStyleObject cache behavior', () => {
    console.log('\n--- cssToStyleObject (50K iterations, median of 5) ---');

    resetStyleCache();
    cssToStyleObject(CSS_SIMPLE, mockStyleSheet);
    bench('cache hit (simple, 3 decls)', 50_000, () => {
      r = cssToStyleObject(CSS_SIMPLE, mockStyleSheet);
    });

    resetStyleCache();
    cssToStyleObject(CSS_MEDIUM, mockStyleSheet);
    bench('cache hit (medium, 10 decls)', 50_000, () => {
      r = cssToStyleObject(CSS_MEDIUM, mockStyleSheet);
    });

    const CSS_RN_SAFE = `
      padding-top: 10px; padding-bottom: 20px; background-color: rgba(0,0,0,0.5);
      flex: 1; justify-content: center; align-items: center; border-width: 1px;
      border-color: rgb(200,200,200); font-size: 14px; opacity: 0.9; overflow: hidden;
      shadow-offset: 0px 2px; shadow-radius: 4; shadow-color: rgba(0,0,0,0.3);
      shadow-opacity: 1; line-height: 20px; letter-spacing: 0.5px;
    `;
    resetStyleCache();
    cssToStyleObject(CSS_RN_SAFE, mockStyleSheet);
    bench('cache hit (17 RN-safe decls)', 50_000, () => {
      r = cssToStyleObject(CSS_RN_SAFE, mockStyleSheet);
    });

    console.log('\n--- cssToStyleObject cache miss (1K iterations, median of 5) ---');
    bench('cache miss, 30 unique CSS strings cycling', 1_000, i => {
      resetStyleCache();
      for (let j = 0; j < 30; j++) {
        r = cssToStyleObject(
          'color: ' + COLORS[(j + i) % 30] + '; font-size: 14px; flex: 1;',
          mockStyleSheet
        );
      }
    });
  });

  it('parser edge cases', () => {
    console.log('\n--- Edge case throughput (50K iterations, median of 5) ---');
    bench('quoted values', 50_000, () => {
      r = parseCSSDeclarations("font-family: 'Helvetica Neue', sans-serif; color: red; flex: 1;");
    });
    bench('nested parentheses', 50_000, () => {
      r = parseCSSDeclarations(
        'width: calc(100% - var(--spacing, 10px)); color: rgba(0,0,0,0.5); flex: 1;'
      );
    });
    bench('data URI with semicolons', 50_000, () => {
      r = parseCSSDeclarations(
        'background: url(data:image/svg+xml;base64,PHN2Zz4=); color: red; flex: 1;'
      );
    });
    bench('50 declarations', 50_000, () => {
      r = parseCSSDeclarations(
        Array.from({ length: 50 }, (_, i) => `prop-${i}: value-${i}`).join('; ')
      );
    });
  });
});

describe('native render benchmarks', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('single component render', () => {
    const Simple = styled.View`
      color: red;
      font-size: 14px;
      padding-top: 10px;
    `;
    const Dynamic = styled.View<{ $color?: string; $size?: string; $padding?: string }>`
      color: ${(p: any) => p.$color || 'red'};
      font-size: ${(p: any) => p.$size || '14px'};
      padding-top: ${(p: any) => p.$padding || '8px'};
    `;
    const WithAttrs = styled.View.attrs({ accessibilityRole: 'button' as const })`
      color: red;
      padding-top: 10px;
    `;
    const Extended = styled(Simple)`
      font-weight: bold;
    `;

    console.log('\n--- Single component render (10K iterations, median of 5) ---');
    bench('static component', 10_000, () => {
      const t = TestRenderer.create(React.createElement(Simple));
      t.unmount();
    });
    bench('dynamic (3 interpolations)', 10_000, i => {
      const t = TestRenderer.create(
        React.createElement(Dynamic, {
          $color: i % 3 ? 'red' : 'blue',
          $size: i % 2 ? '14px' : '16px',
          $padding: '8px',
        })
      );
      t.unmount();
    });
    bench('component with attrs', 10_000, () => {
      const t = TestRenderer.create(React.createElement(WithAttrs));
      t.unmount();
    });
    bench('extended component (1 level)', 10_000, () => {
      const t = TestRenderer.create(React.createElement(Extended));
      t.unmount();
    });
  });

  it('parent re-render (children props unchanged)', () => {
    const StaticChild = styled.View`
      color: red;
      font-size: 14px;
    `;
    const DynamicChild = styled.View<{ $color?: string; $size?: string; $padding?: string }>`
      color: ${(p: any) => p.$color || 'red'};
      font-size: ${(p: any) => p.$size || '14px'};
      padding-top: ${(p: any) => p.$padding || '8px'};
    `;

    function StaticParent({ count, n }: { count: number; n: number }) {
      const children = [];
      for (let i = 0; i < n; i++) children.push(React.createElement(StaticChild, { key: i }));
      return React.createElement(View, { accessibilityLabel: String(count) }, ...children);
    }

    function DynamicParent({ count, n }: { count: number; n: number }) {
      const children = [];
      for (let i = 0; i < n; i++) {
        children.push(
          React.createElement(DynamicChild, {
            key: i,
            $color: 'red',
            $size: '14px',
            $padding: '8px',
          })
        );
      }
      return React.createElement(View, { accessibilityLabel: String(count) }, ...children);
    }

    console.log('\n--- Parent re-render, children unchanged (median of 5) ---');

    let renderer = TestRenderer.create(React.createElement(StaticParent, { count: 0, n: 50 }));
    bench('50 static children, parent re-render', 5_000, i => {
      renderer.update(React.createElement(StaticParent, { count: i, n: 50 }));
    });
    renderer.unmount();

    renderer = TestRenderer.create(React.createElement(DynamicParent, { count: 0, n: 50 }));
    bench('50 dynamic children, parent re-render', 5_000, i => {
      renderer.update(React.createElement(DynamicParent, { count: i, n: 50 }));
    });
    renderer.unmount();
  });

  it('parent re-render (children cycling 30 colors)', () => {
    const DynamicChild = styled.View<{ $color?: string; $size?: string; $padding?: string }>`
      color: ${(p: any) => p.$color || 'red'};
      font-size: ${(p: any) => p.$size || '14px'};
      padding-top: ${(p: any) => p.$padding || '8px'};
    `;

    function CyclingParent({ count, n }: { count: number; n: number }) {
      const children = [];
      for (let i = 0; i < n; i++) {
        children.push(
          React.createElement(DynamicChild, {
            key: i,
            $color: COLORS[(i + count) % 30],
            $size: '14px',
            $padding: '8px',
          })
        );
      }
      return React.createElement(View, null, ...children);
    }

    console.log('\n--- Parent re-render, cycling 30 colors (median of 5) ---');

    let renderer = TestRenderer.create(React.createElement(CyclingParent, { count: 0, n: 50 }));
    bench('50 children cycling colors', 2_000, i => {
      renderer.update(React.createElement(CyclingParent, { count: i, n: 50 }));
    });
    renderer.unmount();

    renderer = TestRenderer.create(React.createElement(CyclingParent, { count: 0, n: 100 }));
    bench('100 children cycling colors', 1_000, i => {
      renderer.update(React.createElement(CyclingParent, { count: i, n: 100 }));
    });
    renderer.unmount();
  });

  it('siblings at scale', () => {
    const Simple = styled.View`
      color: red;
      font-size: 14px;
    `;

    console.log('\n--- Siblings (median of 5) ---');
    bench('10 siblings', 5_000, () => {
      const els = [];
      for (let i = 0; i < 10; i++) els.push(React.createElement(Simple, { key: i }));
      const t = TestRenderer.create(React.createElement(View, null, ...els));
      t.unmount();
    });
    bench('50 siblings', 1_000, () => {
      const els = [];
      for (let i = 0; i < 50; i++) els.push(React.createElement(Simple, { key: i }));
      const t = TestRenderer.create(React.createElement(View, null, ...els));
      t.unmount();
    });
    bench('100 siblings', 500, () => {
      const els = [];
      for (let i = 0; i < 100; i++) els.push(React.createElement(Simple, { key: i }));
      const t = TestRenderer.create(React.createElement(View, null, ...els));
      t.unmount();
    });
  });
});
