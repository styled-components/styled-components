import { execFileSync, execSync } from 'node:child_process';

import type { GitPrereleaseAdapter } from './prerelease-grouping.ts';

/**
 * Most recent commit touching each `.changeset/*.md`, keyed by repo-relative path.
 * One `git log` walk, newest first, so a path's first occurrence wins. Gating on
 * the last-change commit (rather than the add commit) re-announces a pending
 * changeset whose content was edited after the previous release tag.
 */
export function getLastChangesetCommits(cwd: string): Map<string, string> {
  let out: string;
  try {
    out = execFileSync(
      'git',
      ['log', '--format=%x1e%h', '--name-only', '--first-parent', '-m', '--', '.changeset/'],
      { cwd, encoding: 'utf8' }
    );
  } catch {
    return new Map();
  }

  const byPath = new Map<string, string>();
  let sha = '';
  for (const line of out.split('\n')) {
    if (line.startsWith('\x1e')) {
      sha = line.slice(1);
    } else if (line && !byPath.has(line)) {
      byPath.set(line, sha);
    }
  }
  return byPath;
}

/** Full git history (`fetch-depth: 0`) is needed for accurate tag ancestry. */
export function createDefaultGitAdapter(cwd: string): GitPrereleaseAdapter {
  return {
    getLatestPackageTag(packageName: string): string {
      try {
        return (
          execSync(`git tag --list '${packageName}@*' --sort=-v:refname`, { cwd, encoding: 'utf8' })
            .split('\n')
            .filter(Boolean)[0] || ''
        );
      } catch {
        return '';
      }
    },

    isCommitAncestorOfTag(commit: string, tag: string): boolean {
      if (!commit || !tag) return false;
      try {
        execSync(`git merge-base --is-ancestor ${commit} ${tag}`, {
          cwd,
          stdio: 'ignore',
        });
        return true;
      } catch {
        return false;
      }
    },
  };
}
