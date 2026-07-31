/**
 * Builds the Version Packages PR body from local CHANGELOG.md files left by
 * `changeset version`. Truncates fence-safely under GitHub's PR body limit.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** GitHub Issues/PR body hard limit (`body is too long (maximum is 65536 characters)`). */
export const GITHUB_PR_BODY_MAX_CHARS = 65536;

export type PublicPackage = {
  dir: string;
  name: string;
  private?: boolean;
  version: string;
};

export type BuildVersionPrBodyOptions = {
  baseBranch: string;
  cwd: string;
  hasPublishScript: boolean;
  repo: string;
  versionBranch: string;
};

export type VersionPrBodyResult = {
  body: string;
  truncated: boolean;
};

/**
 * Discovers non-private packages under packages/<name>/package.json, sorted by name.
 */
export function discoverPublicPackages(cwd: string): PublicPackage[] {
  const packagesDir = join(cwd, 'packages');
  const out: PublicPackage[] = [];
  for (const d of readdirSync(packagesDir)) {
    const dir = join(packagesDir, d);
    const jsonPath = join(dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
        name?: string;
        private?: boolean;
        version?: string;
      };
      if (pkg.private) continue;
      if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue;
      out.push({ dir, name: pkg.name, private: pkg.private, version: pkg.version });
    } catch {
      /* skip */
    }
  }
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

/**
 * Returns the markdown body under the first `## <version>` heading (fence-aware),
 * or `null` when that heading is absent.
 */
export function getChangelogEntryContent(changelog: string, version: string): string | null {
  const regex = /^(#{1,6})\s(.*)$|^(`{3,})/gm;
  let headingStart: { depth: number; index: number } | undefined;
  let endIndex: number | undefined;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(changelog)) !== null) {
    if (match[3]) {
      const endOfCodeBlockRegex = new RegExp(`^${match[3]}`, 'gm');
      endOfCodeBlockRegex.lastIndex = regex.lastIndex;
      const endMatch = endOfCodeBlockRegex.exec(changelog);
      if (endMatch) {
        regex.lastIndex = endOfCodeBlockRegex.lastIndex;
        continue;
      }
      break;
    }

    const headingDepth = match[1].length;
    const headingText = match[2].trim();

    if (headingStart === undefined) {
      if (headingText === version) {
        headingStart = { depth: headingDepth, index: regex.lastIndex };
      }
      continue;
    }

    if (headingDepth <= headingStart.depth) {
      endIndex = match.index;
      break;
    }
  }

  if (headingStart === undefined) return null;
  const raw =
    endIndex === undefined
      ? changelog.slice(headingStart.index)
      : changelog.slice(headingStart.index, endIndex);
  return raw.replace(/^\n+/, '');
}

function stockIntro(baseBranch: string, hasPublishScript: boolean): string {
  const publishClause = hasPublishScript
    ? 'the packages will be published to npm automatically'
    : 'publish to npm yourself or [setup this action to publish automatically](https://github.com/changesets/action#with-publishing)';
  return (
    `This PR was opened by the [Changesets release](https://github.com/changesets/action) GitHub action. ` +
    `When you're ready to do a release, you can merge this and ${publishClause}. ` +
    `If you're not ready to do a release yet, that's fine, whenever you add more changesets to ${baseBranch}, this PR will be updated.\n`
  );
}

function changelogBlobUrl(repo: string, versionBranch: string, packageDirName: string): string {
  return (
    `https://github.com/${repo}/blob/${versionBranch}/` +
    `packages/${encodeURIComponent(packageDirName)}/CHANGELOG.md`
  );
}

function packageDirName(pkg: PublicPackage, cwd: string): string {
  const packagesDir = join(cwd, 'packages');
  if (pkg.dir.startsWith(packagesDir)) {
    return pkg.dir.slice(packagesDir.length).replace(/^[/\\]/, '');
  }
  const parts = pkg.dir.split(/[/\\]/);
  return parts[parts.length - 1] ?? pkg.name;
}

function truncationFooter(
  repo: string,
  versionBranch: string,
  packages: Array<{ dirName: string; name: string }>
): string {
  const links = packages
    .map(p => `[${p.name} CHANGELOG.md](${changelogBlobUrl(repo, versionBranch, p.dirName)})`)
    .join(', ');
  return `\n> Changelog truncated for GitHub PR body length. Full notes: ${links}\n`;
}

