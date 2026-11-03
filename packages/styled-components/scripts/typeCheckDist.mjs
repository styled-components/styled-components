#!/usr/bin/env node
/**
 * Published-declaration gate.
 *
 * A library's emitted `.d.ts` is public contract: it must compile for a consumer
 * on any supported peer version and any reasonable tsconfig, never forcing a
 * setting (skipLibCheck, a specific @types version) to dodge errors that
 * originate in the library's OWN types. The type-contract suite only runs
 * against the pinned `@types/react`, so a name that exists there but not on
 * another supported version slips straight into `dist`.
 *
 * Each target compiles the built declarations plus a consumer fixture
 * (`test-types/published-types-consumer.tsx`, which imports the package the way
 * an app does) under `skipLibCheck: false` against exactly one `@types/react`:
 * the oldest supported patch of the supported major, the project's own pinned
 * copy, and the newest. `skipLibCheck: true` is NOT a valid gate here -- it
 * suppresses the very declaration errors this catches.
 *
 * The program loads no `@types/node` (`types: []`): a consumer without it must
 * still compile, so a `NodeJS.*` reference in `dist` is an error here.
 *
 * Diagnostics come from the compiler API rather than parsed tsc text, so every
 * one carries its file and attribution is exact:
 * - in the library's own files (`dist/`, `native/dist/`, the fixture): fails the
 *   run;
 * - in no file at all (a config error, a missing type library, a missing root
 *   file): fails the run, since the check did not run as configured;
 * - inside another package's declarations (react-native globals and the like):
 *   ignored. Those are pre-existing ecosystem conflicts, not this library's
 *   contract, and letting them through would both mask a real break and
 *   manufacture false ones.
 * - zero root files fails the run.
 *
 * Isolation matters, and is why the non-pinned targets are NOT project
 * devDependencies. The repo pins one `@types/react`; a second copy under
 * `node_modules/@types` would make TypeScript auto-include BOTH copies' ambient
 * globals into every normal type-check at once. Instead the pinned target
 * resolves from the project's own copy, and every other target installs into its
 * own gitignored folder under `.type-check-dist/` that no other tsconfig sees,
 * reinstalled whenever its installed versions differ from the ones requested
 * below. Each run selects React by explicit `paths`, so no `@types/react` is
 * ambiently included, and then verifies that every React declaration file in the
 * program came from the target's own folder.
 *
 * Requires `pnpm build` first.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(pkgRoot, 'dist');
const nativeDistDir = join(pkgRoot, 'native', 'dist');
const workDir = join(pkgRoot, '.type-check-dist');
const consumerFixture = join(pkgRoot, 'test-types', 'published-types-consumer.tsx');

const entryFiles = [
  join(distDir, 'index.d.ts'),
  join(distDir, 'plugins', 'index.d.ts'),
  join(nativeDistDir, 'native', 'index.d.ts'),
];

const missing = entryFiles.filter(file => !existsSync(file));
if (missing.length) {
  console.error(
    `type-check-dist: ${missing.map(file => relative(pkgRoot, file)).join(', ')} missing -- run \`pnpm build\` first.`
  );
  process.exit(1);
}

/**
 * Exact-pinned targets installed in isolation, oldest first. `floor` is the
 * oldest patch of the supported React major (the peer floor), `max` the newest;
 * bump `max` deliberately when raising the ceiling.
 */
const ISOLATED = {
  floor: { react: '19.0.0', reactDom: '19.0.0' },
  max: { react: '19.3.0', reactDom: '19.3.0' },
};

const pkgDir = spec => dirname(require.resolve(`${spec}/package.json`));
const versionAt = dir => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
const installedVersion = dir =>
  existsSync(join(dir, 'package.json')) ? versionAt(dir) : 'not installed';

function fail(message) {
  console.error(`type-check-dist: ${message}`);
  process.exit(1);
}

/** Install an exact-pinned @types pair into a folder no other tsconfig sees. */
function isolatedInstall(kind, { react, reactDom }) {
  const root = join(workDir, kind);
  const nm = join(root, 'node_modules', '@types');
  const dirs = { react: join(nm, 'react'), reactDom: join(nm, 'react-dom') };
  const mismatch = () =>
    [
      [dirs.react, react],
      [dirs.reactDom, reactDom],
    ]
      .filter(([dir, wanted]) => installedVersion(dir) !== wanted)
      .map(
        ([dir, wanted]) => `${relative(root, dir)} is ${installedVersion(dir)}, wanted ${wanted}`
      );

  if (mismatch().length) {
    rmSync(root, { force: true, recursive: true });
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"private":true}\n');

    try {
      execFileSync(
        'npm',
        [
          'install',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          '--no-package-lock',
          '--no-save',
          `@types/react@${react}`,
          `@types/react-dom@${reactDom}`,
        ],
        { cwd: root, encoding: 'utf8', stdio: 'pipe' }
      );
    } catch (error) {
      fail(`npm install for the ${kind} target failed:\n${error.stderr || error.message}`);
    }

    const still = mismatch();
    if (still.length) fail(`${kind} target installed the wrong versions: ${still.join('; ')}`);
  }

  return dirs;
}

