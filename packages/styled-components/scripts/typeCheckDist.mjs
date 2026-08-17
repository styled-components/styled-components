#!/usr/bin/env node
/**
 * Published-declaration gate.
 *
 * A library's emitted `.d.ts` is public contract: it must compile for a consumer
 * on any supported peer version and any reasonable tsconfig, never forcing a
 * setting (skipLibCheck, a specific @types version) to dodge errors that
 * originate in the library's OWN types. The type-contract suite only runs against
 * the pinned `@types/react` 18, so a name that exists there but not on a newer
 * major slips straight into `dist` -- `propTypes?: React.WeakValidationMap<P>`
 * compiled clean on 18 and shipped a `TS2694` into every strict React 19
 * consumer's build (`WeakValidationMap` was removed on `@types/react` 19).
 *
 * This checks the built declarations under `skipLibCheck: false` against the
 * minimum and maximum supported `@types/react` majors, failing on any diagnostic
 * located in the package's own `dist/`. Errors inside dependency `.d.ts`
 * (react-native, node/dom global collisions) are filtered out: they are
 * pre-existing ecosystem conflicts, not this library's contract, and letting them
 * through would both mask a real break and manufacture false ones. `skipLibCheck:
 * true` is NOT a valid gate here -- it suppresses the very declaration errors this
 * catches (verified: the WeakValidationMap break reports zero errors under it).
 *
 * Isolation matters, and is why the peer majors are NOT project devDependencies.
 * The repo pins `@types/react` 18; adding a second copy under `node_modules/@types`
 * would make TypeScript auto-include BOTH majors' ambient globals into every normal
 * type-check at once (the repo leaves `types` unset), so "which React is in scope"
 * would be both, and only `skipLibCheck: true` would hide the resulting global
 * collisions. Instead the min resolves from the project's own pinned copy and the
 * max is installed into a gitignored, path-scoped folder that no other tsconfig
 * sees. Each run compiles against EXACTLY ONE major, chosen by explicit `paths`
 * with `types: ['node']` so no `@types/react` is ambiently included, and prints the
 * resolved version so the log always says what was tested.
 *
 * Requires `pnpm build` first.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(pkgRoot, 'dist');
const workDir = join(pkgRoot, '.type-check-dist');
const tscPath = require.resolve('typescript/lib/tsc.js');

if (!existsSync(join(distDir, 'index.d.ts'))) {
  console.error('type-check-dist: dist/index.d.ts missing -- run `pnpm build` first.');
  process.exit(1);
}

// The maximum-major @types to test, pinned so a run is deterministic and the log
// says exactly what was checked. Bump deliberately when raising the supported
// ceiling; the minimum comes from the project's own pinned `@types/react`.
const MAX = { react: '@types/react@19.2.18', reactDom: '@types/react-dom@19.2.3' };

const pkgDir = spec => dirname(require.resolve(`${spec}/package.json`));
const versionAt = dir => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;

/** Install the max-major @types into a path-scoped folder no other tsconfig sees. */
function isolatedMax() {
  const root = join(workDir, 'max');
  if (!existsSync(join(root, 'node_modules', '@types', 'react', 'package.json'))) {
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"private":true}\n');
    execFileSync('npm', ['install', '--no-save', '--no-package-lock', MAX.react, MAX.reactDom], {
      cwd: root,
      stdio: 'ignore',
    });
  }
  const nm = join(root, 'node_modules', '@types');
  return { react: join(nm, 'react'), reactDom: join(nm, 'react-dom') };
}

// Only react/react-dom are pinned per target; csstype, @types/node, stylis and
// react-native resolve the normal way so the two runs differ by exactly the
// surface under test. `types: ['node']` keeps @types/node's ambient globals
// (dist references the NodeJS namespace) while excluding every @types/react from
// the ambient set, so the React in scope is purely what `paths` names.
function configFor(react, reactDom) {
  return {
    compilerOptions: {
      baseUrl: pkgRoot,
      jsx: 'react-jsx',
      lib: ['ES2021', 'DOM'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      noEmit: true,
      paths: {
        react: [react],
        'react/jsx-runtime': [join(react, 'jsx-runtime')],
        'react/jsx-dev-runtime': [join(react, 'jsx-dev-runtime')],
        'react-dom': [reactDom],
        'react-dom/server': [join(reactDom, 'server')],
        'react-dom/client': [join(reactDom, 'client')],
      },
      skipLibCheck: false,
      strict: true,
      target: 'ES2020',
      types: ['node'],
    },
    // Both published entry points; the native entry is what pulls react-native in.
    files: [join(distDir, 'index.d.ts'), join(distDir, 'native', 'index.d.ts')],
  };
}

/** Lines like `path/to/file.d.ts(12,5): error TS2694: ...`; keep only own-dist ones. */
function ownDistErrors(output) {
  const out = [];
  for (const line of output.split('\n')) {
    const m = /^(.*\.d\.ts)\(\d+,\d+\): error TS/.exec(line);
    if (!m) continue;
    const abs = resolve(pkgRoot, m[1]);
    if (abs.startsWith(distDir)) out.push(`  ${relative(pkgRoot, abs)}${line.slice(m[1].length)}`);
  }
  return out;
}

mkdirSync(workDir, { recursive: true });

const min = { react: pkgDir('@types/react'), reactDom: pkgDir('@types/react-dom') };
const max = isolatedMax();
const targets = [
  { kind: 'min', ...min },
  { kind: 'max', ...max },
];

let failed = false;
for (const target of targets) {
  const cfg = join(workDir, `tsconfig.${target.kind}.json`);
  writeFileSync(cfg, `${JSON.stringify(configFor(target.react, target.reactDom), null, 2)}\n`);

  let output = '';
  try {
    execFileSync(process.execPath, [tscPath, '-p', cfg], { encoding: 'utf8' });
  } catch (error) {
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }

  const label = `@types/react ${versionAt(target.react)}`;
  const errors = ownDistErrors(output);
  if (errors.length) {
    failed = true;
    console.error(`type-check-dist: ${label} -- ${errors.length} error(s) in dist/:`);
    console.error(errors.join('\n'));
  } else {
    console.log(`type-check-dist: ${label} -- dist declarations compile clean`);
  }
  rmSync(cfg, { force: true });
}

process.exit(failed ? 1 : 0);
