/**
 * Deep profiling - instrument the actual hot paths
 */

const React = require('react');
const { renderToString } = require('react-dom/server');

const styledWorkspace = require('styled-components').default;
const ServerStyleSheetWorkspace = require('styled-components').ServerStyleSheet;

const styledV6 = require('styled-components-v6').default;
const ServerStyleSheetV6 = require('styled-components-v6').ServerStyleSheet;

const RUNS = 10;

function SierpinskiTriangle({ s, x, y, depth = 0, Dot }) {
  const targetSize = 10;
  if (s <= targetSize) {
    const colors = ['#9e0142', '#d53e4f', '#f46d43'];
    return React.createElement(Dot, {
      color: colors[depth % 3],
      size: targetSize,
      x: x - targetSize / 2,
      y: y - targetSize / 2,
    });
  }
  const newS = s / 2;
  return React.createElement(React.Fragment, null,
    React.createElement(SierpinskiTriangle, { s: newS, x, y: y - newS / 2, depth: 1, Dot }),
    React.createElement(SierpinskiTriangle, { s: newS, x: x - newS, y: y + newS / 2, depth: 2, Dot }),
    React.createElement(SierpinskiTriangle, { s: newS, x: x + newS, y: y + newS / 2, depth: 3, Dot })
  );
}

const WsDot = styledWorkspace.div`
  position: absolute;
  margin-left: ${props => `${props.x}px`};
  margin-top: ${props => `${props.y}px`};
  border-bottom-color: ${props => props.color};
`;

const V6Dot = styledV6.div`
  position: absolute;
  margin-left: ${props => `${props.x}px`};
  margin-top: ${props => `${props.y}px`};
  border-bottom-color: ${props => props.color};
`;

console.log('═'.repeat(70));
console.log('  Deep Profile: Triangle Benchmark Phase Breakdown');
console.log('═'.repeat(70));

// Workspace
console.log('\n📊 WORKSPACE');
let collectTotal = 0, renderTotal = 0, extractTotal = 0;
for (let i = 0; i < RUNS; i++) {
  const sheet = new ServerStyleSheetWorkspace();
  
  let t = performance.now();
  const el = sheet.collectStyles(
    React.createElement(SierpinskiTriangle, { s: 500, x: 250, y: 250, Dot: WsDot })
  );
  collectTotal += performance.now() - t;
  
  t = performance.now();
  renderToString(el);
  renderTotal += performance.now() - t;
  
  t = performance.now();
  sheet.getStyleTags();
  extractTotal += performance.now() - t;
  
  sheet.seal();
}
console.log(`  collectStyles:  ${(collectTotal / RUNS).toFixed(2)}ms`);
console.log(`  renderToString: ${(renderTotal / RUNS).toFixed(2)}ms`);
console.log(`  getStyleTags:   ${(extractTotal / RUNS).toFixed(2)}ms`);
console.log(`  TOTAL:          ${((collectTotal + renderTotal + extractTotal) / RUNS).toFixed(2)}ms`);

// V6
console.log('\n📊 V6 (npm latest)');
collectTotal = 0; renderTotal = 0; extractTotal = 0;
for (let i = 0; i < RUNS; i++) {
  const sheet = new ServerStyleSheetV6();
  
  let t = performance.now();
  const el = sheet.collectStyles(
    React.createElement(SierpinskiTriangle, { s: 500, x: 250, y: 250, Dot: V6Dot })
  );
  collectTotal += performance.now() - t;
  
  t = performance.now();
  renderToString(el);
  renderTotal += performance.now() - t;
  
  t = performance.now();
  sheet.getStyleTags();
  extractTotal += performance.now() - t;
  
  sheet.seal();
}
console.log(`  collectStyles:  ${(collectTotal / RUNS).toFixed(2)}ms`);
console.log(`  renderToString: ${(renderTotal / RUNS).toFixed(2)}ms`);
console.log(`  getStyleTags:   ${(extractTotal / RUNS).toFixed(2)}ms`);
console.log(`  TOTAL:          ${((collectTotal + renderTotal + extractTotal) / RUNS).toFixed(2)}ms`);

// Now let's profile the component render itself by counting renders
console.log('\n\n═'.repeat(70));
console.log('  Component Render Count Analysis');
console.log('═'.repeat(70));

let wsRenderCount = 0;
const WsDotCounted = styledWorkspace.div`
  position: absolute;
  margin-left: ${props => { wsRenderCount++; return `${props.x}px`; }};
`;

let v6RenderCount = 0;  
const V6DotCounted = styledV6.div`
  position: absolute;
  margin-left: ${props => { v6RenderCount++; return `${props.x}px`; }};
`;

// Workspace
wsRenderCount = 0;
const wsSheet = new ServerStyleSheetWorkspace();
renderToString(wsSheet.collectStyles(
  React.createElement(SierpinskiTriangle, { s: 500, x: 250, y: 250, Dot: WsDotCounted })
));
console.log(`\n  Workspace interpolation calls: ${wsRenderCount}`);

// V6
v6RenderCount = 0;
const v6Sheet = new ServerStyleSheetV6();
renderToString(v6Sheet.collectStyles(
  React.createElement(SierpinskiTriangle, { s: 500, x: 250, y: 250, Dot: V6DotCounted })
));
console.log(`  V6 interpolation calls:        ${v6RenderCount}`);

// Count unique triangles
let triangleCount = 0;
function countTriangles(s) {
  if (s <= 10) { triangleCount++; return; }
  countTriangles(s / 2);
  countTriangles(s / 2);
  countTriangles(s / 2);
}
countTriangles(500);
console.log(`  Total triangle dots:           ${triangleCount}`);

console.log('\n');