/**
 * Only react/react-dom are pinned per target; csstype, stylis and react-native
 * resolve the normal way so the runs differ by exactly the surface under test.
 * `types: []` excludes every ambient `@types` package (React's and Node's), so
 * the React in scope is purely what `paths` names and a consumer without
 * `@types/node` is what gets checked.
 */
function configFor({ react, reactDom }) {
  return {
    compilerOptions: {
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
        'styled-components': [join(distDir, 'index.d.ts')],
        'styled-components/native': [join(nativeDistDir, 'native', 'index.d.ts')],
        'styled-components/plugins': [join(distDir, 'plugins', 'index.d.ts')],
      },
      skipLibCheck: false,
      strict: true,
      target: 'ES2020',
      types: [],
    },
    // Every published entry point (the native one pulls react-native in), plus
    // the consumer fixture.
    files: [...entryFiles, consumerFixture],
  };
}

const isOwnFile = fileName => {
  const abs = resolve(fileName);
  return (
    abs.startsWith(distDir + sep) || abs.startsWith(nativeDistDir + sep) || abs === consumerFixture
  );
};

const format = diagnostic => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n    ');
  if (!diagnostic.file) return `  error TS${diagnostic.code}: ${message}`;
  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
  const where = relative(pkgRoot, diagnostic.file.fileName);
  return `  ${where}(${line + 1},${character + 1}): error TS${diagnostic.code}: ${message}`;
};

/**
 * Every `@types/react` / `@types/react-dom` file the program loaded must come
 * from the target's own folder. A leak (an unmapped `react/*` subpath, or a
 * nested copy under react-dom) would put two React copies in scope and test
 * neither faithfully.
 */
function foreignReactFiles(program, { react, reactDom }) {
  const own = [react + sep, reactDom + sep];
  const loaded = program
    .getSourceFiles()
    .map(file => resolve(file.fileName))
    .filter(file => /[\\/]@types[\\/]react(-dom)?[\\/]/.test(file));
  if (!loaded.some(file => file.startsWith(react + sep))) {
    return [`no file from ${relative(pkgRoot, react)} was loaded at all`];
  }
  return loaded
    .filter(file => !own.some(prefix => file.startsWith(prefix)))
    .map(file => relative(pkgRoot, file));
}

mkdirSync(workDir, { recursive: true });

/** The folder is this script's alone; drop installs for targets no longer listed. */
for (const entry of readdirSync(workDir)) {
  if (!(entry in ISOLATED)) rmSync(join(workDir, entry), { force: true, recursive: true });
}

const targets = [
  { kind: 'floor', ...isolatedInstall('floor', ISOLATED.floor) },
  { kind: 'pinned', react: pkgDir('@types/react'), reactDom: pkgDir('@types/react-dom') },
  { kind: 'max', ...isolatedInstall('max', ISOLATED.max) },
];

let failed = false;
for (const target of targets) {
  const label = `@types/react ${versionAt(target.react)} + @types/react-dom ${versionAt(target.reactDom)}`;
  const parsed = ts.parseJsonConfigFileContent(configFor(target), ts.sys, workDir);
  const program = ts.createProgram({
    configFileParsingDiagnostics: parsed.errors,
    options: parsed.options,
    rootNames: parsed.fileNames,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);

  const unattributed = diagnostics.filter(d => !d.file);
  const own = diagnostics.filter(d => d.file && isOwnFile(d.file.fileName));
  const foreign = foreignReactFiles(program, target);
  const noRoots = parsed.fileNames.length === 0;

  if (!unattributed.length && !own.length && !foreign.length && !noRoots) {
    console.log(
      `type-check-dist: ${label} -- dist declarations and consumer fixture compile clean (${parsed.fileNames.length} root files)`
    );
    continue;
  }

  failed = true;
  console.error(`type-check-dist: ${label} -- FAILED`);
  if (noRoots) console.error('  zero root files were resolved (the check itself is misconfigured)');
  if (unattributed.length) {
    console.error(
      `  ${unattributed.length} diagnostic(s) with no file (the check itself is misconfigured):`
    );
    console.error(unattributed.map(format).join('\n'));
  }
  if (own.length) {
    console.error(`  ${own.length} error(s) in dist/ or the consumer fixture:`);
    console.error(own.map(format).join('\n'));
  }
  if (foreign.length) {
    console.error(`  React type files from outside this target's folder:`);
    console.error(foreign.map(file => `    ${file}`).join('\n'));
  }
}

process.exit(failed ? 1 : 0);
