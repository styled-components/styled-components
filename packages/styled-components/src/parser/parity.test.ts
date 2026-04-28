/**
 * parser ↔ stylis output parity corpus.
 *
 * Runs a broad CSS corpus through both pipelines and asserts byte-identical
 * output. This is the blocking validation before swapping stylis out in
 * src/utils/cssCompile.ts.
 *
 * Coverage target: every shape we've seen in the existing cssCompile.test.ts and
 * real-world styled-components templates. When a new failure mode is discovered
 * in production, add it here FIRST (red), fix the emitter (green), ship.
 */

import * as actualStylis from 'stylis';
import createStylisInstance from '../utils/cssCompile';
import { preprocessCSS } from '../utils/cssCompile';
import { emitWeb } from './emit-web';
import { parse } from './parser';

const stylis = createStylisInstance();

function stylisOut(css: string): string[] {
  return stylis(css, '.a', undefined, 'a');
}

function parserOut(css: string): string[] {
  return emitWeb(parse(preprocessCSS(css)), '.a');
}

/**
 * Real stylis output (the v6 baseline). Used by the upstream-stylis-parity
 * suite to lock down corner cases where v6→v7 hash stability depends on
 * byte-identical output.
 */
function upstreamStylisOut(css: string): string {
  return actualStylis.serialize(actualStylis.compile(css), actualStylis.stringify);
}

function ourOutFlat(css: string): string {
  return parserOut(css).join('');
}

const cases: Array<{ name: string; css: string; skip?: boolean; skipReason?: string }> = [
  { name: 'simple declarations', css: `color: red; background: blue;` },
  {
    name: 'base + nested + base collapses',
    css: `color: red; &:hover { color: blue; } font-size: 16px;`,
  },
  { name: 'nested comma list', css: `&:hover, &:focus { color: blue; }` },
  {
    name: '@media with nested + base',
    css: `@media (min-width: 500px) { background: red; &:hover { color: blue; } }`,
  },
  {
    name: '@supports nested @media',
    css: `@supports (display: grid) { @media (min-width: 500px) { &:hover { display: grid; } } }`,
  },
  {
    name: '@keyframes',
    css: `@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`,
  },
  {
    name: '@keyframes comma stops',
    css: `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`,
  },
  {
    name: '@keyframes drops empty frames (parity with stylis)',
    css: `@keyframes spin { from { } to { opacity: 1; } }`,
  },
  {
    name: '@keyframes drops every-frame-empty bodies',
    css: `@keyframes none { 0% {} 50% {} 100% {} }`,
  },
  {
    name: 'bare nested selectors',
    css: `color: red; .foo { color: blue; } .bar .baz { padding: 8px; }`,
  },
  { name: '& + & self reference', css: `& + & { margin-left: 8px; }` },
  {
    name: '@font-face with quotes',
    css: `@font-face { font-family: 'MyFont'; src: url(foo.woff2); }`,
  },
  {
    name: '@font-face with multiple src',
    css: `@font-face { font-family: 'MyFont'; src: url(foo.woff2) format('woff2'), url(foo.woff) format('woff'); }`,
  },
  { name: 'comma-separated declaration values', css: `transition: color 0.2s, background 0.3s;` },
  { name: 'calc values', css: `width: calc(100% - 16px); height: calc(50vh + 20px);` },
  { name: 'rgb/rgba values', css: `color: rgb(1, 2, 3); background: rgba(0, 0, 0, 0.5);` },
  { name: 'content with brace', css: `content: "}"; color: red;` },
  { name: 'content with escaped quote', css: `content: 'it\\'s'; color: red;` },
  { name: 'empty block-less at-rule', css: `@charset "UTF-8";` },
  { name: '@import block-less', css: `@import url(https://example.com/styles.css);` },
  { name: '@container', css: `@container card (min-width: 400px) { padding: 16px; }` },
  { name: '@layer block-less', css: `@layer reset, framework, utilities;` },
  { name: '@layer block', css: `@layer utilities { color: red; }` },
  {
    name: '@scope',
    css: `@scope (.card) to (.content) { color: red; }`,
    skip: true,
    skipReason: 'stylis may not handle @scope prelude identically',
  },
  {
    name: '@starting-style',
    css: `@starting-style { opacity: 0; }`,
    skip: true,
    skipReason: 'stylis emits as block-less',
  },
  { name: 'deeply nested & with combinators', css: `& { & > & + & ~ & { color: red; } }` },
  { name: 'unicode escape in selector', css: `&::after { content: "\\2713"; }` },
  {
    name: 'selector with attribute + value',
    css: `&[data-type="card,panel"] { border: 1px solid; }`,
  },
  {
    name: 'deeply nested rules (3 levels)',
    css: `& { & .a { & .b { color: red; } } }`,
  },
  { name: 'empty input', css: `` },
  { name: 'whitespace only', css: `   \n\t  ` },
  {
    name: 'multiple top-level at-rules',
    css: `@media (min-width: 500px) { color: red; } @media (min-width: 900px) { color: blue; }`,
  },
];

