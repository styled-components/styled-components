/**
 * Direct v6.4.1 vs v7 (current) comparison — component creation + render.
 *
 * Uses `compareBench` from bench-utils which interleaves A/B samples per
 * run, giving both functions parity on warmup + heap state + GC cycles.
 * Removes the systemic bias of running one fully before the other.
 *
 * Uses the `styled-components-v6` alias from benchmarks/package.json
 * (aliased to styled-components@6.4.1). NODE_ENV=production via bench setup.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const v7Mod = require('../../src');
const v7 = v7Mod.default || v7Mod;
const v6Mod = require('styled-components-v6');
const v6 = v6Mod.default || v6Mod;
const { compareBench } = require('./bench-utils');

describe('v6 vs v7 comparison', () => {
  it('component creation', () => {
    compareBench(
      'create: styled.div static',
      100_000,
      {
        name: 'v6 (6.4.1)',
        fn: () => v6.div`
          color: red;
          font-size: 14px;
        `,
      },
      {
        name: 'v7',
        fn: () => v7.div`
          color: red;
          font-size: 14px;
        `,
      },
      { label: '\n--- Creation: styled.div static ---' }
    );

    compareBench(
      'create: styled.div with interpolation',
      100_000,
      {
        name: 'v6 (6.4.1)',
        fn: i => v6.div`
          color: ${i % 2 ? 'red' : 'blue'};
        `,
      },
      {
        name: 'v7',
        fn: i => v7.div`
          color: ${i % 2 ? 'red' : 'blue'};
        `,
      },
      { label: '\n--- Creation: styled.div with interpolation ---' }
    );

    compareBench(
      'create: styled(Base) extension',
      100_000,
      {
        name: 'v6 (6.4.1)',
        fn: () => {
          const B = v6.div`
            color: red;
          `;
          return v6(B)`
            font-weight: bold;
          `;
        },
      },
      {
        name: 'v7',
        fn: () => {
          const B = v7.div`
            color: red;
          `;
          return v7(B)`
            font-weight: bold;
          `;
        },
      },
      { label: '\n--- Creation: styled(Base) extension ---' }
    );
  });

  it('initial render', () => {
    const V6Static = v6.div`
      color: red;
      padding: 8px;
    `;
    const V7Static = v7.div`
      color: red;
      padding: 8px;
    `;

    compareBench(
      'mount: static div',
      30_000,
      {
        name: 'v6 (6.4.1)',
        fn: () => TestRenderer.create(React.createElement(V6Static)).unmount(),
      },
      {
        name: 'v7',
        fn: () => TestRenderer.create(React.createElement(V7Static)).unmount(),
      },
      { label: '\n--- Initial render: static div ---' }
    );

    const V6Dyn = v6.div`
      color: ${p => p.$color};
      padding: 8px;
    `;
    const V7Dyn = v7.div`
      color: ${p => p.$color};
      padding: 8px;
    `;
    compareBench(
      'mount: dynamic prop',
      30_000,
      {
        name: 'v6 (6.4.1)',
        fn: i =>
          TestRenderer.create(
            React.createElement(V6Dyn, { $color: i % 2 ? 'red' : 'blue' })
          ).unmount(),
      },
      {
        name: 'v7',
        fn: i =>
          TestRenderer.create(
            React.createElement(V7Dyn, { $color: i % 2 ? 'red' : 'blue' })
          ).unmount(),
      },
      { label: '\n--- Initial render: dynamic prop ---' }
    );
  });

  it('re-render (cache-hit hot path)', () => {
    const V6 = v6.div`
      color: ${p => p.$color};
      padding: 8px;
    `;
    const V7 = v7.div`
      color: ${p => p.$color};
      padding: 8px;
    `;

    // Re-usable trees — compareBench doesn't expose setup hooks, so each
    // iteration's `fn` receives `i` and does update() in-place. Trees are
    // created ONCE per describe block and reused across all samples.
    const v6Tree = TestRenderer.create(React.createElement(V6, { $color: 'init' }));
    const v7Tree = TestRenderer.create(React.createElement(V7, { $color: 'init' }));

    compareBench(
      'update: cycling 30 colors',
      60_000,
      {
        name: 'v6 (6.4.1)',
        fn: i => v6Tree.update(React.createElement(V6, { $color: 'c' + (i % 30) })),
      },
      {
        name: 'v7',
        fn: i => v7Tree.update(React.createElement(V7, { $color: 'c' + (i % 30) })),
      },
      { label: '\n--- Re-render: cycling 30 colors ---' }
    );

    compareBench(
      'update: stable prop (cache hit)',
      150_000,
      {
        name: 'v6 (6.4.1)',
        fn: () => v6Tree.update(React.createElement(V6, { $color: 'red' })),
      },
      {
        name: 'v7',
        fn: () => v7Tree.update(React.createElement(V7, { $color: 'red' })),
      },
      { label: '\n--- Re-render: stable prop (cache hit) ---' }
    );

    v6Tree.unmount();
    v7Tree.unmount();
  });
});
