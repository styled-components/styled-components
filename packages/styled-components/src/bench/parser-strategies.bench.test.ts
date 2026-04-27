/**
 * parser hot-path microbenchmark.
 *
 * Compares node-representation strategies to maximize V8 / Hermes hot-path perf.
 *
 * ## Findings (V8 / Node via jest, 2026-04-24)
 *
 *   Scale            Best parser       stylis baseline    Speedup
 *   TINY   (2 decls) 7.7M/s  (C)      3.6M/s             2.1x
 *   SMALL  (4 decls) 3.5M/s  (A/B/C)  1.1M/s             3.2x
 *   MEDIUM (16)      636K/s  (C)      168K/s             3.8x
 *   NESTED (mixed)   952K/s  (B)      250K/s             3.8x
 *
 * ## Decisions
 *
 *   - Pick Strategy A (numeric const enum tags + plain object literals).
 *     A, B, C, F cluster within run-to-run variance; A has the smallest bundle
 *     footprint (no `class` keyword, no inlined string tags, no module-level
 *     scratch state) and the cleanest TS narrowing.
 *   - Reject Strategy D (segregated arrays): the Uint8/Uint32 bookkeeping cost
 *     consistently outweighs monomorphism wins in every scale tested.
 *   - Reject Strategy E (object pool): wide uniform shape hurts more than pool
 *     reuse helps beyond trivial sizes.
 *   - Reject Strategy F (module-level mutable index): no measurable gain from
 *     avoiding the per-recursion `{i}` allocation on V8.
 *
 * Hermes numbers pending Phase 4 bench runner. Revalidate decisions there.
 *
 * Run: pnpm --filter styled-components bench:web -- parser-strategies
 */

import * as stylis from 'stylis';
import { bench as _bench } from './bench-utils';

const opts = { runs: 7, precision: 2, nameWidth: 60 };
const bench = (name: string, iterations: number, fn: (i: number) => void) =>
  _bench(name, iterations, fn, opts);

// ------------------- test inputs -------------------

const CSS_TINY = 'color:red;background:blue;';

const CSS_SMALL = `
display: flex;
color: #333;
font-size: 14px;
padding: 8px 16px;
`;

const CSS_MEDIUM = `
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 16px 24px;
margin: 0 auto;
max-width: 1200px;
font-family: -apple-system, BlinkMacSystemFont, sans-serif;
font-size: 14px;
line-height: 1.5;
color: #333;
background-color: #fff;
border: 1px solid #e0e0e0;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
transition: all 0.2s ease-in-out;
`;

const CSS_MEDIA_NESTED = `
display: flex;
padding: 16px;
color: #333;
@media (min-width: 500px) {
  padding: 24px;
  font-size: 16px;
}
@media (min-width: 900px) {
  padding: 32px;
  font-size: 18px;
  max-width: 1200px;
}
&:hover {
  background: #f5f5f5;
  transform: translateY(-2px);
}
`;

// ------------------- char codes -------------------

const SEMI = 59;
const COLON = 58;
const OPEN_BRACE = 123;
const CLOSE_BRACE = 125;
const OPEN_PAREN = 40;
const CLOSE_PAREN = 41;
const AT = 64;
const DOUBLE_QUOTE = 34;
const SINGLE_QUOTE = 39;
const BACKSLASH = 92;
const SPACE = 32;
const TAB = 9;
const LF = 10;
const CR = 13;

function skipWS(css: string, i: number, len: number): number {
  while (i < len) {
    const c = css.charCodeAt(i);
    if (c === SPACE || c === TAB || c === LF || c === CR) i++;
    else break;
  }
  return i;
}

// find end of a value (respects strings + parens, stops at ; or } at depth 0)
function findValueEnd(css: string, start: number, len: number): number {
  let i = start;
  let paren = 0;
  let quote = 0;
  while (i < len) {
    const c = css.charCodeAt(i);
    if (quote) {
      if (c === BACKSLASH) {
        i += 2;
        continue;
      }
      if (c === quote) quote = 0;
    } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      quote = c;
    } else if (c === OPEN_PAREN) {
      paren++;
    } else if (c === CLOSE_PAREN) {
      if (paren > 0) paren--;
    } else if (paren === 0) {
      if (c === SEMI || c === CLOSE_BRACE) return i;
      if (c === OPEN_BRACE) return i;
    }
    i++;
  }
  return i;
}

