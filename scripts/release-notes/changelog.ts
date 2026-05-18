/**
 * Changesets chooses which changesets belong in each release entry; this module
 * only formats markdown lines (history links, not filtering).
 */

export type ChangelogOptions = {
  repo?: string;
  branch?: string;
};

function githubChangesetHistoryUrl(id: string, repo: string, branch: string): string {
  return (
    `https://github.com/${repo}/commits/${encodeURIComponent(branch)}/` +
    `.changeset/${encodeURIComponent(id)}.md`
  );
}

function historyLinkForChangeset(id: string, options: ChangelogOptions | undefined): string | null {
  const repo =
    typeof process.env.GITHUB_REPOSITORY === 'string'
      ? process.env.GITHUB_REPOSITORY
      : options?.repo;
  const branch = options?.branch ?? 'main';
  if (!repo) return null;
  const url = githubChangesetHistoryUrl(id, repo, branch);
  return `[${id}.md](${url})`;
}

export async function getReleaseLine(
  changeset: { id: string; summary: string },
  _type: string,
  options?: ChangelogOptions
): Promise<string> {
  const [firstLine, ...futureLines] = changeset.summary.split('\n').map(l => l.trimEnd());
  const link = historyLinkForChangeset(changeset.id, options);
  const suffix = link ? ` (${link})` : '';
  let line = `- ${firstLine}${suffix}`;

  if (futureLines.length > 0) {
    line += `\n${futureLines.map(l => `  ${l}`).join('\n')}`;
  }

  return line;
}

type Dep = { name: string; newVersion: string };

export async function getDependencyReleaseLine(
  changesets: Array<{ id: string }>,
  dependenciesUpdated: Dep[],
  options?: ChangelogOptions
): Promise<string> {
  if (dependenciesUpdated.length === 0) return '';

  const links = changesets.map(cs => {
    const link = historyLinkForChangeset(cs.id, options);
    const suffix = link ? ` (${link})` : '';
    return `- Updated dependencies${suffix}`;
  });

  const depList = dependenciesUpdated.map(d => `  - ${d.name}@${d.newVersion}`);
  return [...links, ...depList].join('\n');
}

export default {
  getReleaseLine,
  getDependencyReleaseLine,
};
