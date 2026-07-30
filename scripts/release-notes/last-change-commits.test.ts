import { execFileSync } from 'node:child_process';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createDefaultGitAdapter, getLastChangesetCommits } from './default-git-adapter.ts';

/**
 * Builds a scratch git repo exercising the release-notes gate the way CI hits it:
 * a changeset added before the previous tag, then edited after it. The edit must
 * re-announce the changeset; the old add-commit gating dropped it silently.
 */
function initRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sc-release-notes-'));
  const git = (args: string[]): string =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  mkdirSync(join(dir, '.changeset'));
  return dir;
}

test('last-change commits: edited changeset resolves its edit commit, not its add commit', () => {
  const dir = initRepo();
  const git = (args: string[]): string =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();

  writeFileSync(join(dir, '.changeset/edited-later.md'), "---\n'pkg-a': patch\n---\nv1\n");
  writeFileSync(join(dir, '.changeset/untouched.md'), "---\n'pkg-a': patch\n---\nstable\n");
  git(['add', '.changeset']);
  git(['commit', '-m', 'add changesets']);
  const addSha = git(['rev-parse', '--short', 'HEAD']);
  const prevTag = 'pkg-a@1.0.0-prerelease-1';
  git(['tag', prevTag]);

  writeFileSync(join(dir, '.changeset/edited-later.md'), "---\n'pkg-a': minor\n---\nv2\n");
  git(['add', '.changeset']);
  git(['commit', '-m', 'edit changeset']);
  const editSha = git(['rev-parse', '--short', 'HEAD']);

  writeFileSync(join(dir, '.changeset/uncommitted.md'), "---\n'pkg-a': patch\n---\nnew\n");

  const commits = getLastChangesetCommits(dir);
  assert.strictEqual(commits.get('.changeset/edited-later.md'), editSha);
  assert.strictEqual(commits.get('.changeset/untouched.md'), addSha);
  assert.strictEqual(commits.get('.changeset/uncommitted.md'), undefined);

  const adapter = createDefaultGitAdapter(dir);
  assert.strictEqual(adapter.getLatestPackageTag('pkg-a'), prevTag);
  assert.strictEqual(adapter.isCommitAncestorOfTag(editSha, prevTag), false);
  assert.strictEqual(adapter.isCommitAncestorOfTag(addSha, prevTag), true);
});

test('last-change commits: repo without changeset history yields an empty map', () => {
  const dir = initRepo();
  writeFileSync(join(dir, 'README.md'), 'hi\n');
  execFileSync('git', ['add', 'README.md'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
  assert.deepStrictEqual([...getLastChangesetCommits(dir).entries()], []);
});
