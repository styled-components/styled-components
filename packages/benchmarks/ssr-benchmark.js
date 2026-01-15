/**
 * SSR Benchmark Suite
 * 
 * Compares styled-components workspace vs v6 vs Emotion.
 * Run with: node --expose-gc ssr-benchmark.js
 */

const React = require('react');
const { renderToString } = require('react-dom/server');

const styledWorkspace = require('styled-components').default;
const ServerStyleSheetWorkspace = require('styled-components').ServerStyleSheet;

const styledV6 = require('styled-components-v6').default;
const ServerStyleSheetV6 = require('styled-components-v6').ServerStyleSheet;

const emotionStyled = require('@emotion/styled').default;
const { CacheProvider } = require('@emotion/react');
const createEmotionServer = require('@emotion/server/create-instance').default;
const createCache = require('@emotion/cache').default;

const ITERATIONS = 50;
const WARMUP_ITERATIONS = 5;

function createStyledComponents(styled) {
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

function createEmotionComponents() {
  const View = emotionStyled.div`
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

  const Box = emotionStyled(View)`
    align-self: flex-start;
    flex-direction: ${props => (props.layout === 'column' ? 'column' : 'row')};
    padding: ${props => (props.outer ? '4px' : '0')};
    ${props => props.fixed && 'height: 6px;'}
    ${props => props.fixed && 'width: 6px;'}
    background-color: ${props => getColor(props.color)};
  `;

  const Dot = emotionStyled.div`
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
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }

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
  console.log(`  ${results.name.padEnd(25)} ${results.median.toFixed(2).padStart(8)}ms  (p95: ${results.p95.toFixed(2)}ms)`);
}

