
export type MarkdownString = string;
/**
 *  The Danger DSL provides the metadata for introspection
 *  in order to create your own rules.
 */
interface DangerDSLType {
  /**
   *  Details specific to the git changes within the code changes.
   *  Currently, this is just the raw file paths that have been
   *  added, removed or modified.
   */
  git: GitDSL;
  /**
   *  The GitHub metadata.
   *  Currently, this is just the raw PR information.
   */
  github: GitHubDSL;
}
interface GitDSL {
  /**
   * Filepaths with changes relative to the git root
   */
  modified_files: string[],
  /**
   * Newly created filepaths relative to the git root
   */
  created_files: string[],
  /**
   * Removed filepaths relative to the git root
   */
  deleted_files: string[]
}
interface GitHubDSL {
  /**
   * The PR metadata for a code review session
   */
  pr: GitHubPRDSL
}
/**
 * A GitHub user account
 */
interface GitHubUser {
  /**
   * Generic UUID
   */
  id: number,
  /**
   * The handle for the user/org
   */
  login: string,
  /**
   * Whether the user is an org, or a user
   */
  type: "User" | "Organization"
}
/**
 * A GitHub Repo
 */
interface GitHubRepo {
  /**
   * Generic UUID
   */
  id: number,
  /**
   * The name of the repo, e.g. "Danger-JS"
   */
  name: string,
  /**
   * The full name of the owner + repo, e.g. "Danger/Danger-JS"
   */
  full_name: string,
  /**
   * The owner of the repo
   */
  owner: GitHubUser,
  /**
   * Is the repo publicly accessible?
   */
  private: bool,
  /**
   * The textual description of the repo
   */
  description: string,
  /**
   * Is the repo a fork?
   */
  fork: false
}
interface GitHubMergeRef {
  /**
   * The human display name for the merge reference, e.g. "artsy:master"
   */
  label: string,
  /**
   * The reference point for the merge, e.g. "master"
   */
  ref: string,
  /**
   * The reference point for the merge, e.g. "704dc55988c6996f69b6873c2424be7d1de67bbe"
   */
  sha: string,
  /**
   * The user that owns the merge reference e.g. "artsy"
   */
  user: GitHubUser
}
interface GitHubPRDSL {
  /**
   * The UUID for the PR
   */
  number: number,
  /**
   * The state for the PR
   */
  state: "closed" | "open" | "locked" | "merged",
  /**
   * Has the PR been locked to contributors only?
   */
  locked: boolean,
  /**
   * The title of the PR
   */
  title: string,
  /**
   * The markdown body message of the PR
   */
  body: string,
  /**
   * ISO6801 Date string for when PR was created
   */
  created_at: string,
  /**
   * ISO6801 Date string for when PR was updated
   */
  updated_at: string,
  /**
   * optional ISO6801 Date string for when PR was closed
   */
  closed_at: ?string,
  /**
   * Optional ISO6801 Date string for when PR was merged.
   * Danger probably shouldn't be running in this state.
   */
  merged_at: ?string,
  /**
   * Merge reference for the _other_ repo.
   */
  head: GitHubMergeRef,
  /**
   * Merge reference for _this_ repo.
   */
  base: GitHubMergeRef,
  /**
   * The User who submitted the PR
   */
  user: GitHubUser
}
declare module 'danger' {
  /**
   * Fails a build, outputting a specific reason for failing
   *
   * @param {MarkdownString} message the String to output
   */
  declare function fail(message: MarkdownString): void;
  /**
   * Highlights low-priority issues, does not fail the build
   *
   * @param {MarkdownString} message the String to output
   */
  declare function warn(message: MarkdownString): void;
  /**
   * Puts a message inside the Danger table
   *
   * @param {MarkdownString} message the String to output
   */
  declare function message(message: MarkdownString): void;
  /**
   * Puts a message inside the Danger table
   *
   * @param {MarkdownString} message the String to output
   */
  declare function markdown(message: MarkdownString): void;
  /** Typical console */
  declare var console: any;
  /** Typical require statement */
  declare function require(id: string): any;
  /**
   * The Danger object to work with
   *
   */
  declare var danger: DangerDSLType
}
