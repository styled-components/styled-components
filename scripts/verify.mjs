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
  {
    label: 'native profile harness smoke',
    args: ['--filter', 'styled-components', 'exec', 'bun', 'src/native/profile-pipeline.ts'],
    env: { SC_PROFILE_SMOKE: '1' },
    requires: 'bun',
  },
  { label: 'test (styled-components)', args: ['run', 'test'] },
];

for (const step of steps) {
  console.log(`\n==> ${step.label}\n`);
  if (step.requires && spawnSync(step.requires, ['--version'], { stdio: 'ignore' }).error) {
    console.log(
      `skipped: \`${step.requires}\` is not installed (https://bun.sh). Install it to run this step.`
    );
    continue;
  }
  const result = spawnSync('pnpm', step.args, {
    env: { ...process.env, ...step.env },
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nverify: ok\n');
