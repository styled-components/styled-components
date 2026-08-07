#!/usr/bin/env node
/**
 * Workspace gate: format with autofix, knip, then tests. Fail fast.
 */

import { spawnSync } from 'node:child_process';

const steps = [
  { label: 'format (biome check --write)', args: ['run', 'format'] },
  { label: 'knip', args: ['run', 'knip'] },
  { label: 'test:changeset-changelog', args: ['run', 'test:changeset-changelog'] },
  { label: 'test:effect-gate', args: ['run', 'test:effect-gate'] },
  { label: 'test (styled-components)', args: ['run', 'test'] },
];

for (const step of steps) {
  console.log(`\n==> ${step.label}\n`);
  const result = spawnSync('pnpm', step.args, { stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nverify: ok\n');
