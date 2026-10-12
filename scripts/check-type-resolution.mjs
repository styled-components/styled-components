#!/usr/bin/env node
/**
 * Type-resolution gate for pnpm's global virtual store (`virtualStoreType: global`).
 *
 * TypeScript resolves from each package's real path in the shared store, where only that
 * package's declared dependencies sit beside it. A published `.d.ts` that imports a package it
 * does not declare (typically `@types/react`) loses those types to `any` with no error. This
 * script runs `tsc --noEmit --traceResolution` per tsconfig and reports, for imports written in
 * store files:
 *
 * - UNRESOLVED: the import fails to resolve although the package, or its `@types/<name>`,
 *   exists in `pnpm-lock.yaml`.
 * - JS-ONLY: the import resolves to JavaScript although `@types/<name>` exists in the lockfile.
 *
 * Fix a finding by declaring the package as an optional peer under `packageExtensions` in
 * `pnpm-workspace.yaml`, or add it to `KNOWN_FALSE_POSITIVES` below with the reason.
 *
 * Usage: node scripts/check-type-resolution.mjs <tsconfig> [<tsconfig> ...]
 *
 * Exit 0: no findings. Exit 1: findings. Exit 2: the sensor could not observe the store (tsc
 * failed to run, an empty trace, or no store-file resolutions).
 */

import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { builtinModules, createRequire, isBuiltin } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const EXIT_FINDINGS = 1;
const EXIT_SENSOR_BROKEN = 2;

const KIND_UNRESOLVED = 'UNRESOLVED';
const KIND_JS_ONLY = 'JS-ONLY';

/**
 * Imports that look like findings but are not. Matched on the importing package's name (any
 * version) and the import specifier.
 */
const KNOWN_FALSE_POSITIVES = [
  {
    importer: 'next',
    reason:
      '`next/types/global.d.ts` declares `server-only` as an ambient module; this entry covers a tsconfig that does not load that file.',
    specifier: 'server-only',
  },
  {
    importer: 'next',
    reason:
      'The repo pins `@types/react` 18 by override, and those types have no `react/compiler-runtime` entry to declare.',
    specifier: 'react/compiler-runtime',
  },
];

const repoRoot = path.resolve(import.meta.dirname, '..');

class SensorError extends Error {}

/** The package names listed in `pnpm-lock.yaml`, with and without peer-suffixed snapshot keys. */
function readLockedNames(lockfile) {
  const names = new Set();
  const text = readFileSync(lockfile, 'utf8');

  for (const match of text.matchAll(/^ {2}'?((?:@[^/'@\s]+\/)?[^@'\s/][^@'\s]*)@[^:']+'?:$/gm)) {
    names.add(match[1]);
  }

  return names;
}

