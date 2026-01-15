/**
 * SSR Benchmark Suite
 * 
 * Compares styled-components workspace version vs published v6.
 * Run with: node --experimental-vm-modules ssr-benchmark.js
 */

const React = require('react');
const { renderToString } = require('react-dom/server');

// Import both versions
const styledWorkspace = require('styled-components').default;
const ServerStyleSheetWorkspace = require('styled-components').ServerStyleSheet;

const styledV6 = require('styled-components-v6').default;
const ServerStyleSheetV6 = require('styled-components-v6').ServerStyleSheet;

const ITERATIONS = 50;
const WARMUP_ITERATIONS = 5;

function createComponents(styled) {
  const View = styled.div`
    align-items: stretch;
    border: 0 solid black;
    box-sizing: border-box;
    display: flex;
    flex-basis: auto;
    flex-direction: column;
    flex-shrink: 0;
    margin: 0;
    min-height: 0;
    min-width: 0;
    padding: 0;
    position: relative;
    z-index: 0;
  `;

  const getColor = (color) => {
    switch (color) {
      case 0: return '#14171A';
      case 1: return '#AAB8C2';
      case 2: return '#E6ECF0';
      case 3: return '#FFAD1F';
      case 4: return '#F45D22';
      case 5: return '#E0245E';
      default: return 'transparent';
    }
  };

  const Box = styled(View)`
    align-self: flex-start;
    flex-direction: ${props => (props.layout === 'column' ? 'column' : 'row')};
    padding: ${props => (props.outer ? '4px' : '0')};
    ${props => props.fixed && 'height: 6px;'}
    ${props => props.fixed && 'width: 6px;'}
    background-color: ${props => getColor(props.color)};
  `;

  const Dot = styled.div`
    position: absolute;
    cursor: pointer;
    width: 0;
    height: 0;
    border-color: transparent;
    border-style: solid;
    border-top-width: 0;
    transform: translate(50%, 50%);
    margin-left: ${props => `${props.x}px`};
    margin-top: ${props => `${props.y}px`};
    border-right-width: ${props => `${props.size / 2}px`};
    border-bottom-width: ${props => `${props.size / 2}px`};
    border-left-width: ${props => `${props.size / 2}px`};
    border-bottom-color: ${props => props.color};
  `;

  return { View, Box, Dot };
}

function Tree({ breadth, depth, id, wrap, Box }) {
  let result = React.createElement(
    Box,
    { color: id % 3, layout: depth % 2 === 0 ? 'column' : 'row', outer: true },
    depth === 0
      ? React.createElement(Box, { color: (id % 3) + 3, fixed: true })
      : Array.from({ length: breadth }).map((_, i) =>
          React.createElement(Tree, {
            key: i,
            breadth,
            depth: depth - 1,
            id: i,
            wrap,
            Box,
          })
        )
  );

  for (let i = 0; i < wrap; i++) {
    result = React.createElement(Box, null, result);
  }
  return result;
}

function SierpinskiTriangle({ s, x, y, depth = 0, Dot }) {
  const targetSize = 10;

  if (s <= targetSize) {
    const colors = ['#9e0142', '#d53e4f', '#f46d43'];
    const color = colors[depth % 3];
    return React.createElement(Dot, {
      color,
      size: targetSize,
      x: x - targetSize / 2,
      y: y - targetSize / 2,
    });
  }

  const newS = s / 2;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(SierpinskiTriangle, { s: newS, x, y: y - newS / 2, depth: 1, Dot }),
    React.createElement(SierpinskiTriangle, { s: newS, x: x - newS, y: y + newS / 2, depth: 2, Dot }),
    React.createElement(SierpinskiTriangle, { s: newS, x: x + newS, y: y + newS / 2, depth: 3, Dot })
  );
}

function runBenchmark(name, fn, iterations = ITERATIONS) {
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }

  // Force GC if available
  if (global.gc) global.gc();

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const sorted = times.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return { name, median, mean, min, max, p95 };
}

