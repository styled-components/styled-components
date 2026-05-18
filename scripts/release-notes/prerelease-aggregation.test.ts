import assert from 'node:assert';
import test from 'node:test';

import { groupChangesetsByPackageAndType } from './prerelease-grouping.ts';

test('aggregation: empty prevTag includes changeset', () => {
  const adapter = {
    getLatestPackageTag: () => '',
    isCommitAncestorOfTag: (): boolean => false,
  };
  const changesets = [
    {
      id: 'cs',
      commit: 'aaa',
      summary: '',
      releases: [{ name: 'pkg-a', type: 'patch' as const }],
    },
  ];
  const m = groupChangesetsByPackageAndType(changesets, ['pkg-a'], adapter);
  assert.strictEqual(m.get('pkg-a')?.patch.length, 1);
});

test('aggregation: ancestor of prevTag excludes changeset', () => {
  const adapter = {
    getLatestPackageTag: (): string => 'pkg-a@1.0.0',
    isCommitAncestorOfTag: (c: string) => c === 'oldsha',
  };
  const m = groupChangesetsByPackageAndType(
    [
      {
        id: 'gone',
        commit: 'oldsha',
        summary: '',
        releases: [{ name: 'pkg-a', type: 'minor' as const }],
      },
    ],
    ['pkg-a'],
    adapter
  );
  assert.strictEqual(m.get('pkg-a')?.minor?.length ?? 0, 0);
});

test('aggregation: not ancestor of prevTag includes changeset', () => {
  const adapter = {
    getLatestPackageTag: (): string => 'pkg-a@1.0.0',
    isCommitAncestorOfTag: () => false,
  };
  const m = groupChangesetsByPackageAndType(
    [
      {
        id: 'fresh',
        commit: 'newsha',
        summary: '',
        releases: [{ name: 'pkg-a', type: 'major' as const }],
      },
    ],
    ['pkg-a'],
    adapter
  );
  assert.strictEqual(m.get('pkg-a')?.major.length, 1);
});

test('aggregation: per-package prev tags are independent', () => {
  let ancestryCalledWithEmptyTag = false;
  const adapter = {
    getLatestPackageTag(p: string): string {
      return p === 'pkg-a' ? 'pkg-a@9.9.9' : '';
    },
    isCommitAncestorOfTag(_c: string, tag: string): boolean {
      if (tag === '') ancestryCalledWithEmptyTag = true;
      return false;
    },
  };
  const m = groupChangesetsByPackageAndType(
    [
      {
        id: 'dual',
        commit: 'zzz',
        summary: '',
        releases: [
          { name: 'pkg-a', type: 'patch' as const },
          { name: 'pkg-b', type: 'patch' as const },
        ],
      },
    ],
    ['pkg-a', 'pkg-b'],
    adapter
  );
  assert.strictEqual(m.get('pkg-b')?.patch.length, 1);
  assert.strictEqual(ancestryCalledWithEmptyTag, false);
});