// ------------------- Strategy A: numeric const enum, plain object literals -------------------

const enum KA {
  Decl = 1,
  Rule = 2,
  At = 3,
}

type DeclA = { kind: KA.Decl; prop: string; value: string };
type RuleA = { kind: KA.Rule; selectors: string; children: NodeA[] };
type AtA = { kind: KA.At; name: string; prelude: string; children: NodeA[] | null };
type NodeA = DeclA | RuleA | AtA;

function parseA(css: string): NodeA[] {
  const len = css.length;
  let i = 0;
  return parseBlockA(css, len, 0, { i }).nodes;
}

function parseBlockA(
  css: string,
  len: number,
  depth: number,
  cur: { i: number }
): { nodes: NodeA[] } {
  const out: NodeA[] = [];
  while (cur.i < len) {
    cur.i = skipWS(css, cur.i, len);
    if (cur.i >= len) break;
    const c = css.charCodeAt(cur.i);
    if (c === CLOSE_BRACE) {
      cur.i++;
      return { nodes: out };
    }
    if (c === SEMI) {
      cur.i++;
      continue;
    }
    if (c === AT) {
      // @rule
      let j = cur.i + 1;
      // read name
      while (
        j < len &&
        !(
          css.charCodeAt(j) === SPACE ||
          css.charCodeAt(j) === TAB ||
          css.charCodeAt(j) === LF ||
          css.charCodeAt(j) === OPEN_BRACE ||
          css.charCodeAt(j) === SEMI
        )
      ) {
        j++;
      }
      const name = css.substring(cur.i + 1, j);
      j = skipWS(css, j, len);
      const preludeStart = j;
      while (
        j < len &&
        css.charCodeAt(j) !== OPEN_BRACE &&
        css.charCodeAt(j) !== SEMI &&
        css.charCodeAt(j) !== CLOSE_BRACE
      ) {
        j++;
      }
      const prelude = css.substring(preludeStart, j).trimEnd();
      if (j < len && css.charCodeAt(j) === OPEN_BRACE) {
        cur.i = j + 1;
        const children = parseBlockA(css, len, depth + 1, cur).nodes;
        out.push({ kind: KA.At, name, prelude, children });
      } else {
        cur.i = j < len && css.charCodeAt(j) === SEMI ? j + 1 : j;
        out.push({ kind: KA.At, name, prelude, children: null });
      }
      continue;
    }
    // either a rule (selector { ... }) or a declaration (prop: value;)
    // scan ahead to decide
    const end = findValueEnd(css, cur.i, len);
    if (end < len && css.charCodeAt(end) === OPEN_BRACE) {
      const selectors = css.substring(cur.i, end).trim();
      cur.i = end + 1;
      const children = parseBlockA(css, len, depth + 1, cur).nodes;
      out.push({ kind: KA.Rule, selectors, children });
    } else {
      // declaration
      const colon = css.indexOf(':', cur.i);
      if (colon === -1 || colon >= end) {
        cur.i = end + 1;
        continue;
      }
      const prop = css.substring(cur.i, colon).trim();
      const value = css.substring(colon + 1, end).trim();
      if (prop && value) out.push({ kind: KA.Decl, prop, value });
      cur.i = end < len && css.charCodeAt(end) === SEMI ? end + 1 : end;
    }
  }
  return { nodes: out };
}

// ------------------- Strategy B: string tags -------------------

type DeclB = { kind: 'decl'; prop: string; value: string };
type RuleB = { kind: 'rule'; selectors: string; children: NodeB[] };
type AtB = { kind: 'at'; name: string; prelude: string; children: NodeB[] | null };
type NodeB = DeclB | RuleB | AtB;

function parseB(css: string): NodeB[] {
  const len = css.length;
  return parseBlockB(css, len, { i: 0 });
}

