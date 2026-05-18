/** Prerelease GitHub notes: which changesets appear per package (tag gating). */

export type BuiltinReleaseType = 'major' | 'minor' | 'patch';

export interface ReleaseEntry {
  name: string;
  type: BuiltinReleaseType | 'none';
}

export interface ChangesetWithCommit {
  id: string;
  commit?: string;
  summary: string;
  releases: ReleaseEntry[];
}

export interface GitPrereleaseAdapter {
  getLatestPackageTag(packageName: string): string;
  isCommitAncestorOfTag(commit: string, tag: string): boolean;
}

/**
 * True when the changeset should be skipped for this package because it was
 * already announced under `prevTag`.
 */
export function shouldSkipChangesetForPrevTag(
  commit: string | undefined,
  prevTag: string | undefined,
  adapter: GitPrereleaseAdapter
): boolean {
  if (!commit || !prevTag) return false;
  return adapter.isCommitAncestorOfTag(commit, prevTag);
}

export function groupChangesetsByPackageAndType<T extends ChangesetWithCommit>(
  changesets: T[],
  publicPackageNames: string[],
  adapter: GitPrereleaseAdapter
): Map<string, Record<BuiltinReleaseType, Array<{ changeset: T; type: BuiltinReleaseType }>>> {
  const prevTagByPkg = new Map<string, string>();
  for (const name of publicPackageNames) {
    prevTagByPkg.set(name, adapter.getLatestPackageTag(name));
  }

  const byPkg = new Map<
    string,
    Record<BuiltinReleaseType, Array<{ changeset: T; type: BuiltinReleaseType }>>
  >();

  for (const cs of changesets) {
    for (const release of cs.releases) {
      if (release.type === 'none') continue;
      const prevTag = prevTagByPkg.get(release.name);
      if (shouldSkipChangesetForPrevTag(cs.commit, prevTag, adapter)) continue;

      let groups = byPkg.get(release.name);
      if (!groups) {
        groups = { major: [], minor: [], patch: [] };
        byPkg.set(release.name, groups);
      }
      const t = release.type as BuiltinReleaseType;
      groups[t].push({ changeset: cs, type: t });
    }
  }

  return byPkg;
}
