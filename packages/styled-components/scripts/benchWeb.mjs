/**
 * Runs every suite `jest.config.bench.js` matches, each in its own jest
 * process, in sorted path order. One process per file because a bench row
 * reads slower the more benches ran before it in the same process, and jest
 * orders files by cached timings that differ per checkout; a shared process
 * makes rows incomparable across trees.
 *
 * Arguments are jest path patterns that narrow the file list. Every file
 * runs even after a failure; the exit code is nonzero when any file failed.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jest = path.join(packageDir, 'node_modules/.bin/jest');
const config = ['-c', 'jest.config.bench.js'];

const listed = spawnSync(jest, [...config, '--listTests', ...process.argv.slice(2)], {
  cwd: packageDir,
  encoding: 'utf8',
});
const files = listed.stdout.split('\n').filter(Boolean).sort();

if (files.length === 0) {
  console.error(
    `bench:web found no bench files${process.argv.length > 2 ? ` matching ${process.argv.slice(2).join(' ')}` : ''}. Check the patterns against jest.config.bench.js testMatch.`
  );
  process.exit(2);
}

const failed = files.filter(file => {
  const run = spawnSync(
    jest,
    [...config, '--verbose', '--no-coverage', '--forceExit', '--runInBand', file],
    {
      cwd: packageDir,
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --expose-gc --max-old-space-size=12288`,
      },
      stdio: 'inherit',
    }
  );
  return run.status !== 0;
});

if (failed.length > 0) {
  console.error(`bench:web failed in ${failed.map(f => path.relative(packageDir, f)).join(', ')}`);
  process.exit(1);
}
