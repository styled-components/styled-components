#!/usr/bin/env node
/**
 * Pretty-print bench results from one or more receiver output files.
 *
 * Usage:
 *   node scripts/format-report.mjs [path...]
 *
 * Default: all results-*.json files under .bench-results, in mtime order.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd(), '.bench-results');
const args = process.argv.slice(2);

const files = (args.length ? args : readdirSync(ROOT).filter((n) => n.endsWith('.json')).map((n) => resolve(ROOT, n)))
  .map((p) => ({ path: p, mtime: statSync(p).mtimeMs }))
  .sort((a, b) => a.mtime - b.mtime)
  .map((x) => x.path);

if (files.length === 0) {
  console.error('no results files found');
  process.exit(1);
}

const fmt = (n, p = 2) => (n == null || Number.isNaN(n) ? '-'.padStart(p + 5) : n.toFixed(p).padStart(p + 5));

for (const f of files) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  const tag = data.tag ?? '?';
  const libs = data.libs?.length ? data.libs.join(',') : '(all)';

  console.log('');
  console.log(`=== ${tag} (libs: ${libs}) — ${f.replace(ROOT + '/', '')} ===`);
  console.log(
    [
      'library'.padEnd(28),
      'case'.padEnd(32),
      'mean'.padStart(9),
      'trim'.padStart(9),
      'med'.padStart(9),
      '±std'.padStart(8),
      'iqr'.padStart(8),
      'min'.padStart(9),
      'max'.padStart(9),
      'n'.padStart(5),
      'wu'.padStart(4),
    ].join(' ')
  );
  console.log('-'.repeat(140));

  for (const r of data.results ?? []) {
    const res = r.result || {};
    console.log(
      [
        (r.implName ?? '').padEnd(28),
        (r.caseName ?? '').padEnd(32),
        `${fmt(res.mean)}ms`,
        `${fmt(res.trimmedMean)}ms`,
        `${fmt(res.median)}ms`,
        `${fmt(res.stdDev)}`,
        `${fmt(res.iqr)}`,
        `${fmt(res.min)}ms`,
        `${fmt(res.max)}ms`,
        String(res.sampleCount ?? '-').padStart(5),
        String(res.warmupCount ?? '-').padStart(4),
      ].join(' ')
    );
  }
}

// Bonus: cross-run comparison if multiple files share the same (lib, case)
if (files.length > 1) {
  const grouped = new Map();
  for (const f of files) {
    const data = JSON.parse(readFileSync(f, 'utf8'));
    for (const r of data.results ?? []) {
      const key = `${r.implName}__${r.caseName}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ tag: data.tag, file: f, result: r.result });
    }
  }

  console.log('');
  console.log('=== cross-run comparison (median, ms) ===');
  for (const [key, rows] of grouped) {
    if (rows.length < 2) continue;
    const [implName, caseName] = key.split('__');
    const cells = rows
      .map((row) => `${row.tag}=${row.result?.median?.toFixed?.(2) ?? '-'}`)
      .join('  ');
    console.log(`${implName.padEnd(28)} ${caseName.padEnd(32)}  ${cells}`);
  }
}
