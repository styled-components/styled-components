#!/usr/bin/env node
/**
 * Bundle size report.
 *
 *   pnpm --filter styled-components size                  build, then report
 *   pnpm --filter styled-components size --no-build       report on the existing dist
 *   pnpm --filter styled-components size --attribute      also print per-source-file bytes
 *
 * Output (key=value, kB = 1024 bytes):
 *
 *   webpack_gzip_bytes=<n> webpack_gzip_kb=<n.nn>
 *   min_gzip_bytes=<n> min_gzip_kb=<n.nn>
 *
 * The build is `rollup -c` limited to the two bundles the metric reads (the
 * browser ESM and the standalone min.js) through `SC_BUILD_ONLY=size` in
 * rollup.config.mjs. The webpack number is the consumer bundle defined in
 * scripts/consumerBundle.js, the same one the "production bundle size with real
 * bundler tree-shaking" test in src/test/treeshake.test.ts measures.
 *
 * `--attribute` composes two source maps (webpack bundle to browser ESM, browser
 * ESM to src/) and charges every byte of the bundle to the source file that
 * produced it, with webpack's own entry module as `entry:<file>`. It prints a
 * `raw_bytes gzip_share source` table, a `total` row, and
 * `unmapped_bytes=<n> unmapped_percent=<n.n>` for bytes the maps do not cover.
 * `gzip_share` is each file's share of the whole bundle's gzip size
 * (proportional to raw bytes, rounded per row), so the column sums to the
 * `total` row only approximately.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const { buildConsumerBundle } = require('./consumerBundle.js');

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(pkgDir, 'dist');

const args = new Set(process.argv.slice(2));
const unknownArgs = [...args].filter(arg => !['--attribute', '--no-build'].includes(arg));

if (unknownArgs.length > 0) {
  console.error(
    `size: unknown option ${unknownArgs.join(' ')}. Supported: --attribute, --no-build.`
  );
  process.exit(2);
}

const kb = bytes => (bytes / 1024).toFixed(2);

if (!args.has('--no-build')) {
  const build = spawnSync('pnpm', ['exec', 'rollup', '-c'], {
    cwd: pkgDir,
    encoding: 'utf8',
    env: { ...process.env, SC_BUILD_ONLY: 'size' },
  });

  if (build.status !== 0) {
    console.error(build.stdout);
    console.error(build.stderr);
    console.error('size: the partial rollup build failed (output above).');
    process.exit(1);
  }
}

const minFile = path.join(distDir, 'styled-components.min.js');
const esmFile = path.join(distDir, 'styled-components.browser.esm.js');

for (const file of [minFile, esmFile]) {
  if (!fs.existsSync(file)) {
    console.error(`size: ${file} is missing. Run without --no-build to build it.`);
    process.exit(1);
  }
}

const { bundle, map } = await buildConsumerBundle({
  distDir,
  sourceMap: args.has('--attribute'),
});
const bundleGzip = zlib.gzipSync(bundle).length;
const minGzip = zlib.gzipSync(fs.readFileSync(minFile)).length;

console.log(`webpack_gzip_bytes=${bundleGzip} webpack_gzip_kb=${kb(bundleGzip)}`);
console.log(`min_gzip_bytes=${minGzip} min_gzip_kb=${kb(minGzip)}`);

if (map !== undefined) {
  printAttribution({ bundle, bundleGzip, webpackMap: map });
}

/**
 * Charges each byte of `bundle` to a source file and prints the table.
 */
function printAttribution({ bundle, bundleGzip, webpackMap }) {
  const { SourceMapConsumer } = require('source-map');

  const esmMapFile = `${esmFile}.map`;

  if (!fs.existsSync(esmMapFile)) {
    console.error(`size: ${esmMapFile} is missing. Run without --no-build to build it.`);
    process.exit(1);
  }

  const bundleMap = new SourceMapConsumer(JSON.parse(webpackMap));
  const esmMap = new SourceMapConsumer(JSON.parse(fs.readFileSync(esmMapFile, 'utf8')));

  const mappingsByLine = new Map();

  bundleMap.eachMapping(
    mapping => {
      const line = mappingsByLine.get(mapping.generatedLine) ?? [];
      line.push(mapping);
      mappingsByLine.set(mapping.generatedLine, line);
    },
    null,
    SourceMapConsumer.GENERATED_ORDER
  );

  const bytesBySource = new Map();
  const charge = (source, text) => {
    bytesBySource.set(source, (bytesBySource.get(source) ?? 0) + Buffer.byteLength(text));
  };

  const lines = bundle.split('\n');

  lines.forEach((line, lineIndex) => {
    const newline = lineIndex + 1 < lines.length ? '\n' : '';
    const mappings = mappingsByLine.get(lineIndex + 1) ?? [];

    if (mappings.length === 0) {
      charge('unmapped', line + newline);
      return;
    }

    if (mappings[0].generatedColumn > 0) {
      charge('unmapped', line.slice(0, mappings[0].generatedColumn));
    }

    mappings.forEach((mapping, index) => {
      const next = mappings[index + 1];
      const text =
        line.slice(mapping.generatedColumn, next?.generatedColumn) + (next ? '' : newline);

      if (mapping.source == null) {
        charge('unmapped', text);
      } else if (mapping.source.includes('styled-components.browser.esm.js')) {
        const original = esmMap.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn,
        });

        charge(original.source ? original.source.replace(/^.*\/src\//, 'src/') : 'unmapped', text);
      } else {
        charge(`entry:${path.basename(mapping.source)}`, text);
      }
    });
  });

  const totalBytes = Buffer.byteLength(bundle);
  const rows = [...bytesBySource.entries()].sort((a, b) => b[1] - a[1]);
  const gzipShare = bytes => Math.round((bytes / totalBytes) * bundleGzip);

  console.log('');
  console.log(`${'raw_bytes'.padStart(10)} ${'gzip_share'.padStart(10)}  source`);

  for (const [source, bytes] of rows) {
    console.log(
      `${String(bytes).padStart(10)} ${String(gzipShare(bytes)).padStart(10)}  ${source}`
    );
  }

  const unmappedBytes = bytesBySource.get('unmapped') ?? 0;

  console.log(`${String(totalBytes).padStart(10)} ${String(bundleGzip).padStart(10)}  total`);
  console.log(
    `unmapped_bytes=${unmappedBytes} unmapped_percent=${((unmappedBytes / totalBytes) * 100).toFixed(1)}`
  );
}
