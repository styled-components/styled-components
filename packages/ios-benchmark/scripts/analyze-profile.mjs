#!/usr/bin/env node
/**
 * Print the hottest functions of a CPU profile: `self` time (the function was
 * the leaf at the sample point) and `total` time (the function was anywhere on
 * the stack, counted once per sample even when it recurses).
 *
 * Two formats are detected from the file's contents, whatever its extension:
 * - Hermes trace-event JSON, which the benchmark app writes on the iOS
 *   simulator: `samples[]` entries carry `ts` (microseconds) and `sf` (a stack
 *   frame id); `stackFrames` maps each id to `{ name, parent, category, ... }`.
 * - Chrome `.cpuprofile`: `nodes[]` (with `callFrame` and `children`),
 *   `samples[]` of node ids, and `timeDeltas[]` in microseconds.
 *
 * A sample's time is the gap to the next sample (the last sample gets the mean
 * gap). Exits 1 on bad usage and 2 when the file is neither format or the
 * parsed total time is zero.
 *
 * Usage: node scripts/analyze-profile.mjs <profile> [--top N]
 */
import { readFileSync } from 'node:fs';

const USAGE =
  'usage: analyze-profile.mjs <profile> [--top N]\naccepted formats: Hermes trace-event JSON (samples[].sf + stackFrames), Chrome .cpuprofile (nodes + samples + timeDeltas)';
const ACCEPTED =
  'Hermes trace-event JSON (samples[].sf + stackFrames) or Chrome .cpuprofile (nodes + samples + timeDeltas)';

const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--top');
const topIdx = args.indexOf('--top');
const top = (topIdx === -1 ? 0 : Number(args[topIdx + 1])) || 25;

if (!file) {
  console.error(USAGE);
  process.exit(1);
}

const fail = message => {
  console.error(`analyze-profile: ${file}: ${message}`);
  process.exit(2);
};

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  fail(`cannot read as JSON (${error.message}). Accepted formats: ${ACCEPTED}.`);
}

const isObject = v => v !== null && typeof v === 'object';
const isHermes =
  isObject(data) &&
  isObject(data.stackFrames) &&
  Array.isArray(data.samples) &&
  data.samples.length > 0 &&
  isObject(data.samples[0]) &&
  'sf' in data.samples[0];
const isCpuProfile =
  isObject(data) &&
  Array.isArray(data.nodes) &&
  Array.isArray(data.samples) &&
  Array.isArray(data.timeDeltas) &&
  data.samples.length > 0 &&
  typeof data.samples[0] === 'number';

/** A function's identity: where it is defined, not where it was called from. */
const key = (name, url, line) => `${name}\u0000${url}\u0000${line}`;

/**
 * Normalizes either format to `functions` (index -> { name, loc }), `parent`
 * (index -> index or -1) and `stacks`: per sample, the leaf index and its
 * duration in microseconds.
 */
const readHermes = () => {
  const indexByKey = new Map();
  const functions = [];
  const parent = [];
  const frameIndex = new Map(); // stack frame id -> function index (one per frame)
  const frames = data.stackFrames;

  const resolve = id => {
    const cached = frameIndex.get(id);
    if (cached !== undefined) return cached;

    const frame = frames[id];
    if (!frame) return -1;

    // Hermes appends the call-site "(url:line:col)" to the name; the function's own position is funcLine/funcColumn.
    const match = /^(.*)\((.*):\d+:\d+\)$/.exec(frame.name);
    const name =
      (match ? match[1] : frame.name) ||
      (frame.category === 'JavaScript' ? '(anonymous)' : `(${frame.category ?? 'unknown'})`);
    const url = match ? match[2] : '';
    const line = frame.funcLine ?? '';
    const k = key(name, url, line);

    let index = indexByKey.get(k);
    if (index === undefined) {
      index = functions.length;
      indexByKey.set(k, index);
      functions.push({ name, loc: url ? `${url.replace(/^.*\//, '')}:${line}` : '' });
    }
    frameIndex.set(id, index);
    return index;
  };

  const frameParent = new Map();
  const walkParent = id => {
    const p = frames[id]?.parent;
    return p === undefined ? undefined : String(p);
  };

  const samples = data.samples;
  const stacks = [];
  let unresolved = 0;
  for (let i = 0; i < samples.length; i++) {
    const id = String(samples[i].sf);
    const leaf = resolve(id);
    if (leaf === -1) {
      unresolved++;
      continue;
    }

    // Chain of function indexes from leaf to root.
    const chain = [];
    for (let cur = id; cur !== undefined && frames[cur]; cur = walkParent(cur)) {
      let chainEntry = frameParent.get(cur);
      if (chainEntry === undefined) {
        chainEntry = resolve(cur);
        frameParent.set(cur, chainEntry);
      }
      chain.push(chainEntry);
    }

    const next = samples[i + 1]?.ts;
    stacks.push({
      chain,
      us: next === undefined ? undefined : Math.max(0, Number(next) - Number(samples[i].ts)),
    });
  }

  return { functions, stacks, unresolved };
};

