/**
 * Integrated stress benchmarks for styled-components (react-test-renderer).
 *
 * Run this file only (with reduced iterations for faster / CI-friendly runs):
 *   pnpm --filter styled-components bench:web:stress
 *
 * Full web bench suite (parser, preprocess, v6 vs v7, responsive, etc.):
 *   pnpm --filter styled-components bench:web
 *
 * Optional env (see bench-utils.ts): SC_BENCH_ITER_SCALE, SC_BENCH_RUNS
 *
 * Runs in NODE_ENV=production (via setup.js) so isStatic fast-paths
 * activate and results reflect real-world performance.
 *
 * Sections:
 *   - creation at scale: cost of styled() / attrs / extension factories
 *   - render at scale: mount/unmount, siblings, parent re-renders, attrs at 1K–10K children
 *   - 10K decomposition: isolate createElement vs reconcile vs SC render vs forwardRef baseline
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const styledMod = require('../../src');
const styled = styledMod.default || styledMod;
const { bench: _bench, COLORS } = require('./bench-utils');

const webOpts = { runs: 3, nameWidth: 50 };
const bench = (name, iterations, fn) => _bench(name, iterations, fn, webOpts);

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

  it('10K decomposition (cache-miss cycling colors)', () => {
    const N = 10_000;
    const ITERS = 50;

    console.log('\n--- 10K decomposition (cache-miss, cycling 30 colors) ---');

    // 1. React.createElement cost alone (no rendering)
    bench('createElement 10K elements', ITERS, count => {
      for (let i = 0; i < N; i++) {
        React.createElement('div', {
          key: i,
          style: { color: COLORS[(i + count) % 30] },
        });
      }
    });

    // 2. React reconciliation: plain divs, no styled-components
    function PlainParent({ count }) {
      const children = [];
      for (let i = 0; i < N; i++) {
        children.push(
          React.createElement('div', {
            key: i,
            style: { color: COLORS[(i + count) % 30] },
          })
        );
      }
      return React.createElement('div', null, ...children);
    }
    let renderer = TestRenderer.create(React.createElement(PlainParent, { count: 0 }));
    bench('React reconcile 10K plain divs', ITERS, i => {
      renderer.update(React.createElement(PlainParent, { count: i }));
    });
    renderer.unmount();

    // 3. styled-components: full render (the number we're decomposing)
    const SCDiv = styled.div`
      color: ${p => p.$color || 'red'};
    `;
    function SCParent({ count }) {
      const children = [];
      for (let i = 0; i < N; i++) {
        children.push(
          React.createElement(SCDiv, {
            key: i,
            $color: COLORS[(i + count) % 30],
          })
        );
      }
      return React.createElement('div', null, ...children);
    }
    renderer = TestRenderer.create(React.createElement(SCParent, { count: 0 }));
    const scTotal = bench('SC full render 10K cycling', ITERS, i => {
      renderer.update(React.createElement(SCParent, { count: i }));
    });
    renderer.unmount();

    // 4. Isolate SC overhead: styled(ForwardRef) wrapper that does nothing
    // (measures React.forwardRef + hook overhead without style computation)
    const NoopStyled = React.forwardRef(function NoopStyled(props, ref) {
      React.useContext(styledMod.ThemeContext || React.createContext({}));
      React.useRef(null);
      const out = {};
      for (const key in props) {
        if (key[0] !== '$' && key !== 'as' && key !== 'theme') out[key] = props[key];
      }
      if (ref) out.ref = ref;
      out.className = 'sc-noop sc-abc';
      return React.createElement('div', out);
    });
    function NoopParent({ count }) {
      const children = [];
      for (let i = 0; i < N; i++) {
        children.push(
          React.createElement(NoopStyled, {
            key: i,
            $color: COLORS[(i + count) % 30],
          })
        );
      }
      return React.createElement('div', null, ...children);
    }
    renderer = TestRenderer.create(React.createElement(NoopParent, { count: 0 }));
    bench('React forwardRef+hooks 10K (no style)', ITERS, i => {
      renderer.update(React.createElement(NoopParent, { count: i }));
    });
    renderer.unmount();

    // 5. Just the interpolation function calls (the irreducible minimum)
    const interpolationFn = p => p.$color || 'red';
    bench('interpolation fn 10K calls', ITERS, count => {
      for (let i = 0; i < N; i++) {
        interpolationFn({ $color: COLORS[(i + count) % 30] });
      }
    });

    // 6. resolveContext equivalent: object spread + theme
    bench('object spread (props+theme) 10K', ITERS, count => {
      for (let i = 0; i < N; i++) {
        const props = { $color: COLORS[(i + count) % 30] };
        const ctx = { ...props, className: undefined, theme: {} };
        r = ctx;
      }
    });

    // 7. buildPropsForElement equivalent: iterate+filter context keys
    const sampleCtx = { $color: 'red', theme: {}, className: undefined };
    bench('props filtering 10K iterations', ITERS, () => {
      for (let i = 0; i < N; i++) {
        const out = {};
        for (const key in sampleCtx) {
          if (sampleCtx[key] === undefined) continue;
          if (key[0] === '$' || key === 'as' || key === 'theme') continue;
          out[key] = sampleCtx[key];
        }
        r = out;
      }
    });

    console.log('\n  Budget breakdown (subtract bottom-up to find where time goes):');
    console.log('  SC total - forwardRef baseline = SC style overhead');
    console.log('  forwardRef baseline - plain divs = React component wrapper cost');
    console.log('  plain divs - createElement = React reconciliation cost');
  });
});
