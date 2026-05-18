import assert from 'node:assert';
import test from 'node:test';

import { getDependencyReleaseLine, getReleaseLine } from './changelog.ts';
import changelog from './changelog.ts';

test('changelog default export exposes expected functions', () => {
  assert.strictEqual(typeof changelog.getReleaseLine, 'function');
  assert.strictEqual(typeof changelog.getDependencyReleaseLine, 'function');
});

test('getReleaseLine appends Github file-history link using options.repo', async () => {
  const md = await getReleaseLine(
    {
      id: 'cool-feature',
      summary: 'Adds cool feature',
    },
    'minor',
    { repo: 'acme/widget', branch: 'main' }
  );
  assert.ok(md.includes('https://github.com/acme/widget/commits/main/.changeset/cool-feature.md'));
  assert.ok(md.startsWith('- Adds cool feature ('));
  assert.ok(md.includes('[cool-feature.md]('));
});

test('getReleaseLine uses GITHUB_REPOSITORY when options.repo is absent', async () => {
  const prev = process.env.GITHUB_REPOSITORY;
  process.env.GITHUB_REPOSITORY = 'env/repo';
  try {
    const md = await getReleaseLine({ id: 'x', summary: 'Line' }, 'patch', { branch: 'develop' });
    assert.ok(md.includes('https://github.com/env/repo/commits/develop/.changeset/x.md'));
  } finally {
    if (prev === undefined) delete process.env.GITHUB_REPOSITORY;
    else process.env.GITHUB_REPOSITORY = prev;
  }
});

test('getReleaseLine multiline summary indents continuation lines', async () => {
  const md = await getReleaseLine(
    {
      id: 'm',
      summary: 'First\nSecond line',
    },
    'patch',
    { repo: 'a/b', branch: 'main' }
  );
  assert.match(md, /^- First \(/);
  assert.ok(md.includes('\n  Second line'));
});

test('getDependencyReleaseLine links each changeset and lists deps', async () => {
  const md = await getDependencyReleaseLine(
    [{ id: 'c1' }, { id: 'c2' }],
    [
      { name: 'foo', newVersion: '2.0.0' },
      { name: 'bar', newVersion: '1.1.0' },
    ],
    { repo: 'o/r', branch: 'main' }
  );
  assert.ok(md.includes('- Updated dependencies ('));
  assert.ok(md.includes('https://github.com/o/r/commits/main/.changeset/c1.md'));
  assert.ok(md.includes('  - foo@2.0.0'));
});

test('getReleaseLine has no trailing link without repo sources', async () => {
  const prevGh = process.env.GITHUB_REPOSITORY;
  delete process.env.GITHUB_REPOSITORY;
  try {
    const md = await getReleaseLine({ id: 'orphan', summary: 'Lonely' }, 'patch', {});
    assert.strictEqual(md, '- Lonely');
  } finally {
    if (prevGh !== undefined) process.env.GITHUB_REPOSITORY = prevGh;
  }
});

test('branch in history URL is encodeURIComponent-encoded', async () => {
  const md = await getReleaseLine({ id: 'id', summary: 'S' }, 'patch', {
    repo: 'o/r',
    branch: 'release/1.x',
  });
  assert.ok(md.includes('/commits/release%2F1.x/.changeset/'));
});