function compareAll(results) {
  const baseline = results.find(r => r.name.includes('Emotion'));
  if (!baseline) return;
  
  console.log('\n  vs Emotion:');
  for (const r of results) {
    if (r === baseline) continue;
    const diff = ((r.median - baseline.median) / baseline.median) * 100;
    const sign = diff < 0 ? '' : '+';
    const indicator = diff < -5 ? '🟢' : diff > 5 ? '🔴' : '🟡';
    console.log(`    ${indicator} ${r.name.padEnd(23)} ${sign}${diff.toFixed(1)}%`);
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('  SSR Benchmark Suite');
  console.log('  styled-components (workspace) vs v6.1.12 vs Emotion');
  console.log('═'.repeat(70));
  console.log(`\n  Iterations: ${ITERATIONS} (+ ${WARMUP_ITERATIONS} warmup)\n`);

  const workspaceComponents = createStyledComponents(styledWorkspace);
  const v6Components = createStyledComponents(styledV6);
  const emotionComponents = createEmotionComponents();

  // Benchmark 1: Deep Tree
  console.log('\n📊 Deep Tree (depth=7, breadth=2)');
  console.log('─'.repeat(60));
  
  const deepTreeResults = [];

  deepTreeResults.push(runBenchmark('Workspace', () => {
    const sheet = new ServerStyleSheetWorkspace();
    const element = sheet.collectStyles(
      React.createElement(Tree, { breadth: 2, depth: 7, id: 0, wrap: 1, Box: workspaceComponents.Box })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  }));

  deepTreeResults.push(runBenchmark('V6 (npm latest)', () => {
    const sheet = new ServerStyleSheetV6();
    const element = sheet.collectStyles(
      React.createElement(Tree, { breadth: 2, depth: 7, id: 0, wrap: 1, Box: v6Components.Box })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  }));

  deepTreeResults.push(runBenchmark('Emotion', () => {
    const cache = createCache({ key: 'emo' });
    const { extractCriticalToChunks } = createEmotionServer(cache);
    const element = React.createElement(
      CacheProvider,
      { value: cache },
      React.createElement(Tree, { breadth: 2, depth: 7, id: 0, wrap: 1, Box: emotionComponents.Box })
    );
    const html = renderToString(element);
    extractCriticalToChunks(html);
  }));

  deepTreeResults.forEach(formatResults);
  compareAll(deepTreeResults);

  // Benchmark 2: Wide Tree
  console.log('\n\n📊 Wide Tree (depth=3, breadth=10)');
  console.log('─'.repeat(60));

  const wideTreeResults = [];

  wideTreeResults.push(runBenchmark('Workspace', () => {
    const sheet = new ServerStyleSheetWorkspace();
    const element = sheet.collectStyles(
      React.createElement(Tree, { breadth: 10, depth: 3, id: 0, wrap: 1, Box: workspaceComponents.Box })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  }));

  wideTreeResults.push(runBenchmark('V6 (npm latest)', () => {
    const sheet = new ServerStyleSheetV6();
    const element = sheet.collectStyles(
      React.createElement(Tree, { breadth: 10, depth: 3, id: 0, wrap: 1, Box: v6Components.Box })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  }));

  wideTreeResults.push(runBenchmark('Emotion', () => {
    const cache = createCache({ key: 'emo' });
    const { extractCriticalToChunks } = createEmotionServer(cache);
    const element = React.createElement(
      CacheProvider,
      { value: cache },
      React.createElement(Tree, { breadth: 10, depth: 3, id: 0, wrap: 1, Box: emotionComponents.Box })
    );
    const html = renderToString(element);
    extractCriticalToChunks(html);
  }));

  wideTreeResults.forEach(formatResults);
  compareAll(wideTreeResults);

  // Benchmark 3: Sierpinski Triangle
  console.log('\n\n📊 Sierpinski Triangle (s=500, many unique styles)');
  console.log('─'.repeat(60));

  const triangleResults = [];

  triangleResults.push(runBenchmark('Workspace', () => {
    const sheet = new ServerStyleSheetWorkspace();
    const element = sheet.collectStyles(
      React.createElement(SierpinskiTriangle, { s: 500, x: 250, y: 250, Dot: workspaceComponents.Dot })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  }));

  triangleResults.push(runBenchmark('V6 (npm latest)', () => {
    const sheet = new ServerStyleSheetV6();
    const element = sheet.collectStyles(
      React.createElement(SierpinskiTriangle, { s: 500, x: 250, y: 250, Dot: v6Components.Dot })
    );
    renderToString(element);
    sheet.getStyleTags();
    sheet.seal();
  }));

  triangleResults.push(runBenchmark('Emotion', () => {
    const cache = createCache({ key: 'emo' });
    const { extractCriticalToChunks } = createEmotionServer(cache);
    const element = React.createElement(
      CacheProvider,
      { value: cache },
      React.createElement(SierpinskiTriangle, { s: 500, x: 250, y: 250, Dot: emotionComponents.Dot })
    );
    const html = renderToString(element);
    extractCriticalToChunks(html);
  }));

  triangleResults.forEach(formatResults);
  compareAll(triangleResults);

  // Summary
  console.log('\n\n' + '═'.repeat(70));
  console.log('  SUMMARY (median times)');
  console.log('═'.repeat(70));
  
  const allBenchmarks = [
    { name: 'Deep Tree', results: deepTreeResults },
    { name: 'Wide Tree', results: wideTreeResults },
    { name: 'Triangle', results: triangleResults },
  ];

  console.log('\n  Benchmark        Workspace    V6         Emotion');
  console.log('  ' + '─'.repeat(55));
  
  for (const bench of allBenchmarks) {
    const ws = bench.results.find(r => r.name === 'Workspace');
    const v6 = bench.results.find(r => r.name === 'V6 (npm latest)');
    const em = bench.results.find(r => r.name === 'Emotion');
    
    console.log(
      `  ${bench.name.padEnd(15)} ${ws.median.toFixed(2).padStart(8)}ms  ${v6.median.toFixed(2).padStart(8)}ms  ${em.median.toFixed(2).padStart(8)}ms`
    );
  }

  console.log('\n');
}

main().catch(console.error);
