#!/usr/bin/env node
/**
 * Per-module size attribution for the standalone production bundle.
 *
 * Builds `src/index-standalone.ts` with the standalone production config from
 * `rollup.config.mjs` (same build constants, same terser settings), except
 * with `preserveModules`, so every source module that survives tree-shaking
 * becomes its own minified file. Prints each module's minified bytes and
 * gzip -9 bytes, largest gzip first, then the sums.
 *
 * Scope and blind spots:
 * - Covers the web standalone bundle only (no server, browser ESM, native, or
 *   plugin entries).
 * - Each file is minified and gzipped alone, so names terser would mangle
 *   across module boundaries and repeats gzip would share between modules
 *   are counted in every module. The sum is therefore larger than the size of
 *   the real single-file bundle; use it to see where bytes live and how a
 *   change moves them, not as the shipped size (`pnpm build` then
 *   `jest -c jest.config.build.js` reports that).
 * - Output goes to a fresh temporary folder, never `dist/`.
 *
 * Run from packages/styled-components:
 *   node scripts/moduleSizes.mjs                     print the table
 *   node scripts/moduleSizes.mjs --save a.json       also write the sizes as JSON
 *   node scripts/moduleSizes.mjs --compare a.json    add a gzip delta column against a saved run
 *
 * Comparing two revisions: run with `--save` on one checkout, then with
 * `--compare` on the other. Modules present on only one side show the other
 * side as 0.
 */
import typescript from '@rollup/plugin-typescript';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { rollup } from 'rollup';

const startDir = process.cwd();
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(packageRoot);

const args = process.argv.slice(2);
function option(name) {
  const at = args.indexOf(name);
  if (at === -1) return undefined;
  const value = args[at + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${name} needs a file path, e.g. ${name} sizes.json`);
  }
  return resolve(startDir, value);
}
const savePath = option('--save');
const comparePath = option('--compare');
for (const arg of args) {
  if (arg.startsWith('--') && arg !== '--save' && arg !== '--compare') {
    throw new Error(`Unknown option ${arg}. Options: --save <file>, --compare <file>.`);
  }
}

const { default: configs } = await import('./../rollup.config.mjs');
const standaloneProd = configs.find(
  config => config.output && config.output.file === 'dist/styled-components.min.js'
);
if (standaloneProd === undefined) {
  throw new Error(
    'rollup.config.mjs has no config writing dist/styled-components.min.js; update the lookup in scripts/moduleSizes.mjs to the standalone production config.'
  );
}

const outDir = mkdtempSync(join(tmpdir(), 'sc-module-sizes-'));
try {
  const plugins = [
    typescript({
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'dist', 'src/test/types.tsx'],
      tsconfig: './tsconfig.json',
      compilerOptions: {
        declaration: false,
        declarationMap: false,
        incremental: false,
        noEmit: false,
        outDir,
      },
    }),
    ...standaloneProd.plugins.filter(plugin => !plugin || plugin.name !== 'typescript'),
  ];
  const bundle = await rollup({
    external: standaloneProd.external,
    input: standaloneProd.input,
    onwarn(warning, warn) {
      if (warning.code !== 'CIRCULAR_DEPENDENCY') warn(warning);
    },
    plugins,
    treeshake: standaloneProd.treeshake,
  });
  await bundle.write({
    dir: outDir,
    exports: 'named',
    format: 'esm',
    preserveModules: true,
    preserveModulesRoot: 'src',
    sourcemap: false,
  });
  await bundle.close();

  const sizes = {};
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.js')) {
        const code = readFileSync(path);
        sizes[relative(outDir, path)] = {
          gzip: gzipSync(code, { level: 9 }).length,
          min: code.length,
        };
      }
    }
  };
  walk(outDir);

  const names = Object.keys(sizes);
  if (names.length === 0) throw new Error(`The build wrote no .js files to ${outDir}.`);

  const previous = comparePath === undefined ? null : JSON.parse(readFileSync(comparePath, 'utf8'));
  const all = previous === null ? names : [...new Set([...names, ...Object.keys(previous)])];
  const gzipOf = (table, name) => (table[name] ? table[name].gzip : 0);
  all.sort((a, b) => gzipOf(sizes, b) - gzipOf(sizes, a) || a.localeCompare(b));

  const width = Math.max(...all.map(name => name.length));
  let totalMin = 0;
  let totalGzip = 0;
  let totalPrevious = 0;
  for (const name of all) {
    const now = sizes[name] || { gzip: 0, min: 0 };
    totalMin += now.min;
    totalGzip += now.gzip;
    let line = `${name.padEnd(width)}  ${String(now.min).padStart(7)} min  ${String(now.gzip).padStart(6)} gz`;
    if (previous !== null) {
      const before = gzipOf(previous, name);
      totalPrevious += before;
      const delta = now.gzip - before;
      line += `  ${(delta > 0 ? '+' : '') + delta} gz`;
    }
    console.log(line);
  }
  let summary = `\n${names.length} modules  ${totalMin} min  ${totalGzip} gz (sum of per-module sizes)`;
  if (previous !== null) {
    const delta = totalGzip - totalPrevious;
    summary += `  ${(delta > 0 ? '+' : '') + delta} gz against ${relative(startDir, comparePath)}`;
  }
  console.log(summary);

  if (savePath !== undefined) writeFileSync(savePath, JSON.stringify(sizes, null, 2) + '\n');
} finally {
  rmSync(outDir, { force: true, recursive: true });
}