const readCpuProfile = () => {
  const indexByKey = new Map();
  const functions = [];
  const nodeFunction = new Map(); // node id -> function index
  const nodeParent = new Map(); // node id -> parent node id

  for (const node of data.nodes) {
    const cf = node.callFrame ?? {};
    const name = cf.functionName || '(anonymous)';
    const url = cf.url ?? '';
    const k = key(name, url, cf.lineNumber ?? '');

    let index = indexByKey.get(k);
    if (index === undefined) {
      index = functions.length;
      indexByKey.set(k, index);
      functions.push({
        name,
        loc: url
          ? `${url.replace(/^.*\/(packages|node_modules)\//, '$1/')}:${(cf.lineNumber ?? -1) + 1}`
          : '',
      });
    }
    nodeFunction.set(node.id, index);
    for (const child of node.children ?? []) nodeParent.set(child, node.id);
    if (node.parent !== undefined) nodeParent.set(node.id, node.parent);
  }

  const { samples, timeDeltas } = data;
  const absolute = [];
  let t = 0;
  for (let i = 0; i < samples.length; i++) {
    t += timeDeltas[i] ?? 0;
    absolute.push(t);
  }

  const stacks = [];
  let unresolved = 0;
  for (let i = 0; i < samples.length; i++) {
    if (!nodeFunction.has(samples[i])) {
      unresolved++;
      continue;
    }
    const chain = [];
    for (
      let cur = samples[i];
      cur !== undefined && nodeFunction.has(cur);
      cur = nodeParent.get(cur)
    ) {
      chain.push(nodeFunction.get(cur));
    }
    const next = absolute[i + 1];
    stacks.push({ chain, us: next === undefined ? undefined : Math.max(0, next - absolute[i]) });
  }

  return { functions, stacks, unresolved };
};

if (!isHermes && !isCpuProfile) {
  fail(`unrecognized profile format. Accepted formats: ${ACCEPTED}.`);
}

const format = isHermes ? 'hermes-trace' : 'cpuprofile';
const { functions, stacks, unresolved } = isHermes ? readHermes() : readCpuProfile();

// The last sample has no successor; it gets the mean of the other gaps.
const known = stacks.filter(s => s.us !== undefined);
const meanUs = known.length === 0 ? 0 : known.reduce((a, s) => a + s.us, 0) / known.length;

const self = new Float64Array(functions.length);
const total = new Float64Array(functions.length);
let totalUs = 0;
const seen = new Uint32Array(functions.length);
let stamp = 0;

for (const { chain, us: rawUs } of stacks) {
  const us = rawUs ?? meanUs;
  totalUs += us;
  self[chain[0]] += us;

  stamp++;
  for (const f of chain) {
    if (seen[f] === stamp) continue;
    seen[f] = stamp;
    total[f] += us;
  }
}

if (!(totalUs > 0)) {
  fail(
    `parsed ${stacks.length} samples but their total time is zero (timestamps missing or all equal). Accepted formats: ${ACCEPTED}.`
  );
}

const totalMs = totalUs / 1000;
const fmt = (n, p = 2, w = 9) => n.toFixed(p).padStart(w);
const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n));

const rows = functions
  .map((fn, i) => ({ ...fn, selfMs: self[i] / 1000, totalMs: total[i] / 1000 }))
  .filter(r => r.selfMs > 0 || r.totalMs > 0)
  .sort((a, b) => b.selfMs - a.selfMs || b.totalMs - a.totalMs);

console.log(`profile: ${file} (${format})`);
console.log(
  `total time: ${totalMs.toFixed(2)} ms across ${stacks.length} samples${unresolved ? `, ${unresolved} unresolved` : ''}`
);
console.log('');
console.log(
  `${'self_ms'.padStart(9)} ${'self%'.padStart(6)} ${'total_ms'.padStart(9)} ${'total%'.padStart(6)}  ${'function'.padEnd(48)}  location`
);
console.log('-'.repeat(140));

for (const r of rows.slice(0, top)) {
  console.log(
    `${fmt(r.selfMs)} ${fmt((r.selfMs / totalMs) * 100, 1, 5)}% ${fmt(r.totalMs)} ${fmt((r.totalMs / totalMs) * 100, 1, 5)}%  ${truncate(r.name, 48)}  ${r.loc}`
  );
}
