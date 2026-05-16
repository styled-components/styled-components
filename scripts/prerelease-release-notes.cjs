#!/usr/bin/env node
/**
 * Builds per-package markdown under RELEASE_NOTES_OUTDIR (default /tmp/release-notes).
 * Used by .github/workflows/release.yml prerelease job; run locally to verify output.
 *
 * Omits changesets already shipped on this major line: the branch still contains
 * `.changeset/*.md` files after prior snapshot prereleases (CI deletes them only in the
 * workspace). We keep only changesets whose *most recent* commit (the one that last
 * touched the changeset file) is strictly after the latest same-major tag for the
 * primary released package. Editing a changeset to refine its description or following
 * up with a code change that tweaks the same .md file therefore re-includes the entry
 * in the next prerelease.
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
const { getReleaseLine } = require('@changesets/cli/changelog').default;

function getPrevTagForPackage(pkgName, pkgVersion, cwd) {
  const tagPrefix = `${pkgName}@`;
  const currentMajor = semver.major(pkgVersion);
  const allTags = execSync('git tag -l', { encoding: 'utf8', cwd })
    .split('\n')
    .filter(t => t.startsWith(tagPrefix));
  const sameMajor = allTags.filter(tag => {
    const v = tag.slice(tagPrefix.length);
    return semver.major(v) === currentMajor;
  });
  sameMajor.sort((a, b) => semver.rcompare(a.slice(tagPrefix.length), b.slice(tagPrefix.length)));
  return sameMajor[0] || '';
}

function revParse(ref, cwd) {
  try {
    return execSync(`git rev-parse ${ref}`, { encoding: 'utf8', cwd }).trim();
  } catch {
    return '';
  }
}

/**
 * True iff baselineSha is a strict ancestor of otherSha (other landed after baseline on this branch).
 */
function isAncestor(baselineSha, otherSha, cwd) {
  if (!baselineSha || !otherSha || baselineSha === otherSha) return false;
  try {
    execSync(`git merge-base --is-ancestor ${baselineSha} ${otherSha}`, { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getLastCommitTouchingFile(filePath, cwd) {
  try {
    return execSync(`git log -1 --format=%h -- '${filePath}'`, { encoding: 'utf8', cwd }).trim();
  } catch {
    return '';
  }
}

function shouldIncludeChangeset(cs, prevTagByName, cwd) {
  const nonNone = cs.releases.filter(r => r.type !== 'none');
  const primaryRelease = nonNone.find(r => r.name === 'styled-components') || nonNone[0];
  if (!primaryRelease) return false;
  const prevTag = prevTagByName.get(primaryRelease.name);
  if (!prevTag) return true;

  const baselineSha = revParse(`${prevTag}^{}`, cwd);
  if (!baselineSha) return true;

  if (!cs.commit) return false;
  const commitSha = revParse(cs.commit, cwd);
  if (!commitSha) return false;

  return isAncestor(baselineSha, commitSha, cwd);
}

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

  const prevTagByName = new Map();
  for (const pkg of packages) {
    prevTagByName.set(pkg.name, getPrevTagForPackage(pkg.name, pkg.version, cwd));
  }

  let changesets = await readChangesets(changesetReadRoot);
  if (changesets.length) {
    for (const cs of changesets) {
      cs.commit = getLastCommitTouchingFile(`.changeset/${cs.id}.md`, cwd) || undefined;
    }
    changesets = changesets.filter(cs => shouldIncludeChangeset(cs, prevTagByName, cwd));
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

    const prevTag = prevTagByName.get(pkg.name) || '';
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
