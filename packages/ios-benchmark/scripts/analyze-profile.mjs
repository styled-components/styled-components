#!/usr/bin/env node
/**
 * Read a Chrome DevTools .cpuprofile and print the top self-time frames.
 * `self` time = samples where this node is the leaf (the function actually
 * running at the sample point), not aggregate time including descendants.
 *
 * Usage: node scripts/analyze-profile.mjs <path.cpuprofile> [--top N]
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];
const top = Number(args[args.indexOf('--top') + 1]) || 25;

if (!file) {
  console.error('usage: analyze-profile.mjs <path.cpuprofile> [--top N]');
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, 'utf8'));
const { nodes = [], samples = [], timeDeltas = [] } = data;

const byId = new Map(nodes.map((n) => [n.id, n]));
const selfTime = new Map(); // nodeId -> ms

for (let i = 0; i < samples.length; i++) {
  const id = samples[i];
  const dt = timeDeltas[i] ?? 0;
  selfTime.set(id, (selfTime.get(id) ?? 0) + dt);
}

const totalUs = [...selfTime.values()].reduce((a, b) => a + b, 0);
const totalMs = totalUs / 1000;

const fmt = (n, p = 2, w = 7) => n.toFixed(p).padStart(w);
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));

const rows = [...selfTime.entries()]
  .map(([id, us]) => {
    const node = byId.get(id) || { callFrame: { functionName: '?', url: '', lineNumber: -1 } };
    const cf = node.callFrame;
    const name = cf.functionName || '(anonymous)';
    const url = cf.url ? cf.url.replace(/^.*\/(packages|node_modules)\//, '$1/') : '';
    return { ms: us / 1000, name, url, line: cf.lineNumber };
  })
  .sort((a, b) => b.ms - a.ms);

console.log(`profile: ${file}`);
console.log(`total self time: ${totalMs.toFixed(2)} ms across ${samples.length} samples`);
console.log('');
console.log(`${'self_ms'.padStart(7)} ${'%'.padStart(6)}  function${' '.repeat(40)}url:line`);
console.log('-'.repeat(140));

for (let i = 0; i < Math.min(top, rows.length); i++) {
  const r = rows[i];
  const pct = (r.ms / totalMs) * 100;
  const fn = truncate(r.name, 48);
  const loc = r.url ? `${r.url}:${r.line + 1}` : '';
  console.log(`${fmt(r.ms)} ${fmt(pct, 2, 5)}%  ${fn}  ${loc}`);
}
