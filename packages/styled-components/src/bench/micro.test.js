/**
 * Integrated stress benchmarks for styled-components.
 *
 * Run: pnpm --filter styled-components bench
 */

const { performance } = require('perf_hooks');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const styledMod = require('../../src');
const styled = styledMod.default || styledMod;

function bench(name, iterations, fn) {
  for (let i = 0; i < Math.min(1000, iterations); i++) fn(i);
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const elapsed = performance.now() - t0;
  const ops = (iterations / elapsed) * 1000;
  const opsStr =
    ops >= 1e6
      ? (ops / 1e6).toFixed(1) + 'M/s'
      : ops >= 1e3
        ? (ops / 1e3).toFixed(1) + 'K/s'
        : ops.toFixed(0) + '/s';
  console.log(`  ${name.padEnd(50)} ${elapsed.toFixed(1).padStart(8)}ms  ${opsStr}`);
  return elapsed;
}

let r;

describe('stress benchmarks', () => {
  it('creation at scale', () => {
    console.log('\n--- Creation (500K iterations) ---');
    bench('styled.div static', 500_000, () => {
      r = styled.div`
        color: red;
        font-size: 14px;
      `;
    });
    bench('styled.div with interpolation', 500_000, i => {
      r = styled.div`
        color: ${i % 2 ? 'red' : 'blue'};
        font-size: 14px;
      `;
    });
    bench('styled.div with attrs', 500_000, () => {
      r = styled.div.attrs({ role: 'button' })`
        color: red;
      `;
    });
    bench('styled(Component) extension', 500_000, () => {
      const Base = styled.div`
        color: red;
      `;
      r = styled(Base)`
        font-weight: bold;
      `;
    });
    bench('3-level attrs chain', 500_000, () => {
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

    console.log('\n--- Render (50K iterations) ---');
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
