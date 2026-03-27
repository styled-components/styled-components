/**
 * Integrated stress benchmarks for styled-components.
 *
 * Run: pnpm --filter styled-components bench
 *
 * Runs in NODE_ENV=production (via setup.js) so isStatic fast-paths
 * activate and results reflect real-world performance.
 */

const { performance } = require('perf_hooks');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const styledMod = require('../../src');
const styled = styledMod.default || styledMod;

// Expose GC if available (node --expose-gc)
const gc = typeof globalThis.gc === 'function' ? globalThis.gc : null;

function bench(name, iterations, fn) {
  // Force GC before measurement to reduce mid-run pauses
  if (gc) gc();

  // Warmup: run enough iterations for V8 to JIT-optimize
  const warmup = Math.min(Math.max(iterations / 10, 100), 1000);
  for (let i = 0; i < warmup; i++) fn(i);

  // Multiple samples for stability
  const samples = [];
  const RUNS = 3;
  for (let run = 0; run < RUNS; run++) {
    if (gc) gc();
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) fn(i);
    samples.push(performance.now() - t0);
  }

  // Use median to reduce GC spike impact
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(RUNS / 2)];
  const ops = (iterations / median) * 1000;
  const opsStr =
    ops >= 1e6
      ? (ops / 1e6).toFixed(1) + 'M/s'
      : ops >= 1e3
        ? (ops / 1e3).toFixed(1) + 'K/s'
        : ops.toFixed(0) + '/s';
  const spread = (((samples[RUNS - 1] - samples[0]) / median) * 100).toFixed(0);
  console.log(
    `  ${name.padEnd(50)} ${median.toFixed(1).padStart(8)}ms  ${opsStr.padStart(10)}  ±${spread}%`
  );
  return median;
}

let r;