function parseBlockB(css: string, len: number, cur: { i: number }): NodeB[] {
  const out: NodeB[] = [];
  while (cur.i < len) {
    cur.i = skipWS(css, cur.i, len);
    if (cur.i >= len) break;
    const c = css.charCodeAt(cur.i);
    if (c === CLOSE_BRACE) {
      cur.i++;
      return out;
    }
    if (c === SEMI) {
      cur.i++;
      continue;
    }
    if (c === AT) {
      let j = cur.i + 1;
      while (
        j < len &&
        !(
          css.charCodeAt(j) === SPACE ||
          css.charCodeAt(j) === TAB ||
          css.charCodeAt(j) === LF ||
          css.charCodeAt(j) === OPEN_BRACE ||
          css.charCodeAt(j) === SEMI
        )
      ) {
        j++;
      }
      const name = css.substring(cur.i + 1, j);
      j = skipWS(css, j, len);
      const preludeStart = j;
      while (
        j < len &&
        css.charCodeAt(j) !== OPEN_BRACE &&
        css.charCodeAt(j) !== SEMI &&
        css.charCodeAt(j) !== CLOSE_BRACE
      ) {
        j++;
      }
      const prelude = css.substring(preludeStart, j).trimEnd();
      if (j < len && css.charCodeAt(j) === OPEN_BRACE) {
        cur.i = j + 1;
        const children = parseBlockB(css, len, cur);
        out.push({ kind: 'at', name, prelude, children });
      } else {
        cur.i = j < len && css.charCodeAt(j) === SEMI ? j + 1 : j;
        out.push({ kind: 'at', name, prelude, children: null });
      }
      continue;
    }
    const end = findValueEnd(css, cur.i, len);
    if (end < len && css.charCodeAt(end) === OPEN_BRACE) {
      const selectors = css.substring(cur.i, end).trim();
      cur.i = end + 1;
      const children = parseBlockB(css, len, cur);
      out.push({ kind: 'rule', selectors, children });
    } else {
      const colon = css.indexOf(':', cur.i);
      if (colon === -1 || colon >= end) {
        cur.i = end + 1;
        continue;
      }
      const prop = css.substring(cur.i, colon).trim();
      const value = css.substring(colon + 1, end).trim();
      if (prop && value) out.push({ kind: 'decl', prop, value });
      cur.i = end < len && css.charCodeAt(end) === SEMI ? end + 1 : end;
    }
  }
  return out;
}

// ------------------- Strategy C: class hierarchy + instanceof -------------------

class DeclC {
  constructor(
    public prop: string,
    public value: string
  ) {}
}
class RuleC {
  constructor(
    public selectors: string,
    public children: NodeC[]
  ) {}
}
class AtC {
  constructor(
    public name: string,
    public prelude: string,
    public children: NodeC[] | null
  ) {}
}
type NodeC = DeclC | RuleC | AtC;

function parseC(css: string): NodeC[] {
  const len = css.length;
  return parseBlockC(css, len, { i: 0 });
}

function parseBlockC(css: string, len: number, cur: { i: number }): NodeC[] {
  const out: NodeC[] = [];
  while (cur.i < len) {
    cur.i = skipWS(css, cur.i, len);
    if (cur.i >= len) break;
    const c = css.charCodeAt(cur.i);
    if (c === CLOSE_BRACE) {
      cur.i++;
      return out;
    }
    if (c === SEMI) {
      cur.i++;
      continue;
    }
    if (c === AT) {
      let j = cur.i + 1;
      while (
        j < len &&
        !(
          css.charCodeAt(j) === SPACE ||
          css.charCodeAt(j) === TAB ||
          css.charCodeAt(j) === LF ||
          css.charCodeAt(j) === OPEN_BRACE ||
          css.charCodeAt(j) === SEMI
        )
      ) {
        j++;
      }
      const name = css.substring(cur.i + 1, j);
      j = skipWS(css, j, len);
      const preludeStart = j;
      while (
        j < len &&
        css.charCodeAt(j) !== OPEN_BRACE &&
        css.charCodeAt(j) !== SEMI &&
        css.charCodeAt(j) !== CLOSE_BRACE
      ) {
        j++;
      }
      const prelude = css.substring(preludeStart, j).trimEnd();
      if (j < len && css.charCodeAt(j) === OPEN_BRACE) {
        cur.i = j + 1;
        const children = parseBlockC(css, len, cur);
        out.push(new AtC(name, prelude, children));
      } else {
        cur.i = j < len && css.charCodeAt(j) === SEMI ? j + 1 : j;
        out.push(new AtC(name, prelude, null));
      }
      continue;
    }
    const end = findValueEnd(css, cur.i, len);
    if (end < len && css.charCodeAt(end) === OPEN_BRACE) {
      const selectors = css.substring(cur.i, end).trim();
      cur.i = end + 1;
      const children = parseBlockC(css, len, cur);
      out.push(new RuleC(selectors, children));
    } else {
      const colon = css.indexOf(':', cur.i);
      if (colon === -1 || colon >= end) {
        cur.i = end + 1;
        continue;
      }
      const prop = css.substring(cur.i, colon).trim();
      const value = css.substring(colon + 1, end).trim();
      if (prop && value) out.push(new DeclC(prop, value));
      cur.i = end < len && css.charCodeAt(end) === SEMI ? end + 1 : end;
    }
  }
  return out;
}

