/**
 * SSR Microbenchmarks - Isolate performance bottlenecks
 */

const React = require('react');
const { renderToString } = require('react-dom/server');

const styledWorkspace = require('styled-components').default;
const ServerStyleSheetWorkspace = require('styled-components').ServerStyleSheet;

const styledV6 = require('styled-components-v6').default;
const ServerStyleSheetV6 = require('styled-components-v6').ServerStyleSheet;

const ITERATIONS = 100;

function bench(name, fn) {
  // Warmup
  for (let i = 0; i < 10; i++) fn();
  if (global.gc) global.gc();

  const times = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const sorted = times.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return { name, median, times };
}

function compare(label, workspaceResult, v6Result) {
  const diff = ((workspaceResult.median - v6Result.median) / v6Result.median) * 100;
  const indicator = diff > 5 ? '🔴' : diff < -5 ? '🟢' : '🟡';
  console.log(`${indicator} ${label.padEnd(35)} WS: ${workspaceResult.median.toFixed(3).padStart(8)}ms  V6: ${v6Result.median.toFixed(3).padStart(8)}ms  (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%)`);
}

console.log('═'.repeat(80));
console.log('  SSR Microbenchmarks - Isolating Performance Bottlenecks');
console.log('═'.repeat(80));
console.log(`\n  Iterations: ${ITERATIONS}\n`);

// 1. Component Creation
console.log('\n📊 COMPONENT CREATION');
console.log('─'.repeat(80));

const wsCreateSimple = bench('WS simple', () => {
  styledWorkspace.div`color: red;`;
});
const v6CreateSimple = bench('V6 simple', () => {
  styledV6.div`color: red;`;
});
compare('Simple component creation', wsCreateSimple, v6CreateSimple);

const wsCreateDynamic = bench('WS dynamic', () => {
  styledWorkspace.div`color: ${props => props.color};`;
});
const v6CreateDynamic = bench('V6 dynamic', () => {
  styledV6.div`color: ${props => props.color};`;
});
compare('Dynamic component creation', wsCreateDynamic, v6CreateDynamic);

// 2. Style Rendering (first render)
console.log('\n📊 FIRST RENDER (style generation + injection)');
console.log('─'.repeat(80));

const wsFirstRender = bench('WS first', () => {
  const Comp = styledWorkspace.div`
    color: red;
    background: blue;
    padding: 10px;
    margin: ${props => props.m}px;
  `;
  const sheet = new ServerStyleSheetWorkspace();
  const el = sheet.collectStyles(React.createElement(Comp, { m: 5 }));
  renderToString(el);
  sheet.seal();
});
const v6FirstRender = bench('V6 first', () => {
  const Comp = styledV6.div`
    color: red;
    background: blue;
    padding: 10px;
    margin: ${props => props.m}px;
  `;
  const sheet = new ServerStyleSheetV6();
  const el = sheet.collectStyles(React.createElement(Comp, { m: 5 }));
  renderToString(el);
  sheet.seal();
});
compare('First render (create + render)', wsFirstRender, v6FirstRender);

// 3. Repeated render same component
console.log('\n📊 REPEATED RENDER (same component, different props)');
console.log('─'.repeat(80));

const WsRepeated = styledWorkspace.div`margin: ${props => props.m}px;`;
const V6Repeated = styledV6.div`margin: ${props => props.m}px;`;

const wsRepeatedSame = bench('WS same props', () => {
  const sheet = new ServerStyleSheetWorkspace();
  const el = sheet.collectStyles(React.createElement(WsRepeated, { m: 5 }));
  renderToString(el);
  sheet.seal();
});
const v6RepeatedSame = bench('V6 same props', () => {
  const sheet = new ServerStyleSheetV6();
  const el = sheet.collectStyles(React.createElement(V6Repeated, { m: 5 }));
  renderToString(el);
  sheet.seal();
});
compare('Same props (cache hit)', wsRepeatedSame, v6RepeatedSame);

let wsCounter = 0;
const wsRepeatedDiff = bench('WS diff props', () => {
  const sheet = new ServerStyleSheetWorkspace();
  const el = sheet.collectStyles(React.createElement(WsRepeated, { m: wsCounter++ }));
  renderToString(el);
  sheet.seal();
});
let v6Counter = 0;
const v6RepeatedDiff = bench('V6 diff props', () => {
  const sheet = new ServerStyleSheetV6();
  const el = sheet.collectStyles(React.createElement(V6Repeated, { m: v6Counter++ }));
  renderToString(el);
  sheet.seal();
});
compare('Different props (cache miss)', wsRepeatedDiff, v6RepeatedDiff);

