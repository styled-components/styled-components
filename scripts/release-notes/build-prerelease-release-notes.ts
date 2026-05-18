/**
 * Emits per-package prerelease GitHub release notes (Markdown). Shallow clones need
 * full history (`fetch-depth: 0` in CI, or `git fetch --unshallow`) for tag and
 * ancestry queries to match real runs.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as changesetsGit from '@changesets/git';
import readChangesets from '@changesets/read';

import type { ChangelogOptions } from './changelog.ts';
import changelog from './changelog.ts';
import { createDefaultGitAdapter } from './default-git-adapter.ts';
import { groupChangesetsByPackageAndType } from './prerelease-grouping.ts';

type PkgJson = { name: string; private?: boolean; version: string };

function loadChangesetConfigJson(cwd: string): {
  changelog?: string | [string, { repo?: string; branch?: string } & Record<string, unknown>];
  baseBranch?: string;
} {
  const raw = readFileSync(join(cwd, '.changeset/config.json'), 'utf8');
  return JSON.parse(raw);
}

function changelogOptionsFromChangesetConfig(cwd: string): ChangelogOptions {
  const cfg = loadChangesetConfigJson(cwd);
  const tupleOpts =
    Array.isArray(cfg.changelog) && cfg.changelog[1] && typeof cfg.changelog[1] === 'object'
      ? cfg.changelog[1]
      : {};

  return {
    repo: typeof tupleOpts.repo === 'string' ? tupleOpts.repo : undefined,
    branch:
      (typeof tupleOpts.branch === 'string' ? tupleOpts.branch : undefined) ??
      (typeof cfg.baseBranch === 'string' ? cfg.baseBranch : undefined) ??
      'main',
  };
}

function repoSlugFromRootPackageJson(cwd: string): string | undefined {
  const pkgPath = join(cwd, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    bugs?: { url?: string };
    repository?: string | { url?: string };
  };

  const fromUrl = (u: string): string | undefined => {
    const m = u.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/i);
    if (!m) return undefined;
    return `${m[1]}/${m[2]}`;
  };

  const bugsUrl = pkg.bugs?.url;
  if (typeof bugsUrl === 'string') {
    const s = fromUrl(bugsUrl);
    if (s) return s;
  }

  const repo = pkg.repository;
  if (typeof repo === 'string') {
    const s = fromUrl(repo);
    if (s) return s;
  }
  if (repo && typeof repo === 'object' && typeof repo.url === 'string') {
    const s = fromUrl(repo.url);
    if (s) return s;
  }

  return undefined;
}

export function resolveChangelogOptionsForBuild(
  cwd: string
): Required<Pick<ChangelogOptions, 'repo' | 'branch'>> {
  const cfgOpts = changelogOptionsFromChangesetConfig(cwd);
  const repo =
    (typeof process.env.GITHUB_REPOSITORY === 'string'
      ? process.env.GITHUB_REPOSITORY
      : undefined) ??
    cfgOpts.repo ??
    repoSlugFromRootPackageJson(cwd) ??
    '';
  const branch =
    typeof process.env.SC_RELEASE_NOTES_BRANCH === 'string'
      ? process.env.SC_RELEASE_NOTES_BRANCH
      : cfgOpts.branch;
  return { repo, branch };
}

function discoverPublicPackages(cwd: string): PkgJson[] {
  const packagesDir = join(cwd, 'packages');
  const out: PkgJson[] = [];
  for (const d of readdirSync(packagesDir)) {
    const jsonPath = join(packagesDir, d, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(jsonPath, 'utf8')) as PkgJson;
      if (!pkg.private) out.push(pkg);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function buildPrereleaseReleaseNotes(options: {
  cwd: string;
  outputDir: string;
}): Promise<void> {
  const { cwd, outputDir } = options;
  mkdirSync(outputDir, { recursive: true });

  const changelogOpts = resolveChangelogOptionsForBuild(cwd);
  const packages = discoverPublicPackages(cwd);

  const changesets = await readChangesets(cwd);
  if (changesets.length) {
    const paths = changesets.map(c => `.changeset/${c.id}.md`);
    const shaList = await changesetsGit.getCommitsThatAddFiles(paths, {
      cwd,
      short: true,
    });
    for (let i = 0; i < changesets.length; i++) {
      changesets[i].commit = shaList[i] || undefined;
    }
  }

  const adapter = createDefaultGitAdapter(cwd);
  const byPkg = groupChangesetsByPackageAndType(
    changesets,
    packages.map(p => p.name),
    adapter
  );

  const labels = {
    major: 'Major Changes',
    minor: 'Minor Changes',
    patch: 'Patch Changes',
  } as const;

  for (const pkg of packages) {
    const groups = byPkg.get(pkg.name);
    const parts: string[] = [];
    if (groups) {
      for (const t of ['major', 'minor', 'patch'] as const) {
        if (groups[t].length === 0) continue;
        parts.push(`### ${labels[t]}`, '');
        for (const { changeset, type } of groups[t]) {
          parts.push(await changelog.getReleaseLine(changeset, type, changelogOpts));
        }
        parts.push('');
      }
    }
    if (parts.length === 0) parts.push('No new changes since the previous release.', '');

    const prevTag = adapter.getLatestPackageTag(pkg.name);
    if (prevTag && changelogOpts.repo) {
      const currentTag = `${pkg.name}@${pkg.version}`;
      const compareUrl = `https://github.com/${changelogOpts.repo}/compare/${encodeURIComponent(prevTag)}...${encodeURIComponent(currentTag)}`;
      parts.push(`**Full Changelog**: ${compareUrl}`);
    }

    const safe = pkg.name.replace(/[@/]/g, '_');
    writeFileSync(join(outputDir, `${safe}.md`), parts.join('\n'));
  }
}

function defaultOutputDir(cwd: string): string {
  if (typeof process.env.RELEASE_NOTES_OUTPUT_DIR === 'string') {
    return process.env.RELEASE_NOTES_OUTPUT_DIR;
  }
  return join(cwd, '.dry-run-release-notes');
}

async function main(): Promise<void> {
  const cwd =
    typeof process.env.RELEASE_NOTES_CWD === 'string'
      ? process.env.RELEASE_NOTES_CWD
      : process.cwd();

  const out = defaultOutputDir(cwd);

  await buildPrereleaseReleaseNotes({
    cwd,
    outputDir: out,
  });

  console.error(`Wrote prerelease notes to ${out} (RELEASE_NOTES_OUTPUT_DIR overrides path).`);
}

const invoked = typeof process.argv[1] === 'string' ? resolve(process.argv[1]) : '';
const script = resolve(fileURLToPath(import.meta.url));
if (invoked === script) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