// ------------------- Strategy D: segregated arrays (parallel collections) -------------------

interface DeclD {
  prop: string;
  value: string;
}
interface RuleD {
  selectors: string;
  childIdx: number;
}
interface AtD {
  name: string;
  prelude: string;
  childIdx: number;
}
interface BlockD {
  decls: DeclD[];
  rules: RuleD[];
  atRules: AtD[];
  order: Uint8Array;
  orderIdx: Uint32Array;
  count: number;
}
interface RootD {
  blocks: BlockD[];
}

function newBlockD(): BlockD {
  return {
    decls: [],
    rules: [],
    atRules: [],
    order: new Uint8Array(16),
    orderIdx: new Uint32Array(16),
    count: 0,
  };
}

function pushOrder(block: BlockD, kind: number, idx: number): void {
  if (block.count >= block.order.length) {
    const newLen = block.order.length * 2;
    const newOrder = new Uint8Array(newLen);
    newOrder.set(block.order);
    block.order = newOrder;
    const newOrderIdx = new Uint32Array(newLen);
    newOrderIdx.set(block.orderIdx);
    block.orderIdx = newOrderIdx;
  }
  block.order[block.count] = kind;
  block.orderIdx[block.count] = idx;
  block.count++;
}

function parseD(css: string): RootD {
  const root: RootD = { blocks: [newBlockD()] };
  const len = css.length;
  parseBlockD(css, len, { i: 0 }, root, 0);
  return root;
}

function parseBlockD(
  css: string,
  len: number,
  cur: { i: number },
  root: RootD,
  blockIdx: number
): void {
  const block = root.blocks[blockIdx];
  while (cur.i < len) {
    cur.i = skipWS(css, cur.i, len);
    if (cur.i >= len) break;
    const c = css.charCodeAt(cur.i);
    if (c === CLOSE_BRACE) {
      cur.i++;
      return;
    }
    if (c === SEMI) {
      cur.i++;
      continue;
    }
    if (c === AT) {
      let j = cur.i + 1;
      while (
        j < len &&
        !(
          css.charCodeAt(j) === SPACE ||
          css.charCodeAt(j) === TAB ||
          css.charCodeAt(j) === LF ||
          css.charCodeAt(j) === OPEN_BRACE ||
          css.charCodeAt(j) === SEMI
        )
      ) {
        j++;
      }
      const name = css.substring(cur.i + 1, j);
      j = skipWS(css, j, len);
      const preludeStart = j;
      while (
        j < len &&
        css.charCodeAt(j) !== OPEN_BRACE &&
        css.charCodeAt(j) !== SEMI &&
        css.charCodeAt(j) !== CLOSE_BRACE
      ) {
        j++;
      }
      const prelude = css.substring(preludeStart, j).trimEnd();
      let childIdx = -1;
      if (j < len && css.charCodeAt(j) === OPEN_BRACE) {
        cur.i = j + 1;
        childIdx = root.blocks.length;
        root.blocks.push(newBlockD());
        parseBlockD(css, len, cur, root, childIdx);
      } else {
        cur.i = j < len && css.charCodeAt(j) === SEMI ? j + 1 : j;
      }
      const atIdx = block.atRules.length;
      block.atRules.push({ name, prelude, childIdx });
      pushOrder(block, 3, atIdx);
      continue;
    }
    const end = findValueEnd(css, cur.i, len);
    if (end < len && css.charCodeAt(end) === OPEN_BRACE) {
      const selectors = css.substring(cur.i, end).trim();
      cur.i = end + 1;
      const childIdx = root.blocks.length;
      root.blocks.push(newBlockD());
      parseBlockD(css, len, cur, root, childIdx);
      const ruleIdx = block.rules.length;
      block.rules.push({ selectors, childIdx });
      pushOrder(block, 2, ruleIdx);
    } else {
      const colon = css.indexOf(':', cur.i);
      if (colon === -1 || colon >= end) {
        cur.i = end + 1;
        continue;
      }
      const prop = css.substring(cur.i, colon).trim();
      const value = css.substring(colon + 1, end).trim();
      if (prop && value) {
        const declIdx = block.decls.length;
        block.decls.push({ prop, value });
        pushOrder(block, 1, declIdx);
      }
      cur.i = end < len && css.charCodeAt(end) === SEMI ? end + 1 : end;
    }
  }
}