function formatResults(results) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  ${results.name}`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`  Median: ${results.median.toFixed(2)}ms`);
  console.log(`  Mean:   ${results.mean.toFixed(2)}ms`);
  console.log(`  Min:    ${results.min.toFixed(2)}ms`);
  console.log(`  Max:    ${results.max.toFixed(2)}ms`);
  console.log(`  P95:    ${results.p95.toFixed(2)}ms`);
}

function compareResults(workspace, v6) {
  const diff = ((workspace.median - v6.median) / v6.median) * 100;
  const faster = diff < 0;
  console.log(`\n  Comparison: Workspace is ${Math.abs(diff).toFixed(1)}% ${faster ? 'FASTER' : 'SLOWER'} than v6`);
}

async function main() {
  console.log('═'.repeat(70));
  console.log('  SSR Benchmark Suite');
  console.log('  styled-components workspace vs v6.1.12');
  console.log('═'.repeat(70));
  console.log(`\n  Iterations: ${ITERATIONS} (+ ${WARMUP_ITERATIONS} warmup)`);

  const workspaceComponents = createComponents(styledWorkspace);
  const v6Components = createComponents(styledV6);

  // Benchmark 1: Deep Tree (depth=7, breadth=2)
  console.log('\n\n📊 BENCHMARK: Deep Tree (depth=7, breadth=2)');
  
  const deepTreeWorkspace = runBenchmark('Workspace - Deep Tree', () => {
    const sheet = new ServerStyleSheetWorkspace();
    const element = sheet.collectStyles(
      React.createElement(Tree, {
        breadth: 2,
        depth: 7,
        id: 0,
        wrap: 1,
        Box: workspaceComponents.Box,
      })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  });

  const deepTreeV6 = runBenchmark('V6 - Deep Tree', () => {
    const sheet = new ServerStyleSheetV6();
    const element = sheet.collectStyles(
      React.createElement(Tree, {
        breadth: 2,
        depth: 7,
        id: 0,
        wrap: 1,
        Box: v6Components.Box,
      })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  });

  formatResults(deepTreeWorkspace);
  formatResults(deepTreeV6);
  compareResults(deepTreeWorkspace, deepTreeV6);

  // Benchmark 2: Wide Tree (depth=3, breadth=10)
  console.log('\n\n📊 BENCHMARK: Wide Tree (depth=3, breadth=10)');

  const wideTreeWorkspace = runBenchmark('Workspace - Wide Tree', () => {
    const sheet = new ServerStyleSheetWorkspace();
    const element = sheet.collectStyles(
      React.createElement(Tree, {
        breadth: 10,
        depth: 3,
        id: 0,
        wrap: 1,
        Box: workspaceComponents.Box,
      })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  });

  const wideTreeV6 = runBenchmark('V6 - Wide Tree', () => {
    const sheet = new ServerStyleSheetV6();
    const element = sheet.collectStyles(
      React.createElement(Tree, {
        breadth: 10,
        depth: 3,
        id: 0,
        wrap: 1,
        Box: v6Components.Box,
      })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  });

  formatResults(wideTreeWorkspace);
  formatResults(wideTreeV6);
  compareResults(wideTreeWorkspace, wideTreeV6);

  // Benchmark 3: Sierpinski Triangle (s=500)
  console.log('\n\n📊 BENCHMARK: Sierpinski Triangle (s=500)');

  const triangleWorkspace = runBenchmark('Workspace - Triangle', () => {
    const sheet = new ServerStyleSheetWorkspace();
    const element = sheet.collectStyles(
      React.createElement(SierpinskiTriangle, {
        s: 500,
        x: 250,
        y: 250,
        Dot: workspaceComponents.Dot,
      })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  });

  const triangleV6 = runBenchmark('V6 - Triangle', () => {
    const sheet = new ServerStyleSheetV6();
    const element = sheet.collectStyles(
      React.createElement(SierpinskiTriangle, {
        s: 500,
        x: 250,
        y: 250,
        Dot: v6Components.Dot,
      })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  });

  formatResults(triangleWorkspace);
  formatResults(triangleV6);
  compareResults(triangleWorkspace, triangleV6);

  // Benchmark 4: Many Components (component creation overhead)
  console.log('\n\n📊 BENCHMARK: Component Creation (100 unique styled components)');

  const createManyWorkspace = runBenchmark('Workspace - Create Components', () => {
    const components = [];
    for (let i = 0; i < 100; i++) {
      components.push(styledWorkspace.div`
        color: hsl(${i * 3.6}, 50%, 50%);
        padding: ${i}px;
        margin: ${i % 10}px;
      `);
    }
    return components;
  });

  const createManyV6 = runBenchmark('V6 - Create Components', () => {
    const components = [];
    for (let i = 0; i < 100; i++) {
      components.push(styledV6.div`
        color: hsl(${i * 3.6}, 50%, 50%);
        padding: ${i}px;
        margin: ${i % 10}px;
      `);
    }
    return components;
  });

  formatResults(createManyWorkspace);
  formatResults(createManyV6);
  compareResults(createManyWorkspace, createManyV6);

  // Summary
  console.log('\n\n' + '═'.repeat(70));
  console.log('  SUMMARY');
  console.log('═'.repeat(70));
  
  const allResults = [
    { name: 'Deep Tree', workspace: deepTreeWorkspace, v6: deepTreeV6 },
    { name: 'Wide Tree', workspace: wideTreeWorkspace, v6: wideTreeV6 },
    { name: 'Triangle', workspace: triangleWorkspace, v6: triangleV6 },
    { name: 'Create Components', workspace: createManyWorkspace, v6: createManyV6 },
  ];

  console.log('\n  Benchmark              Workspace    V6        Diff');
  console.log('  ' + '─'.repeat(55));
  
  for (const result of allResults) {
    const diff = ((result.workspace.median - result.v6.median) / result.v6.median) * 100;
    const sign = diff < 0 ? '' : '+';
    const color = diff < 0 ? '🟢' : diff > 5 ? '🔴' : '🟡';
    console.log(
      `  ${color} ${result.name.padEnd(18)} ${result.workspace.median.toFixed(2).padStart(8)}ms  ${result.v6.median.toFixed(2).padStart(8)}ms  ${sign}${diff.toFixed(1)}%`
    );
  }

  console.log('\n');
}

main().catch(console.error);