// 4. Many components tree
console.log('\n📊 TREE RENDERING');
console.log('─'.repeat(80));

const WsBox = styledWorkspace.div`
  display: flex;
  padding: ${props => props.p || 0}px;
`;
const V6Box = styledV6.div`
  display: flex;
  padding: ${props => props.p || 0}px;
`;

function makeTree(Box, depth) {
  if (depth === 0) return React.createElement(Box, { p: 1 });
  return React.createElement(Box, { p: depth }, 
    React.createElement(Box, { p: depth }, makeTree(Box, depth - 1)),
    React.createElement(Box, { p: depth }, makeTree(Box, depth - 1))
  );
}

const wsTree = bench('WS tree', () => {
  const sheet = new ServerStyleSheetWorkspace();
  const el = sheet.collectStyles(makeTree(WsBox, 5));
  renderToString(el);
  sheet.seal();
});
const v6Tree = bench('V6 tree', () => {
  const sheet = new ServerStyleSheetV6();
  const el = sheet.collectStyles(makeTree(V6Box, 5));
  renderToString(el);
  sheet.seal();
});
compare('Tree (depth=5, ~63 elements)', wsTree, v6Tree);

// 5. Many unique styles
console.log('\n📊 UNIQUE STYLES (worst case - many cache misses)');
console.log('─'.repeat(80));

const WsDot = styledWorkspace.div`
  left: ${p => p.x}px;
  top: ${p => p.y}px;
`;
const V6Dot = styledV6.div`
  left: ${p => p.x}px;
  top: ${p => p.y}px;
`;

const wsManyUnique = bench('WS 100 unique', () => {
  const sheet = new ServerStyleSheetWorkspace();
  const elements = [];
  for (let i = 0; i < 100; i++) {
    elements.push(React.createElement(WsDot, { key: i, x: i, y: i * 2 }));
  }
  const el = sheet.collectStyles(React.createElement('div', null, elements));
  renderToString(el);
  sheet.seal();
});
const v6ManyUnique = bench('V6 100 unique', () => {
  const sheet = new ServerStyleSheetV6();
  const elements = [];
  for (let i = 0; i < 100; i++) {
    elements.push(React.createElement(V6Dot, { key: i, x: i, y: i * 2 }));
  }
  const el = sheet.collectStyles(React.createElement('div', null, elements));
  renderToString(el);
  sheet.seal();
});
compare('100 unique styles', wsManyUnique, v6ManyUnique);

// 6. getStyleTags extraction
console.log('\n📊 STYLE EXTRACTION (getStyleTags)');
console.log('─'.repeat(80));

// Pre-populate sheets with styles
const wsSheetFilled = new ServerStyleSheetWorkspace();
const WsFilled = styledWorkspace.div`color: ${p => p.c};`;
const wsFillElements = [];
for (let i = 0; i < 200; i++) {
  wsFillElements.push(React.createElement(WsFilled, { key: i, c: `hsl(${i}, 50%, 50%)` }));
}
renderToString(wsSheetFilled.collectStyles(React.createElement('div', null, wsFillElements)));

const v6SheetFilled = new ServerStyleSheetV6();
const V6Filled = styledV6.div`color: ${p => p.c};`;
const v6FillElements = [];
for (let i = 0; i < 200; i++) {
  v6FillElements.push(React.createElement(V6Filled, { key: i, c: `hsl(${i}, 50%, 50%)` }));
}
renderToString(v6SheetFilled.collectStyles(React.createElement('div', null, v6FillElements)));

const wsGetStyles = bench('WS getStyleTags', () => {
  wsSheetFilled.getStyleTags();
});
const v6GetStyles = bench('V6 getStyleTags', () => {
  v6SheetFilled.getStyleTags();
});
compare('getStyleTags (200 styles)', wsGetStyles, v6GetStyles);

console.log('\n' + '═'.repeat(80));
console.log('  ANALYSIS');
console.log('═'.repeat(80));
console.log(`
Key findings:
- Component creation: Shows baseline overhead
- First render: Measures create + flatten + stylis + inject
- Repeated same props: Cache hit path
- Repeated diff props: Cache miss path (new style generation)
- Unique styles: Stress test for style injection
- getStyleTags: SSR extraction overhead
`);