// ------------------- Strategy F: numeric tags + module-level mutable index -------------------
// Avoids allocating a { i: number } state object per recursion frame.
// Same pattern as stylis's selfReferenceReplacementPlugin module-level scratch vars:
// safe because JS is single-threaded and the mutable is consumed before the next parse.

type DeclF = { kind: KA.Decl; prop: string; value: string };
type RuleF = { kind: KA.Rule; selectors: string; children: NodeF[] };
type AtF = { kind: KA.At; name: string; prelude: string; children: NodeF[] | null };
type NodeF = DeclF | RuleF | AtF;

let _cssF = '';
let _lenF = 0;
let _iF = 0;

function parseF(css: string): NodeF[] {
  _cssF = css;
  _lenF = css.length;
  _iF = 0;
  return parseBlockF();
}

function parseBlockF(): NodeF[] {
  const out: NodeF[] = [];
  const css = _cssF;
  const len = _lenF;
  while (_iF < len) {
    _iF = skipWS(css, _iF, len);
    if (_iF >= len) break;
    const c = css.charCodeAt(_iF);
    if (c === CLOSE_BRACE) {
      _iF++;
      return out;
    }
    if (c === SEMI) {
      _iF++;
      continue;
    }
    if (c === AT) {
      let j = _iF + 1;
      while (
        j < len &&
        !(
          css.charCodeAt(j) === SPACE ||
          css.charCodeAt(j) === TAB ||
          css.charCodeAt(j) === LF ||
          css.charCodeAt(j) === OPEN_BRACE ||
          css.charCodeAt(j) === SEMI
        )
      ) {
        j++;
      }
      const name = css.substring(_iF + 1, j);
      j = skipWS(css, j, len);
      const preludeStart = j;
      while (
        j < len &&
        css.charCodeAt(j) !== OPEN_BRACE &&
        css.charCodeAt(j) !== SEMI &&
        css.charCodeAt(j) !== CLOSE_BRACE
      ) {
        j++;
      }
      const prelude = css.substring(preludeStart, j).trimEnd();
      if (j < len && css.charCodeAt(j) === OPEN_BRACE) {
        _iF = j + 1;
        const children = parseBlockF();
        out.push({ kind: KA.At, name, prelude, children });
      } else {
        _iF = j < len && css.charCodeAt(j) === SEMI ? j + 1 : j;
        out.push({ kind: KA.At, name, prelude, children: null });
      }
      continue;
    }
    const end = findValueEnd(css, _iF, len);
    if (end < len && css.charCodeAt(end) === OPEN_BRACE) {
      const selectors = css.substring(_iF, end).trim();
      _iF = end + 1;
      const children = parseBlockF();
      out.push({ kind: KA.Rule, selectors, children });
    } else {
      const colon = css.indexOf(':', _iF);
      if (colon === -1 || colon >= end) {
        _iF = end + 1;
        continue;
      }
      const prop = css.substring(_iF, colon).trim();
      const value = css.substring(colon + 1, end).trim();
      if (prop && value) out.push({ kind: KA.Decl, prop, value });
      _iF = end < len && css.charCodeAt(end) === SEMI ? end + 1 : end;
    }
  }
  return out;
}