describe('stress benchmarks', () => {
  it('creation at scale', () => {
    console.log('\n--- Creation (100K iterations, median of 3) ---');
    // Reduced from 500K to avoid Map maximum size with 3 runs + warmup
    bench('styled.div static', 100_000, () => {
      r = styled.div`
        color: red;
        font-size: 14px;
      `;
    });
    bench('styled.div with interpolation', 100_000, i => {
      r = styled.div`
        color: ${i % 2 ? 'red' : 'blue'};
        font-size: 14px;
      `;
    });
    bench('styled.div with attrs', 100_000, () => {
      r = styled.div.attrs({ role: 'button' })`
        color: red;
      `;
    });
    bench('styled(Component) extension', 100_000, () => {
      const Base = styled.div`
        color: red;
      `;
      r = styled(Base)`
        font-weight: bold;
      `;
    });
    bench('3-level attrs chain', 100_000, () => {
      r = styled.div
        .attrs({ role: 'button' })
        .attrs({ tabIndex: 0 })
        .attrs({ 'aria-label': 'test' })`color: red;`;
    });
  });

  it('render at scale', () => {
    const Simple = styled.div`
      color: red;
      font-size: 14px;
      margin: 0;
    `;
    const Dynamic = styled.div`
      color: ${p => p.$color || 'red'};
      font-size: ${p => p.$size || '14px'};
      margin: ${p => p.$margin || '0'};
      padding: ${p => p.$padding || '8px'};
      border: ${p => p.$border || 'none'};
    `;
    const WithAttrs = styled.div.attrs({ role: 'button', tabIndex: 0 })`
      color: red;
      cursor: pointer;
    `;
    const Extended = styled(Simple)`
      font-weight: bold;
    `;
    const DeepExtended = styled(Extended)`
      text-decoration: underline;
    `;
    const Parent = styled.div`
      display: flex;
    `;
    const Child = styled.div`
      color: blue;
    `;

    console.log('\n--- Render (50K iterations, median of 3) ---');
    bench('static component', 50_000, () => {
      const t = TestRenderer.create(React.createElement(Simple));
      t.unmount();
    });
    bench('dynamic (5 interpolations)', 50_000, i => {
      const t = TestRenderer.create(
        React.createElement(Dynamic, {
          $color: i % 3 ? 'red' : 'blue',
          $size: i % 2 ? '14px' : '16px',
          $margin: '0',
          $padding: '8px',
          $border: 'none',
        })
      );
      t.unmount();
    });
    bench('component with attrs', 50_000, () => {
      const t = TestRenderer.create(React.createElement(WithAttrs));
      t.unmount();
    });
    bench('extended component (1 level)', 50_000, () => {
      const t = TestRenderer.create(React.createElement(Extended));
      t.unmount();
    });
    bench('extended component (2 levels)', 50_000, () => {
      const t = TestRenderer.create(React.createElement(DeepExtended));
      t.unmount();
    });
    bench('nested (parent + child)', 50_000, () => {
      const t = TestRenderer.create(React.createElement(Parent, null, React.createElement(Child)));
      t.unmount();
    });

    console.log('\n--- Many siblings ---');
    bench('10 siblings', 5_000, () => {
      const els = [];
      for (let i = 0; i < 10; i++) els.push(React.createElement(Simple, { key: i }));
      const t = TestRenderer.create(React.createElement('div', null, ...els));
      t.unmount();
    });
    bench('50 siblings', 1_000, () => {
      const els = [];
      for (let i = 0; i < 50; i++) els.push(React.createElement(Simple, { key: i }));
      const t = TestRenderer.create(React.createElement('div', null, ...els));
      t.unmount();
    });
    bench('100 siblings', 500, () => {
      const els = [];
      for (let i = 0; i < 100; i++) els.push(React.createElement(Simple, { key: i }));
      const t = TestRenderer.create(React.createElement('div', null, ...els));
      t.unmount();
    });

    console.log('\n--- Dynamic siblings (unique CSS per component) ---');
    bench('50 dynamic siblings', 500, i => {
      const els = [];
      for (let j = 0; j < 50; j++) {
        els.push(
          React.createElement(Dynamic, {
            key: j,
            $color: j % 3 === 0 ? 'red' : j % 3 === 1 ? 'blue' : 'green',
            $size: 12 + (j % 4) + 'px',
          })
        );
      }
      const t = TestRenderer.create(React.createElement('div', null, ...els));
      t.unmount();
    });

    console.log('\n--- Parent re-render (children props unchanged) ---');
    const StaticChild = styled.div`
      color: red;
      font-size: 14px;
    `;
    const DynamicChild = styled.div`
      color: ${p => p.$color || 'red'};
      font-size: ${p => p.$size || '14px'};
      padding: ${p => p.$padding || '8px'};
    `;

    function StaticParent({ count, n }) {
      const children = [];
      for (let i = 0; i < n; i++) {
        children.push(React.createElement(StaticChild, { key: i }));
      }
      return React.createElement('div', { 'data-count': count }, ...children);
    }

    function DynamicParent({ count, n }) {
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
      return React.createElement('div', { 'data-count': count }, ...children);
    }

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

    renderer = TestRenderer.create(React.createElement(DynamicParent, { count: 0, n: 100 }));
    bench('100 dynamic children, parent re-render', 2_000, i => {
      renderer.update(React.createElement(DynamicParent, { count: i, n: 100 }));
    });
    renderer.unmount();

    console.log('\n--- Parent re-render (children props cycling 30 colors) ---');
    const COLORS = [
      '#e63946',
      '#f1faee',
      '#a8dadc',
      '#457b9d',
      '#1d3557',
      '#264653',
      '#2a9d8f',
      '#e9c46a',
      '#f4a261',
      '#e76f51',
      '#606c38',
      '#283618',
      '#fefae0',
      '#dda15e',
      '#bc6c25',
      '#cdb4db',
      '#ffc8dd',
      '#ffafcc',
      '#bde0fe',
      '#a2d2ff',
      '#d8e2dc',
      '#ffe5d9',
      '#ffcad4',
      '#f4acb7',
      '#9d8189',
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#ffeaa7',
    ];

    function CyclingParent({ count, n }) {
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
      return React.createElement('div', null, ...children);
    }

    renderer = TestRenderer.create(React.createElement(CyclingParent, { count: 0, n: 50 }));
    bench('50 children cycling 30 colors', 2_000, i => {
      renderer.update(React.createElement(CyclingParent, { count: i, n: 50 }));
    });
    renderer.unmount();

    renderer = TestRenderer.create(React.createElement(CyclingParent, { count: 0, n: 100 }));
    bench('100 children cycling 30 colors', 1_000, i => {
      renderer.update(React.createElement(CyclingParent, { count: i, n: 100 }));
    });
    renderer.unmount();

    console.log('\n--- Attrs overhead at scale (cycling colors, cache miss) ---');
    const NoAttrs = styled.div`
      color: ${p => p.$color || 'red'};
    `;
    const StaticAttrs = styled.div.attrs({ role: 'button', tabIndex: 0 })`
      color: ${p => p.$color || 'red'};
    `;
    const FnAttrs = styled.div.attrs(p => ({ 'data-color': p.$color }))`
      color: ${p => p.$color || 'red'};
    `;
    const ThreeLevelAttrs = styled.div
      .attrs({ role: 'button' })
      .attrs({ tabIndex: 0 })
      .attrs(p => ({ 'aria-label': p.$color }))`
      color: ${p => p.$color || 'red'};
    `;

    function AttrsParent({ count, n, Comp }) {
      const children = [];
      for (let i = 0; i < n; i++) {
        children.push(
          React.createElement(Comp, {
            key: i,
            $color: COLORS[(i + count) % 30],
          })
        );
      }
      return React.createElement('div', null, ...children);
    }

    for (const [label, Comp] of [
      ['no attrs', NoAttrs],
      ['static attrs', StaticAttrs],
      ['fn attrs', FnAttrs],
      ['3-level attrs', ThreeLevelAttrs],
    ]) {
      renderer = TestRenderer.create(React.createElement(AttrsParent, { count: 0, n: 1000, Comp }));
      bench(`1K children, ${label}, cycling colors`, 500, i => {
        renderer.update(React.createElement(AttrsParent, { count: i, n: 1000, Comp }));
      });
      renderer.unmount();
    }

    for (const [label, Comp] of [
      ['no attrs', NoAttrs],
      ['3-level attrs', ThreeLevelAttrs],
    ]) {
      renderer = TestRenderer.create(React.createElement(AttrsParent, { count: 0, n: 5000, Comp }));
      bench(`5K children, ${label}, cycling colors`, 100, i => {
        renderer.update(React.createElement(AttrsParent, { count: i, n: 5000, Comp }));
      });
      renderer.unmount();
    }

    renderer = TestRenderer.create(
      React.createElement(AttrsParent, { count: 0, n: 10000, Comp: NoAttrs })
    );
    bench('10K children, no attrs, cycling colors', 50, i => {
      renderer.update(React.createElement(AttrsParent, { count: i, n: 10000, Comp: NoAttrs }));
    });
    renderer.unmount();

    renderer = TestRenderer.create(
      React.createElement(AttrsParent, { count: 0, n: 10000, Comp: ThreeLevelAttrs })
    );
    bench('10K children, 3-level attrs, cycling colors', 50, i => {
      renderer.update(
        React.createElement(AttrsParent, { count: i, n: 10000, Comp: ThreeLevelAttrs })
      );
    });
    renderer.unmount();

    console.log('\n--- Deep nesting ---');
    bench('5-level nesting', 5_000, () => {
      const t = TestRenderer.create(
        React.createElement(
          Parent,
          null,
          React.createElement(
            Child,
            null,
            React.createElement(
              Extended,
              null,
              React.createElement(Simple, null, React.createElement(DeepExtended))
            )
          )
        )
      );
      t.unmount();
    });
  });
});
