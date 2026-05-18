/**
 * Post-formatter for mitata benchmark results.
 *
 * Mitata's default output auto-scales each row's unit (ns / µs / ms / s)
 * based on magnitude, which makes cross-row comparison awkward. Pair that
 * with `run({ format: 'quiet' })` to capture raw nanosecond stats, then
 * call `printTable(result, opts)` here to render each group with a single
 * unit across all rows.
 *
 * Units are chosen per-group from the slowest avg in the group: anything
 * ≤ 999 µs renders in µs, anything beyond in ms (override with `opts.unit`).
 */

const UNITS = {
  ns: { divisor: 1, label: 'ns', precision: 2 },
  µs: { divisor: 1e3, label: 'µs', precision: 3 },
  ms: { divisor: 1e6, label: 'ms', precision: 3 },
  s: { divisor: 1e9, label: 's', precision: 4 },
};

function pickUnit(medianNs) {
  if (medianNs < 1e3) return 'ns';
  if (medianNs < 1e6) return 'µs';
  if (medianNs < 1e9) return 'ms';
  return 's';
}

function fmt(ns, unit) {
  const u = UNITS[unit];
  return (ns / u.divisor).toFixed(u.precision).padStart(9) + ' ' + u.label;
}

/**
 * Render the benchmarks captured by `await run({ format: 'quiet' })`.
 *
 * @param {{ layout: Array, benchmarks: Array, context: object }} result
 * @param {{ unit?: 'ns'|'µs'|'ms'|'s', headers?: boolean }} [opts]
 */
export function printTable(result, opts = {}) {
  const { layout, benchmarks, context } = result;
  const showHeaders = opts.headers !== false;

  if (showHeaders) {
    console.log(`cpu: ${context.cpu.name}`);
    console.log(
      `runtime: ${context.runtime}${context.version ? ` ${context.version}` : ''} (${context.arch})`
    );
    console.log('');
  }

  // Group benchmarks by their `group` field, which is an index into the
  // `layout` array. Mitata's layout includes boundary collections for
  // `summary`/`group` scopes, so we walk benches and bucket by group id.
  const byGroup = new Map();
  for (const bench of benchmarks) {
    const gid = bench.group;
    if (!byGroup.has(gid)) byGroup.set(gid, []);
    byGroup.get(gid).push(bench);
  }

  // Render groups in layout order (skipping unnamed scaffolding scopes).
  for (let gid = 0; gid < layout.length; gid++) {
    const group = byGroup.get(gid);
    if (!group || group.length === 0) continue;

    const groupName = layout[gid]?.name ?? null;

    const slowest = group.reduce((max, b) => Math.max(max, b.runs?.[0]?.stats?.avg ?? 0), 0);
    const unit = opts.unit ?? pickUnit(slowest);

    const nameWidth = Math.max(
      'benchmark'.length,
      ...group.map(b => (b.runs?.[0]?.name ?? b.alias ?? '').length)
    );

    if (groupName) console.log(`• ${groupName}`);
    const header =
      'benchmark'.padEnd(nameWidth) +
      '   ' +
      'avg/iter'.padStart(12) +
      '   ' +
      'median'.padStart(12) +
      '   ' +
      'p99'.padStart(12);
    console.log(header);
    console.log('-'.repeat(header.length));

    for (const bench of group) {
      const name = bench.runs?.[0]?.name ?? bench.alias ?? '';
      const r = bench.runs?.[0];
      if (!r) {
        console.log(name.padEnd(nameWidth) + '   (no runs)');
        continue;
      }
      if (r.error) {
        console.log(`${name.padEnd(nameWidth)}   error: ${r.error.message ?? r.error}`);
        continue;
      }
      const { avg, p50, p99 } = r.stats;
      console.log(
        name.padEnd(nameWidth) +
          '   ' +
          fmt(avg, unit) +
          '   ' +
          fmt(p50, unit) +
          '   ' +
          fmt(p99, unit)
      );
    }
    console.log('');
  }
}
