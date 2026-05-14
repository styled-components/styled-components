#!/usr/bin/env node
/**
 * Builds per-package markdown under RELEASE_NOTES_OUTDIR (default /tmp/release-notes).
 * Used by .github/workflows/release.yml prerelease job; run locally to verify output.
 *
 * Local (read changesets from the repo — no snapshot step):
 *   GITHUB_REPOSITORY=styled-components/styled-components pnpm run test:prerelease-notes
 *
 * Local (simulates CI after files were copied to a fake root):
 *   rm -rf /tmp/sc-notes-root && mkdir -p /tmp/sc-notes-root/.changeset
 *   for f in .changeset/*.md; do [[ $(basename "$f") == README.md ]] && continue; cp "$f" /tmp/sc-notes-root/.changeset/; done
 *   CHANGESET_NOTES_ROOT=/tmp/sc-notes-root GITHUB_REPOSITORY=styled-components/styled-components pnpm run test:prerelease-notes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');
const readChangesets = require('@changesets/read').default;
const git = require('@changesets/git');
const { getReleaseLine } = require('@changesets/cli/changelog').default;

async function main() {
  const cwd = process.cwd();
  const changesetReadRoot = process.env.CHANGESET_NOTES_ROOT || cwd;
  const outDir = process.env.RELEASE_NOTES_OUTDIR || '/tmp/release-notes';
  const repo = process.env.GITHUB_REPOSITORY;

  if (!repo) {
    console.error(
      'Set GITHUB_REPOSITORY=owner/name for Full Changelog links (e.g. styled-components/styled-components)'
    );
    process.exit(1);
  }

  const packagesDir = path.join(cwd, 'packages');
  const packages = [];
  for (const d of fs.readdirSync(packagesDir)) {
    const jsonPath = path.join(packagesDir, d, 'package.json');
    if (!fs.existsSync(jsonPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (pkg.private) continue;
    packages.push(pkg);
  }

  const changesets = await readChangesets(changesetReadRoot);
  if (changesets.length) {
    const paths = changesets.map(c => `.changeset/${c.id}.md`);
    const commitResult = await git.getCommitsThatAddFiles(paths, { cwd, short: true });
    // @changesets/git returns parallel arrays (same order as paths); older versions returned a Map.
    if (commitResult instanceof Map) {
      for (const cs of changesets) {
        cs.commit = commitResult.get(`.changeset/${cs.id}.md`) || undefined;
      }
    } else {
      for (let i = 0; i < changesets.length; i++) {
        changesets[i].commit = commitResult[i] || undefined;
      }
    }
  }

  const byPkg = new Map();
  for (const cs of changesets) {
    for (const release of cs.releases) {
      if (release.type === 'none') continue;
      let groups = byPkg.get(release.name);
      if (!groups) {
        groups = { major: [], minor: [], patch: [] };
        byPkg.set(release.name, groups);
      }
      groups[release.type].push({ changeset: cs, type: release.type });
    }
  }

  fs.mkdirSync(outDir, { recursive: true });

  const labels = { major: 'Major Changes', minor: 'Minor Changes', patch: 'Patch Changes' };
  for (const pkg of packages) {
    const groups = byPkg.get(pkg.name);
    const parts = [];
    if (groups) {
      for (const t of ['major', 'minor', 'patch']) {
        if (groups[t].length === 0) continue;
        parts.push(`### ${labels[t]}`, '');
        for (const { changeset, type } of groups[t]) {
          parts.push(await getReleaseLine(changeset, type));
        }
        parts.push('');
      }
    }
    if (parts.length === 0) parts.push('Internal changes only.', '');

    let prevTag = '';
    try {
      const tagPrefix = `${pkg.name}@`;
      const currentMajor = semver.major(pkg.version);
      const allTags = execSync('git tag -l', { encoding: 'utf8' })
        .split('\n')
        .filter(t => t.startsWith(tagPrefix));
      const sameMajor = allTags.filter(tag => {
        const v = tag.slice(tagPrefix.length);
        return semver.major(v) === currentMajor;
      });
      sameMajor.sort((a, b) =>
        semver.rcompare(a.slice(tagPrefix.length), b.slice(tagPrefix.length))
      );
      prevTag = sameMajor[0] || '';
    } catch (_) {
      /* ignore */
    }
    if (prevTag) {
      const currentTag = `${pkg.name}@${pkg.version}`;
      const compareUrl = `https://github.com/${repo}/compare/${encodeURIComponent(
        prevTag
      )}...${encodeURIComponent(currentTag)}`;
      parts.push(`**Full Changelog**: ${compareUrl}`);
    }

    const safe = pkg.name.replace(/[@/]/g, '_');
    fs.writeFileSync(path.join(outDir, `${safe}.md`), parts.join('\n'));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
