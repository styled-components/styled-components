/**
 * Integrated stress benchmarks for styled-components, rendered through
 * react-dom (`createRoot` into a detached container, every create, update and
 * unmount wrapped in `flushSync` so it commits before the call returns).
 *
 * Run this file only (with reduced iterations for faster / CI-friendly runs):
 *   pnpm --filter styled-components bench:web:stress
 *
 * Full web bench suite:
 *   pnpm --filter styled-components bench:web
 *
 * Optional env (see bench-utils.ts): SC_BENCH_ITER_SCALE, SC_BENCH_RUNS
 *
 * Runs in NODE_ENV=production (via setup.js) so isStatic fast-paths
 * activate and results reflect real-world performance.
 *
 * A render row whose interpolations must run throws if none ran, and a mount
 * that commits no DOM throws, so a row that did no work fails the file.
 *
 * Sections:
 *   - creation at scale: cost of styled() / attrs / extension factories
 *   - render at scale: mount/unmount, siblings, parent re-renders, attrs at 1K–10K children
 *   - 10K decomposition: isolate createElement vs reconcile vs SC render vs forwardRef baseline
 *   - arity-2 attrs render: a statically planned callback vs one that reads props
 *
 * A row reads slower the more benches ran before it in the same process, so
 * compare a row across trees only when both run the same copy of this file in
 * its own jest process, and add new rows at the end.
 */

const React = require('react');
const { flushSync } = require('react-dom');
const { createRoot } = require('react-dom/client');
const styledMod = require('../../src');
const styled = styledMod.default || styledMod;
const { bench: _bench, COLORS } = require('./bench-utils');

const webOpts = { runs: 3, nameWidth: 50 };
const bench = (name, iterations, fn) => _bench(name, iterations, fn, webOpts);

let r;
let interpolationCalls = 0;

/** Wraps a one-parameter interpolation so a row can prove it ran, keeping its arity. */
const counted = fn => p => {
  interpolationCalls++;
  return fn(p);
};

/**
 * Times a render row. With `interpolates`, throws if the timed loop ran no
 * interpolation, which means the render never executed.
 */
const benchRender = (name, iterations, fn, { interpolates = false } = {}) => {
  const callsBefore = interpolationCalls;

  try {
    bench(name, iterations, fn);
  } catch (cause) {
    throw new Error(`bench row "${name}" failed: ${cause.message}`, { cause });
  }

  if (interpolates && interpolationCalls === callsBefore) {
    throw new Error(`bench row "${name}" ran no interpolations; its renders did not execute`);
  }
};

/** Commits `element` into a fresh detached root before returning. */
const mount = element => {
  const container = document.createElement('div');
  const root = createRoot(container);

  flushSync(() => root.render(element));

  if (container.firstChild === null) {
    throw new Error('bench mount committed no DOM; the render did not execute');
  }

  return { root };
};

/** Commits `element` into an existing root before returning. */
const update = (mounted, element) => {
  flushSync(() => mounted.root.render(element));
};

const unmount = mounted => {
  flushSync(() => mounted.root.unmount());
};