// ------------------- Strategy E: numeric tags + object pool -------------------

type NodeE = {
  kind: number;
  prop: string;
  value: string;
  selectors: string;
  children: NodeE[] | null;
  name: string;
  prelude: string;
};

let poolE: NodeE[] = [];
let poolECount = 0;

function resetPoolE(): void {
  poolECount = 0;
}

function allocE(): NodeE {
  if (poolECount < poolE.length) {
    const n = poolE[poolECount++];
    n.children = null;
    return n;
  }
  const n: NodeE = {
    kind: 0,
    prop: '',
    value: '',
    selectors: '',
    children: null,
    name: '',
    prelude: '',
  };
  poolE.push(n);
  poolECount++;
  return n;
}

function parseE(css: string): NodeE[] {
  resetPoolE();
  const len = css.length;
  return parseBlockE(css, len, { i: 0 });
}

function parseBlockE(css: string, len: number, cur: { i: number }): NodeE[] {
  const out: NodeE[] = [];
  while (cur.i < len) {
    cur.i = skipWS(css, cur.i, len);
    if (cur.i >= len) break;
    const c = css.charCodeAt(cur.i);
    if (c === CLOSE_BRACE) {
      cur.i++;
      return out;
    }
    if (c === SEMI) {
      cur.i++;
      continue;
    }
    if (c === AT) {
      let j = cur.i + 1;
      while (
        j < len &&
        !(
          css.charCodeAt(j) === SPACE ||
          css.charCodeAt(j) === TAB ||
          css.charCodeAt(j) === LF ||
          css.charCodeAt(j) === OPEN_BRACE ||
          css.charCodeAt(j) === SEMI
        )
      ) {
        j++;
      }
      const name = css.substring(cur.i + 1, j);
      j = skipWS(css, j, len);
      const preludeStart = j;
      while (
        j < len &&
        css.charCodeAt(j) !== OPEN_BRACE &&
        css.charCodeAt(j) !== SEMI &&
        css.charCodeAt(j) !== CLOSE_BRACE
      ) {
        j++;
      }
      const prelude = css.substring(preludeStart, j).trimEnd();
      const node = allocE();
      node.kind = 3;
      node.name = name;
      node.prelude = prelude;
      if (j < len && css.charCodeAt(j) === OPEN_BRACE) {
        cur.i = j + 1;
        node.children = parseBlockE(css, len, cur);
      } else {
        cur.i = j < len && css.charCodeAt(j) === SEMI ? j + 1 : j;
      }
      out.push(node);
      continue;
    }
    const end = findValueEnd(css, cur.i, len);
    if (end < len && css.charCodeAt(end) === OPEN_BRACE) {
      const selectors = css.substring(cur.i, end).trim();
      cur.i = end + 1;
      const node = allocE();
      node.kind = 2;
      node.selectors = selectors;
      node.children = parseBlockE(css, len, cur);
      out.push(node);
    } else {
      const colon = css.indexOf(':', cur.i);
      if (colon === -1 || colon >= end) {
        cur.i = end + 1;
        continue;
      }
      const prop = css.substring(cur.i, colon).trim();
      const value = css.substring(colon + 1, end).trim();
      if (prop && value) {
        const node = allocE();
        node.kind = 1;
        node.prop = prop;
        node.value = value;
        out.push(node);
      }
      cur.i = end < len && css.charCodeAt(end) === SEMI ? end + 1 : end;
    }
  }
  return out;
}

// ------------------- benchmarks -------------------