/** `@scope/name/sub/path` -> `@scope/name`, `name/sub` -> `name`. */
function packageOfSpecifier(specifier) {
  const parts = specifier.split('/');

  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** `@scope/name` -> `@types/scope__name`, `name` -> `@types/name`. */
function typesPackageOf(name) {
  return name.startsWith('@') ? `@types/${name.slice(1).replace('/', '__')}` : `@types/${name}`;
}

const STORE_FILE = /\/links\/(.+?)\/[0-9a-f]{64}\/node_modules\//;

/** `<store>/links/@/next/16.4.0/<hash>/node_modules/...` -> `next@16.4.0`; null outside the store. */
function storeOwnerOf(file) {
  const match = file.match(STORE_FILE);

  if (!match) {
    return null;
  }

  const segments = match[1].split('/');

  return segments[0] === '@'
    ? `${segments[1]}@${segments[2]}`
    : `${segments[0]}/${segments[1]}@${segments[2]}`;
}

const nameOfOwner = owner => owner.slice(0, owner.lastIndexOf('@'));

const MODULE_LINE = /^======== Resolving module '([^']+)' from '([^']+)'\. ========/;
const TYPE_REFERENCE_LINE =
  /^======== Resolving type reference directive '([^']+)', containing file '([^']+)'/;
const UNRESOLVED_LINE =
  /^======== (?:Module name|Type reference directive) '[^']+' was not resolved\. ========/;
const RESOLVED_LINE =
  /^======== (?:Module name|Type reference directive) '[^']+' was successfully resolved to '([^']+)'/;
const JAVASCRIPT_FILE = /\.(?:c|m)?jsx?$/;
const SOURCE_FILE = /\.(?:c|m)?tsx?$/;

/** Every `declare module '<name>'` in the program's source files, as exact names and `*` patterns. */
function readAmbientModules(files) {
  const exact = new Set();
  const patterns = [];

  for (const file of files) {
    let text;

    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    if (!text.includes('declare module')) {
      continue;
    }

    for (const match of text.matchAll(/declare\s+module\s+(['"])([^'"]+)\1/g)) {
      if (match[2].includes('*')) {
        const [prefix, suffix] = match[2].split('*');
        patterns.push({ prefix, suffix });
      } else {
        exact.add(match[2]);
      }
    }
  }

  return specifier =>
    exact.has(specifier) ||
    patterns.some(
      ({ prefix, suffix }) => specifier.startsWith(prefix) && specifier.endsWith(suffix)
    );
}

/** Runs tsc over one tsconfig and returns its trace text. */
async function traceTsconfig(tsconfig) {
  const projectDir = path.dirname(tsconfig);
  let tsc;

  try {
    tsc = createRequire(path.join(projectDir, 'noop.js')).resolve('typescript/bin/tsc');
  } catch {
    throw new SensorError(
      `${tsconfig}: cannot resolve \`typescript\` from ${projectDir}. Run \`pnpm install\` and check the project declares typescript.`
    );
  }

  let stdout;

  try {
    ({ stdout } = await execFileAsync(
      process.execPath,
      [
        tsc,
        '--noEmit',
        '--incremental',
        'false',
        '--traceResolution',
        '--listFiles',
        '--project',
        tsconfig,
      ],
      { cwd: projectDir, encoding: 'utf8', maxBuffer: 1 << 29 }
    ));
  } catch (error) {
    // tsc exits non-zero on type errors; the trace is still complete.
    if (typeof error.stdout !== 'string') {
      throw new SensorError(`${tsconfig}: tsc could not run: ${error.message}`);
    }

    stdout = error.stdout;
  }

  if (!stdout.includes('======== Resolving ')) {
    throw new SensorError(
      `${tsconfig}: tsc printed no resolution trace. First output lines:\n${stdout
        .split('\n')
        .slice(0, 5)
        .join('\n')}`
    );
  }

  return stdout;
}

/** Candidate findings from one trace: store-file imports that failed, or resolved only to JavaScript. */
function readTrace(trace, lockedNames) {
  const candidates = [];
  const files = [];
  let current = null;
  let storeResolutions = 0;

  for (const line of trace.split('\n')) {
    if (line.startsWith('/')) {
      files.push(line);
      continue;
    }

    const start = line.match(MODULE_LINE) ?? line.match(TYPE_REFERENCE_LINE);

    if (start) {
      current = { from: start[2], specifier: start[1] };

      if (storeOwnerOf(current.from)) {
        storeResolutions++;
      }

      continue;
    }

    if (!current) {
      continue;
    }

    const unresolved = UNRESOLVED_LINE.test(line);
    const resolved = line.match(RESOLVED_LINE);

    if (!unresolved && !resolved) {
      continue;
    }

    const { from, specifier } = current;
    current = null;

    const owner = storeOwnerOf(from);

    if (!owner || specifier.startsWith('.') || path.isAbsolute(specifier) || isBuiltin(specifier)) {
      continue;
    }

    const name = packageOfSpecifier(specifier.replace(/^node:/, ''));

    if (builtinModules.includes(name)) {
      continue;
    }

    const typesName = typesPackageOf(name);

    if (unresolved && (lockedNames.has(name) || lockedNames.has(typesName))) {
      candidates.push({ kind: KIND_UNRESOLVED, owner, specifier });
    } else if (resolved && JAVASCRIPT_FILE.test(resolved[1]) && lockedNames.has(typesName)) {
      candidates.push({ kind: KIND_JS_ONLY, owner, specifier });
    }
  }

  return { candidates, files: files.filter(file => SOURCE_FILE.test(file)), storeResolutions };
}

async function checkTsconfig(tsconfig, lockedNames) {
  const trace = await traceTsconfig(tsconfig);
  const { candidates, files, storeResolutions } = readTrace(trace, lockedNames);

  if (storeResolutions === 0) {
    throw new SensorError(
      `${tsconfig}: the trace holds no imports from files in pnpm's global store, so the check observed nothing. Confirm \`virtualStoreType: global\` in pnpm-workspace.yaml and run \`pnpm install\`.`
    );
  }

  const isAmbient = candidates.length > 0 ? readAmbientModules(files) : () => false;
  const findings = new Map();

  for (const { kind, owner, specifier } of candidates) {
    const allowed = KNOWN_FALSE_POSITIVES.some(
      entry => entry.importer === nameOfOwner(owner) && entry.specifier === specifier
    );

    if (kind === KIND_UNRESOLVED && (allowed || isAmbient(specifier))) {
      continue;
    }

    if (kind === KIND_JS_ONLY && allowed) {
      continue;
    }

    findings.set(`${owner}\t${kind}\t${specifier}`, { kind, owner, specifier });
  }

  return { findings: [...findings.values()], storeResolutions };
}

async function main() {
  const tsconfigs = process.argv.slice(2).map(arg => path.resolve(arg));

  if (tsconfigs.length === 0) {
    throw new SensorError(
      'usage: node scripts/check-type-resolution.mjs <tsconfig> [<tsconfig> ...]'
    );
  }

  const lockedNames = readLockedNames(path.join(repoRoot, 'pnpm-lock.yaml'));

  if (lockedNames.size === 0) {
    throw new SensorError('pnpm-lock.yaml lists no packages, so the lockfile reader is broken.');
  }

  const results = await Promise.all(
    tsconfigs.map(tsconfig => checkTsconfig(tsconfig, lockedNames))
  );
  const findings = new Map();
  let storeResolutions = 0;

  for (const result of results) {
    storeResolutions += result.storeResolutions;

    for (const finding of result.findings) {
      findings.set(`${finding.owner}\t${finding.kind}\t${finding.specifier}`, finding);
    }
  }

  if (findings.size === 0) {
    console.log(
      `check-type-resolution: ok, ${storeResolutions} store-file imports across ${tsconfigs.length} tsconfig(s) all resolve.`
    );
    return;
  }

  const byOwner = Map.groupBy(
    [...findings.values()].sort(
      (a, b) => a.owner.localeCompare(b.owner) || a.specifier.localeCompare(b.specifier)
    ),
    finding => finding.owner
  );

  console.error(
    `check-type-resolution: ${findings.size} undeclared type dependencies in ${byOwner.size} store package(s).`
  );

  for (const [owner, ownerFindings] of byOwner) {
    console.error(`\n${owner}`);

    for (const { kind, specifier } of ownerFindings) {
      console.error(`  ${kind.padEnd(KIND_UNRESOLVED.length)}  ${specifier}`);
    }
  }

  console.error(
    `\nDeclare each as an optional peer of its package under \`packageExtensions\` in pnpm-workspace.yaml, or add a justified entry to KNOWN_FALSE_POSITIVES in scripts/check-type-resolution.mjs.`
  );
  process.exitCode = EXIT_FINDINGS;
}

try {
  await main();
} catch (error) {
  console.error(
    `check-type-resolution: ${error instanceof SensorError ? error.message : error.stack ?? error}`
  );
  process.exitCode = EXIT_SENSOR_BROKEN;
}