/** Mounts and unmounts `element`, leaving no root behind. */
const mountAndUnmount = element => {
  unmount(mount(element));
};

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
      color: ${counted(p => p.$color || 'red')};
      font-size: ${counted(p => p.$size || '14px')};
      margin: ${counted(p => p.$margin || '0')};
      padding: ${counted(p => p.$padding || '8px')};
      border: ${counted(p => p.$border || 'none')};
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

    console.log('\n--- Render (mount + unmount, median of 3) ---');
    benchRender('static component', 2_500, () => {
      mountAndUnmount(React.createElement(Simple));
    });
    benchRender(
      'dynamic (5 interpolations)',
      2_500,
      i => {
        mountAndUnmount(
          React.createElement(Dynamic, {
            $color: i % 3 ? 'red' : 'blue',
            $size: i % 2 ? '14px' : '16px',
            $margin: '0',
            $padding: '8px',
            $border: 'none',
          })
        );
      },
      { interpolates: true }
    );
    benchRender('component with attrs', 2_500, () => {
      mountAndUnmount(React.createElement(WithAttrs));
    });
    benchRender('extended component (1 level)', 2_500, () => {
      mountAndUnmount(React.createElement(Extended));
    });
    benchRender('extended component (2 levels)', 2_500, () => {
      mountAndUnmount(React.createElement(DeepExtended));
    });
    benchRender('nested (parent + child)', 2_500, () => {
      mountAndUnmount(React.createElement(Parent, null, React.createElement(Child)));
    });

    console.log('\n--- Many siblings ---');
    benchRender('10 siblings', 500, () => {
      const els = [];
      for (let i = 0; i < 10; i++) els.push(React.createElement(Simple, { key: i }));
      mountAndUnmount(React.createElement('div', null, ...els));
    });
    benchRender('50 siblings', 300, () => {
      const els = [];
      for (let i = 0; i < 50; i++) els.push(React.createElement(Simple, { key: i }));
      mountAndUnmount(React.createElement('div', null, ...els));
    });
    benchRender('100 siblings', 150, () => {
      const els = [];
      for (let i = 0; i < 100; i++) els.push(React.createElement(Simple, { key: i }));
      mountAndUnmount(React.createElement('div', null, ...els));
    });

    console.log('\n--- Dynamic siblings (unique CSS per component) ---');
    benchRender(
      '50 dynamic siblings',
      100,
      () => {
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
        mountAndUnmount(React.createElement('div', null, ...els));
      },
      { interpolates: true }
    );

    console.log('\n--- Parent re-render (equal props, React.memo bailout) ---');
    const StaticChild = styled.div`
      color: red;
      font-size: 14px;
    `;
    const DynamicChild = styled.div`
      color: ${counted(p => p.$color || 'red')};
      font-size: ${counted(p => p.$size || '14px')};
      padding: ${counted(p => p.$padding || '8px')};
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

    let mounted = mount(React.createElement(StaticParent, { count: 0, n: 50 }));
    benchRender('50 static children, equal props (memo)', 500, i => {
      update(mounted, React.createElement(StaticParent, { count: i, n: 50 }));
    });
    unmount(mounted);

    mounted = mount(React.createElement(DynamicParent, { count: 0, n: 50 }));
    benchRender('50 dynamic children, equal props (memo)', 500, i => {
      update(mounted, React.createElement(DynamicParent, { count: i, n: 50 }));
    });
    unmount(mounted);

    mounted = mount(React.createElement(DynamicParent, { count: 0, n: 100 }));
    benchRender('100 dynamic children, equal props (memo)', 250, i => {
      update(mounted, React.createElement(DynamicParent, { count: i, n: 100 }));
    });
    unmount(mounted);

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

    mounted = mount(React.createElement(CyclingParent, { count: 0, n: 50 }));
    benchRender(
      '50 children cycling 30 colors',
      300,
      i => {
        update(mounted, React.createElement(CyclingParent, { count: i, n: 50 }));
      },
      { interpolates: true }
    );
    unmount(mounted);

    mounted = mount(React.createElement(CyclingParent, { count: 0, n: 100 }));
    benchRender(
      '100 children cycling 30 colors',
      150,
      i => {
        update(mounted, React.createElement(CyclingParent, { count: i, n: 100 }));
      },
      { interpolates: true }
    );
    unmount(mounted);

    console.log('\n--- Attrs overhead at scale (cycling colors, cache miss) ---');
    const NoAttrs = styled.div`
      color: ${counted(p => p.$color || 'red')};
    `;
    const StaticAttrs = styled.div.attrs({ role: 'button', tabIndex: 0 })`
      color: ${counted(p => p.$color || 'red')};
    `;
    const FnAttrs = styled.div.attrs(p => ({ 'data-color': p.$color }))`
      color: ${counted(p => p.$color || 'red')};
    `;
    const ThreeLevelAttrs = styled.div
      .attrs({ role: 'button' })
      .attrs({ tabIndex: 0 })
      .attrs(p => ({ 'aria-label': p.$color }))`
      color: ${counted(p => p.$color || 'red')};
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
      mounted = mount(React.createElement(AttrsParent, { count: 0, n: 1000, Comp }));
      benchRender(
        `1K children, ${label}, cycling colors`,
        100,
        i => {
          update(mounted, React.createElement(AttrsParent, { count: i, n: 1000, Comp }));
        },
        { interpolates: true }
      );
      unmount(mounted);
    }

    for (const [label, Comp] of [
      ['no attrs', NoAttrs],
      ['3-level attrs', ThreeLevelAttrs],
    ]) {
      mounted = mount(React.createElement(AttrsParent, { count: 0, n: 5000, Comp }));
      benchRender(
        `5K children, ${label}, cycling colors`,
        20,
        i => {
          update(mounted, React.createElement(AttrsParent, { count: i, n: 5000, Comp }));
        },
        { interpolates: true }
      );
      unmount(mounted);
    }

    mounted = mount(React.createElement(AttrsParent, { count: 0, n: 10000, Comp: NoAttrs }));
    benchRender(
      '10K children, no attrs, cycling colors',
      10,
      i => {
        update(mounted, React.createElement(AttrsParent, { count: i, n: 10000, Comp: NoAttrs }));
      },
      { interpolates: true }
    );
    unmount(mounted);

    mounted = mount(
      React.createElement(AttrsParent, { count: 0, n: 10000, Comp: ThreeLevelAttrs })
    );
    benchRender(
      '10K children, 3-level attrs, cycling colors',
      10,
      i => {
        update(
          mounted,
          React.createElement(AttrsParent, { count: i, n: 10000, Comp: ThreeLevelAttrs })
        );
      },
      { interpolates: true }
    );
    unmount(mounted);

    console.log('\n--- Deep nesting ---');
    benchRender('5-level nesting', 500, () => {
      mountAndUnmount(
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
    });

    console.log('\n--- Parent re-render (changing props or children) ---');

    function PropsChangeParent({ count, n }) {
      const children = [];
      for (let i = 0; i < n; i++) {
        children.push(
          React.createElement(DynamicChild, {
            key: i,
            $color: 'red',
            $size: '14px',
            $padding: `${count % 16}px`,
          })
        );
      }
      return React.createElement('div', null, ...children);
    }

    function ChildrenChangeParent({ count, n }) {
      const children = [];
      for (let i = 0; i < n; i++) {
        children.push(
          React.createElement(
            DynamicChild,
            { key: i, $color: 'red', $size: '14px', $padding: '8px' },
            count
          )
        );
      }
      return React.createElement('div', null, ...children);
    }

    mounted = mount(React.createElement(PropsChangeParent, { count: 0, n: 50 }));
    benchRender(
      '50 dynamic children, props change',
      300,
      i => {
        update(mounted, React.createElement(PropsChangeParent, { count: i, n: 50 }));
      },
      { interpolates: true }
    );
    unmount(mounted);

    mounted = mount(React.createElement(ChildrenChangeParent, { count: 0, n: 50 }));
    benchRender(
      '50 dynamic children, children change',
      300,
      i => {
        update(mounted, React.createElement(ChildrenChangeParent, { count: i, n: 50 }));
      },
      { interpolates: true }
    );
    unmount(mounted);
  });

  it('10K decomposition (cache-miss cycling colors)', () => {
    const N = 10_000;
    // Rendered rows are slow; the pure-JS rows take more iterations to read above timer noise.
    const ITERS = 10;
    const JS_ITERS = 500;

    console.log('\n--- 10K decomposition (cache-miss, cycling 30 colors) ---');

    // 1. React.createElement cost alone (no rendering)
    bench('createElement 10K elements', JS_ITERS, count => {
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
    let mounted = mount(React.createElement(PlainParent, { count: 0 }));
    bench('React reconcile 10K plain divs', ITERS, i => {
      update(mounted, React.createElement(PlainParent, { count: i }));
    });
    unmount(mounted);

    // 3. styled-components: full render (the number we're decomposing)
    const SCDiv = styled.div`
      color: ${counted(p => p.$color || 'red')};
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
    mounted = mount(React.createElement(SCParent, { count: 0 }));
    benchRender(
      'SC full render 10K cycling',
      ITERS,
      i => {
        update(mounted, React.createElement(SCParent, { count: i }));
      },
      { interpolates: true }
    );
    unmount(mounted);

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
    mounted = mount(React.createElement(NoopParent, { count: 0 }));
    bench('React forwardRef+hooks 10K (no style)', ITERS, i => {
      update(mounted, React.createElement(NoopParent, { count: i }));
    });
    unmount(mounted);

    // 5. Just the interpolation function calls (the irreducible minimum)
    const interpolationFn = p => p.$color || 'red';
    bench('interpolation fn 10K calls', JS_ITERS, count => {
      for (let i = 0; i < N; i++) {
        interpolationFn({ $color: COLORS[(i + count) % 30] });
      }
    });

    // 6. resolveContext equivalent: object spread + theme
    bench('object spread (props+theme) 10K', JS_ITERS, count => {
      for (let i = 0; i < N; i++) {
        const props = { $color: COLORS[(i + count) % 30] };
        const ctx = { ...props, className: undefined, theme: {} };
        r = ctx;
      }
    });

    // 7. buildPropsForElement equivalent: iterate+filter context keys
    const sampleCtx = { $color: 'red', theme: {}, className: undefined };
    bench('props filtering 10K iterations', JS_ITERS, () => {
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

  it('runtime hot path (no React)', () => {
    // Direct calls into webStyle.flush;the SC core hot path that runs
    // inside React's render. Strips React reconciliation out so the
    // measurement reflects styled-components' own work. React-inclusive
    // view lives in 'render at scale' above and packages/benchmarks.
    const { mainSheet, mainCompiler } = require('../models/StyleSheetManager');

    const Static = styled.div`
      color: red;
      padding: 8px;
    `;
    const Dynamic = styled.div`
      color: ${p => p.$color};
      padding: 8px;
    `;
    const staticCtx = {};
    const stableCtx = { $color: 'red' };
    const cyclingCtxs = COLORS.slice(0, 30).map(c => ({ $color: c }));
    const flushOpts = { runs: 9, nameWidth: 50 };

    console.log('\n--- Runtime hot path (webStyle.flush, no React) ---');

    _bench(
      'static, repeat call',
      200_000,
      () => {
        Static.webStyle.flush(staticCtx, mainSheet, mainCompiler);
      },
      flushOpts
    );

    _bench(
      'dynamic prop, stable value (interpKeyCache hit)',
      200_000,
      () => {
        Dynamic.webStyle.flush(stableCtx, mainSheet, mainCompiler);
      },
      flushOpts
    );

    _bench(
      'dynamic prop, cycling 30 values (warm cache)',
      100_000,
      i => {
        Dynamic.webStyle.flush(cyclingCtxs[i % 30], mainSheet, mainCompiler);
      },
      flushOpts
    );
  });

  it('arity-2 attrs render', () => {
    // A callback the construction-time trace folds into a static plan, and
    // one that reads props so it runs on every render miss.
    const PlannedPostAttrs = styled.div.attrs((_p, ast) => ({ 'data-tint': ast.pop('color') }))`
      color: red;
      cursor: pointer;
    `;
    // Written out rather than wrapped in `counted`: attrs reads the callback's arity.
    const LivePostAttrs = styled.div.attrs((p, ast) => {
      interpolationCalls++;
      return { 'data-tint': p.$on ? ast.pop('color') : 'off' };
    })`
      color: red;
      cursor: pointer;
    `;

    console.log('\n--- Arity-2 attrs render (mount + unmount, median of 3) ---');
    benchRender('arity-2 attrs, static plan (render miss)', 2_500, () => {
      mountAndUnmount(React.createElement(PlannedPostAttrs));
    });
    benchRender(
      'arity-2 attrs, live callback (render miss)',
      2_500,
      () => {
        mountAndUnmount(React.createElement(LivePostAttrs, { $on: true }));
      },
      { interpolates: true }
    );
  });
});
