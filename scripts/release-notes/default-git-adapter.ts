import { execSync } from 'node:child_process';

import type { GitPrereleaseAdapter } from './prerelease-grouping.ts';

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