function linePreference(line: string): number {
  if (/^#{1,6}\s/.test(line)) return 2;
  if (/^- /.test(line)) return 1;
  return 0;
}

/**
 * Fence-safe truncation so `prefix + footer` stays within {@link GITHUB_PR_BODY_MAX_CHARS}.
 * Prefers cutting after a complete top-level bullet or heading near the budget.
 */
export function truncateVersionPrBody(fullBody: string, footer: string): VersionPrBodyResult {
  if (fullBody.length <= GITHUB_PR_BODY_MAX_CHARS) {
    return { body: fullBody, truncated: false };
  }

  const budget = GITHUB_PR_BODY_MAX_CHARS - footer.length;
  if (budget < 1) {
    return { body: footer.slice(0, GITHUB_PR_BODY_MAX_CHARS), truncated: true };
  }

  const preferenceWindow = 2000;
  let furthestSafe = 0;
  let preferredCut = 0;
  let preferredRank = -1;
  let inFence = false;
  let offset = 0;
  const lines = fullBody.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextOffset = offset + line.length + (i < lines.length - 1 ? 1 : 0);
    if (/^```/.test(line)) inFence = !inFence;

    if (!inFence && nextOffset <= budget) {
      furthestSafe = nextOffset;
      const rank = linePreference(line);
      if (rank > 0 && (rank > preferredRank || nextOffset >= preferredCut)) {
        if (preferredCut === 0 || nextOffset >= furthestSafe - preferenceWindow) {
          preferredCut = nextOffset;
          preferredRank = rank;
        }
      }
    }

    offset = nextOffset;
  }

  let cutAt = furthestSafe;
  if (preferredCut > 0 && furthestSafe - preferredCut <= preferenceWindow) {
    cutAt = preferredCut;
  }

  let prefix = fullBody.slice(0, cutAt).replace(/\n+$/, '');
  const fenceMarkers = prefix.match(/^```/gm) ?? [];
  if (fenceMarkers.length % 2 !== 0) {
    const lastFence = prefix.lastIndexOf('\n```');
    if (lastFence >= 0) {
      prefix = prefix.slice(0, lastFence).replace(/\n+$/, '');
    }
  }

  let body = `${prefix}\n${footer}`;
  if (body.length > GITHUB_PR_BODY_MAX_CHARS) {
    body = body.slice(0, GITHUB_PR_BODY_MAX_CHARS);
  }
  return { body, truncated: true };
}

/**
 * Assembles the Version Packages PR body from public package changelogs in `cwd`.
 */
export function buildVersionPrBody(options: BuildVersionPrBodyOptions): VersionPrBodyResult {
  const { baseBranch, cwd, hasPublishScript, repo, versionBranch } = options;
  const packages = discoverPublicPackages(cwd);
  const included: Array<{ content: string; dirName: string; header: string; name: string }> = [];

  for (const pkg of packages) {
    let changelog: string;
    try {
      changelog = readFileSync(join(pkg.dir, 'CHANGELOG.md'), 'utf8');
    } catch {
      continue;
    }
    const content = getChangelogEntryContent(changelog, pkg.version);
    if (content === null) continue;
    included.push({
      content,
      dirName: packageDirName(pkg, cwd),
      header: `## ${pkg.name}@${pkg.version}`,
      name: pkg.name,
    });
  }

  const parts = [
    stockIntro(baseBranch, hasPublishScript),
    '',
    '# Releases',
    '',
    ...included.flatMap(p => [p.header, '', p.content.replace(/\n+$/, ''), '']),
  ];
  const fullBody = parts.join('\n').replace(/\n+$/, '\n');

  const footer = truncationFooter(
    repo,
    versionBranch,
    included.map(p => ({ dirName: p.dirName, name: p.name }))
  );

  return truncateVersionPrBody(fullBody, footer);
}

function repoSlugFromEnvOrRoot(cwd: string): string {
  if (typeof process.env.GITHUB_REPOSITORY === 'string' && process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as {
      bugs?: { url?: string };
      repository?: string | { url?: string };
    };
    const fromUrl = (u: string): string | undefined => {
      const m = u.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/i);
      if (!m) return undefined;
      return `${m[1]}/${m[2]}`;
    };
    if (typeof pkg.bugs?.url === 'string') {
      const s = fromUrl(pkg.bugs.url);
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
  } catch {
    /* ignore */
  }
  return '';
}

function main(): void {
  const cwd =
    typeof process.env.VERSION_PR_BODY_CWD === 'string'
      ? process.env.VERSION_PR_BODY_CWD
      : process.cwd();
  const baseBranch =
    typeof process.env.VERSION_PR_BASE_BRANCH === 'string'
      ? process.env.VERSION_PR_BASE_BRANCH
      : 'main';
  const versionBranch =
    typeof process.env.VERSION_PR_VERSION_BRANCH === 'string'
      ? process.env.VERSION_PR_VERSION_BRANCH
      : `changeset-release/${baseBranch}`;
  const hasPublishScript = process.env.VERSION_PR_HAS_PUBLISH_SCRIPT !== 'false';
  const repo = repoSlugFromEnvOrRoot(cwd);
  const outPath =
    typeof process.env.VERSION_PR_BODY_OUT === 'string'
      ? process.env.VERSION_PR_BODY_OUT
      : undefined;

  const result = buildVersionPrBody({
    baseBranch,
    cwd,
    hasPublishScript,
    repo,
    versionBranch,
  });

  if (outPath) {
    writeFileSync(outPath, result.body);
  } else {
    process.stdout.write(result.body);
  }

  if (result.truncated) {
    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (typeof summary === 'string' && summary) {
      writeFileSync(
        summary,
        'Version Packages PR body truncated to fit GitHub 65536-character limit.\n',
        { flag: 'a' }
      );
    }
    console.error('Version Packages PR body truncated to fit GitHub body limit.');
  }
}

const invoked = typeof process.argv[1] === 'string' ? resolve(process.argv[1]) : '';
const script = resolve(fileURLToPath(import.meta.url));
if (invoked === script) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