describe('parser ↔ stylis parity corpus', () => {
  for (const c of cases) {
    const runner = c.skip ? it.skip : it;
    runner(c.name + (c.skip ? ` [skipped: ${c.skipReason}]` : ''), () => {
      const expected = stylisOut(c.css);
      const actual = parserOut(c.css);
      expect(actual).toEqual(expected);
    });
  }
});

/**
 * Broader parity corpus drawn from the styled-components wild. If a user's CSS
 * pattern breaks parity, add it here FIRST (red), then fix.
 */
const wildCases: string[] = [
  // Flexbox
  `display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:16px;`,
  // Grid
  `display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:minmax(100px,auto);gap:24px 16px;`,
  // Typography
  `font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;letter-spacing:0.02em;`,
  // Transforms + transitions
  `transform:translate(-50%,-50%) rotate(45deg) scale(1.1);transition:transform 0.2s ease-out,opacity 0.3s ease-in;`,
  // Shadows
  `box-shadow:0 2px 4px rgba(0,0,0,0.1),0 8px 16px rgba(0,0,0,0.05);`,
  // Gradients
  `background:linear-gradient(135deg,#ff6b6b 0%,#4ecdc4 100%);`,
  `background-image:radial-gradient(circle at center,rgba(255,255,255,0.8) 0%,transparent 70%);`,
  // Custom properties
  `--x:16px;--y:calc(var(--x) * 2);padding:var(--y);`,
  // Pseudo-classes with &
  `&:hover { background:#f5f5f5; } &:focus { outline:2px solid blue; } &:disabled { opacity:0.5; }`,
  // Pseudo-elements
  `&::before { content:"★"; color:gold; } &::after { content:"»"; margin-left:4px; }`,
  // Combinators
  `& > li { padding:8px; } & + & { margin-top:16px; } & ~ & { color:blue; }`,
  // Comma selectors
  `&:hover,&:focus,&:active { background:#eee; }`,
  // Functional pseudos
  `&:is(.active,.selected) { font-weight:700; } &:where(h1,h2,h3) { line-height:1.2; }`,
  // Attribute selectors
  `&[data-state="open"] { background:blue; } &[aria-expanded="true"] { transform:rotate(180deg); }`,
  // @media combinations
  `@media (min-width:500px) and (max-width:1000px) { padding:24px; }`,
  `@media (prefers-color-scheme:dark) { background:#111; color:#eee; }`,
  `@media (prefers-reduced-motion:reduce) { transition:none; animation:none; }`,
  // @container
  `@container (min-width:400px) { padding:24px; }`,
  `@container sidebar (min-width:300px) { display:flex; }`,
  // @supports
  `@supports (display:grid) { display:grid; gap:16px; }`,
  `@supports not (display:grid) { display:flex; }`,
  // Nested at-rules
  `@media (min-width:500px) { @supports (display:grid) { display:grid; } }`,
  // Multiple keyframes
  `@keyframes fade { 0% { opacity:0; } 100% { opacity:1; } } @keyframes slide { from { transform:translateX(-100%); } to { transform:translateX(0); } }`,
  // Animation shorthand
  `animation:fade 0.3s ease-out,slide 0.5s cubic-bezier(0.2,0,0,1);`,
  // Background shorthand
  `background:#fff url(/bg.png) no-repeat center/cover;`,
  // Border shorthand
  `border:1px solid rgba(0,0,0,0.1);border-radius:8px;`,
  // Calc nested
  `width:calc(100% - calc(16px * 2));`,
  // Min/Max functions
  `width:min(100%,1200px);font-size:clamp(14px,2vw,18px);padding:max(8px,env(safe-area-inset-top));`,
  // CSS variables in calc
  `height:calc(100vh - var(--header-height,64px));`,
  // Unicode ranges (inside @font-face only; outside is invalid but stylis preserves)
  `@font-face { font-family:"My"; src:url(/my.woff2); unicode-range:U+0000-00FF,U+0131; }`,
  // Content with special chars
  `&::before { content:"\\2713  Done"; }`,
  // Escape in selector
  `&\\:hover { color:red; }`,
  // Empty at-rule body
  `@media (min-width:500px) { }`,
  // Deep nesting
  `& { & { & { color:red; } } }`,
  // Mixed at-rules with base decls
  `color:red; @media (print) { color:black; } font-size:16px; @supports (grid) { display:grid; }`,
];

