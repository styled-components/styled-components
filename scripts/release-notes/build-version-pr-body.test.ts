import assert from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  GITHUB_PR_BODY_MAX_CHARS,
  buildVersionPrBody,
  getChangelogEntryContent,
  truncateVersionPrBody,
} from './build-version-pr-body.ts';

function writePkg(
  root: string,
  dirName: string,
  pkg: { name: string; version: string; private?: boolean },
  changelog?: string
): void {
  const dir = join(root, 'packages', dirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  if (changelog !== undefined) {
    writeFileSync(join(dir, 'CHANGELOG.md'), changelog);
  }
}

test('getChangelogEntryContent returns section body for version heading', () => {
  const md = `# pkg

## 2.0.0

### Major Changes

- Breaking

## 1.0.0

- Old
`;
  assert.strictEqual(getChangelogEntryContent(md, '2.0.0'), '### Major Changes\n\n- Breaking\n\n');
});

test('getChangelogEntryContent skips headings inside fenced code', () => {
  const md = `## 1.0.0

\`\`\`md
## 9.9.9
fake
\`\`\`

- Real

## 0.1.0

- Older
`;
  const entry = getChangelogEntryContent(md, '1.0.0');
  assert.ok(entry !== null);
  assert.ok(entry.includes('- Real'));
  assert.ok(!entry.includes('- Older'));
  assert.ok(entry.includes('## 9.9.9'));
});

test('getChangelogEntryContent returns null when version heading is missing', () => {
  assert.strictEqual(getChangelogEntryContent('## 1.0.0\n\n- x\n', '2.0.0'), null);
});

test('buildVersionPrBody under budget returns full assembly without footer', () => {
  const root = mkdtempSync(join(tmpdir(), 'sc-version-pr-'));
  writePkg(
    root,
    'styled-components',
    { name: 'styled-components', version: '7.0.0' },
    `## 7.0.0

### Major Changes

- One change
`
  );
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      bugs: { url: 'https://github.com/styled-components/styled-components/issues' },
    })
  );

  const result = buildVersionPrBody({
    baseBranch: 'main',
    cwd: root,
    hasPublishScript: true,
    repo: 'styled-components/styled-components',
    versionBranch: 'changeset-release/main',
  });

  assert.strictEqual(result.truncated, false);
  assert.ok(result.body.includes('Changesets release'));
  assert.ok(result.body.includes('# Releases'));
  assert.ok(result.body.includes('## styled-components@7.0.0'));
  assert.ok(result.body.includes('- One change'));
  assert.ok(!result.body.includes('CHANGELOG.md)'));
  assert.ok(result.body.length <= GITHUB_PR_BODY_MAX_CHARS);
});

test('buildVersionPrBody omits package with no matching version heading', () => {
  const root = mkdtempSync(join(tmpdir(), 'sc-version-pr-'));
  writePkg(
    root,
    'styled-components',
    { name: 'styled-components', version: '7.0.0' },
    `## 6.0.0\n\n- Old\n`
  );
  writePkg(
    root,
    'other',
    { name: 'other', version: '1.0.0', private: true },
    `## 1.0.0\n\n- Priv\n`
  );
  writeFileSync(join(root, 'package.json'), '{}');

  const result = buildVersionPrBody({
    baseBranch: 'main',
    cwd: root,
    hasPublishScript: true,
    repo: 'o/r',
    versionBranch: 'changeset-release/main',
  });

  assert.ok(!result.body.includes('## styled-components@7.0.0'));
  assert.ok(!result.body.includes('## other@'));
});

test('truncateVersionPrBody keeps fences closed and stays under the hard cap', () => {
  const bullet = '- item\n';
  const prefix =
    'This PR was opened by the Changesets release action.\n\n# Releases\n\n## pkg@1.0.0\n\n';
  const fillerBullets = bullet.repeat(200);
  const dangerous =
    prefix +
    fillerBullets +
    '```ts\n' +
    'const huge = `' +
    'y'.repeat(GITHUB_PR_BODY_MAX_CHARS) +
    '`;\n' +
    '```\n' +
    bullet.repeat(50);

  const footer =
    '\n> Changelog truncated for GitHub PR body length. Full notes: [CHANGELOG.md](https://github.com/o/r/blob/changeset-release/main/packages/pkg/CHANGELOG.md)\n';

  assert.ok(dangerous.length > GITHUB_PR_BODY_MAX_CHARS);

  const { body, truncated } = truncateVersionPrBody(dangerous, footer);
  assert.strictEqual(truncated, true);
  assert.ok(body.length <= GITHUB_PR_BODY_MAX_CHARS);
  assert.ok(body.endsWith(footer.trimEnd()) || body.includes(footer.trim()));
  // Count fence markers outside of ensuring we didn't leave an odd open fence in the prefix.
  const beforeFooter = body.slice(0, body.length - footer.length);
  const fenceMarkers = beforeFooter.match(/^```/gm) ?? [];
  assert.strictEqual(fenceMarkers.length % 2, 0, 'prefix must not leave an open fence');
});

test('truncateVersionPrBody reserves footer headroom against the hard cap', () => {
  const footer = '\n> truncated footer that takes space\n';
  // Content that is just under 65536 alone but would overflow with footer if not reserved.
  const content = 'a\n'.repeat(Math.floor(GITHUB_PR_BODY_MAX_CHARS / 2) - 10);
  assert.ok(content.length + footer.length > GITHUB_PR_BODY_MAX_CHARS - 100 || true);

  // Force over-budget full string
  const full = 'line\n'.repeat(20_000);
  assert.ok(full.length + footer.length > GITHUB_PR_BODY_MAX_CHARS);

  const { body, truncated } = truncateVersionPrBody(full, footer);
  assert.strictEqual(truncated, true);
  assert.ok(body.length <= GITHUB_PR_BODY_MAX_CHARS);
  assert.ok(body.includes('truncated footer'));
});

test('buildVersionPrBody truncates a ~70k-shaped changelog under the hard cap', () => {
  const root = mkdtempSync(join(tmpdir(), 'sc-version-pr-'));
  const lines: string[] = ['## 7.0.0', '', '### Major Changes', ''];
  for (let i = 0; i < 400; i++) {
    lines.push(`- Change number ${i}: ${'word '.repeat(40)}`);
    if (i % 40 === 0) {
      lines.push('', '```ts', `const example${i} = true;`, '```', '');
    }
  }
  const changelog = lines.join('\n') + '\n';
  assert.ok(changelog.length > 60_000);

  writePkg(root, 'styled-components', { name: 'styled-components', version: '7.0.0' }, changelog);
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      bugs: { url: 'https://github.com/styled-components/styled-components/issues' },
    })
  );

  const result = buildVersionPrBody({
    baseBranch: 'main',
    cwd: root,
    hasPublishScript: true,
    repo: 'styled-components/styled-components',
    versionBranch: 'changeset-release/main',
  });

  assert.strictEqual(result.truncated, true);
  assert.ok(result.body.length <= GITHUB_PR_BODY_MAX_CHARS);
  assert.ok(
    result.body.includes('blob/changeset-release/main/packages/styled-components/CHANGELOG.md')
  );
  const footerIdx = result.body.lastIndexOf('> Changelog truncated');
  assert.ok(footerIdx > 0);
  const beforeFooter = result.body.slice(0, footerIdx);
  const fenceMarkers = beforeFooter.match(/^```/gm) ?? [];
  assert.strictEqual(fenceMarkers.length % 2, 0);
});