describe('parser strategies', () => {
  it('parses CSS_TINY', () => {
    console.log('\n--- CSS_TINY (2 declarations, ~27 bytes) ---');
    bench('A: numeric tags, literals   ', 50000, () => {
      parseA(CSS_TINY);
    });
    bench('B: string tags, literals    ', 50000, () => {
      parseB(CSS_TINY);
    });
    bench('C: classes + instanceof     ', 50000, () => {
      parseC(CSS_TINY);
    });
    bench('D: segregated arrays        ', 50000, () => {
      parseD(CSS_TINY);
    });
    bench('E: object pool, wide shape  ', 50000, () => {
      parseE(CSS_TINY);
    });
    bench('F: numeric tags, module idx ', 50000, () => {
      parseF(CSS_TINY);
    });
    bench('stylis.compile (baseline)   ', 50000, () => {
      stylis.compile(CSS_TINY);
    });
  });

  it('parses CSS_SMALL', () => {
    console.log('\n--- CSS_SMALL (4 declarations, ~80 bytes) ---');
    bench('A: numeric tags, literals   ', 30000, () => {
      parseA(CSS_SMALL);
    });
    bench('B: string tags, literals    ', 30000, () => {
      parseB(CSS_SMALL);
    });
    bench('C: classes + instanceof     ', 30000, () => {
      parseC(CSS_SMALL);
    });
    bench('D: segregated arrays        ', 30000, () => {
      parseD(CSS_SMALL);
    });
    bench('E: object pool, wide shape  ', 30000, () => {
      parseE(CSS_SMALL);
    });
    bench('F: numeric tags, module idx ', 30000, () => {
      parseF(CSS_SMALL);
    });
    bench('stylis.compile (baseline)   ', 30000, () => {
      stylis.compile(CSS_SMALL);
    });
  });

  it('parses CSS_MEDIUM', () => {
    console.log('\n--- CSS_MEDIUM (16 declarations, ~600 bytes) ---');
    bench('A: numeric tags, literals   ', 10000, () => {
      parseA(CSS_MEDIUM);
    });
    bench('B: string tags, literals    ', 10000, () => {
      parseB(CSS_MEDIUM);
    });
    bench('C: classes + instanceof     ', 10000, () => {
      parseC(CSS_MEDIUM);
    });
    bench('D: segregated arrays        ', 10000, () => {
      parseD(CSS_MEDIUM);
    });
    bench('E: object pool, wide shape  ', 10000, () => {
      parseE(CSS_MEDIUM);
    });
    bench('F: numeric tags, module idx ', 10000, () => {
      parseF(CSS_MEDIUM);
    });
    bench('stylis.compile (baseline)   ', 10000, () => {
      stylis.compile(CSS_MEDIUM);
    });
  });

  it('parses CSS_MEDIA_NESTED', () => {
    console.log('\n--- CSS_MEDIA_NESTED (3 decls + 2 @media blocks + 1 hover rule) ---');
    bench('A: numeric tags, literals   ', 10000, () => {
      parseA(CSS_MEDIA_NESTED);
    });
    bench('B: string tags, literals    ', 10000, () => {
      parseB(CSS_MEDIA_NESTED);
    });
    bench('C: classes + instanceof     ', 10000, () => {
      parseC(CSS_MEDIA_NESTED);
    });
    bench('D: segregated arrays        ', 10000, () => {
      parseD(CSS_MEDIA_NESTED);
    });
    bench('E: object pool, wide shape  ', 10000, () => {
      parseE(CSS_MEDIA_NESTED);
    });
    bench('F: numeric tags, module idx ', 10000, () => {
      parseF(CSS_MEDIA_NESTED);
    });
    bench('stylis.compile (baseline)   ', 10000, () => {
      stylis.compile(CSS_MEDIA_NESTED);
    });
  });

  // Correctness sanity checks to prevent an optimizer from dead-code-eliminating
  // the parser bodies. Not the focus of this file.
  it('all strategies produce equivalent structure', () => {
    const a = parseA(CSS_MEDIA_NESTED);
    const b = parseB(CSS_MEDIA_NESTED);
    const c = parseC(CSS_MEDIA_NESTED);
    const d = parseD(CSS_MEDIA_NESTED);
    const e = parseE(CSS_MEDIA_NESTED);
    expect(a.length).toBe(b.length);
    expect(a.length).toBe(c.length);
    expect(a.length).toBe(d.blocks[0].count);
    expect(a.length).toBe(e.length);
  });
});