describe('parser ↔ stylis wild parity corpus', () => {
  for (let i = 0; i < wildCases.length; i++) {
    const css = wildCases[i];
    it(`case #${i}: ${css.slice(0, 60).replace(/\s+/g, ' ')}…`, () => {
      const expected = stylisOut(css);
      const actual = parserOut(css);
      expect(actual).toEqual(expected);
    });
  }
});

/**
 * Spot-check parity against actual upstream stylis (NOT against our own
 * pipeline). Class-name hash stability across the v6→v7 upgrade depends on
 * byte-identical output for these cases.
 */
describe('upstream stylis byte-identical parity', () => {
  const upstreamCases: Array<{ name: string; css: string }> = [
    {
      name: 'empty keyframe frames are dropped',
      css: '@keyframes spin { from { } to { opacity: 1; } }',
    },
    {
      name: 'all-empty keyframe collapses to empty body',
      css: '@keyframes none { 0% {} 50% {} 100% {} }',
    },
    {
      // The component-id prefix differs between bare-stylis output and our
      // pipeline (we always prepend `.a`), so comment behavior is asserted
      // separately via `preprocessCSS` directly. See the dedicated suite below.
      name: 'block comment behavior tested separately (preprocess only)',
      css: '@keyframes spin { 0% { opacity: 0; } 100% { opacity: 1; } }',
    },
  ];
  for (const c of upstreamCases) {
    it(c.name, () => {
      expect(ourOutFlat(c.css)).toEqual(upstreamStylisOut(c.css));
    });
  }
});

describe('preprocessCSS comment-whitespace parity', () => {
  it('a /* foo */ b collapses surrounding whitespace to a single space', () => {
    expect(preprocessCSS('a /* foo */ b { color: red; }')).toEqual('a b { color: red; }');
  });

  it('a/* foo */b strips just the comment when no surrounding whitespace', () => {
    expect(preprocessCSS('a/* foo */b { color: red; }')).toEqual('ab { color: red; }');
  });

  it('comment between two declarations leaves only a single space', () => {
    expect(preprocessCSS('color: red; /* note */ background: blue;')).toEqual(
      'color: red; background: blue;'
    );
  });

  it('comment at start of value strips without leaving double space', () => {
    expect(preprocessCSS('color: /* note */ red;')).toEqual('color: red;');
  });
});
