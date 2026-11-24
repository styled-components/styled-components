export type ScenarioRoute = {
  href: string;
  /**
   * The page's probe colors hold only on a full page load (the reason says why). A soft navigation
   * or back skips them, and so does a soft navigation from the index when `fromIndex` is set.
   */
  hardLoadOnly?: { fromIndex?: true; reason: string };
  /** The page's probes exist only once JavaScript runs (no probe in the server HTML). */
  jsOnly?: true;
  /** The page has no `data-expected` probes by design (a cost measurement). */
  noProbes?: true;
  /** Plan rows are the scenario numbers in the server component order spec (docs/react.md). */
  rows: string;
  what: string;
};

/** The scenario pages, in index order. The index page and the browser suite both read this list. */
export const routes: readonly ScenarioRoute[] = [
  { href: 'chain', rows: 'S1', what: 'server B extends server A' },
  { href: 'server-over-client', rows: 'S2', what: 'server B extends a client component' },
  { href: 'as-client', rows: 'S3a', what: 'server B rendered as a client component' },
  { href: 'as-server', rows: 'S3b, S5', what: 'server B rendered as server A, B defined first' },
  { href: 'client-as', rows: 'S3c, S5', what: 'client B rendered as client A, B defined first' },
  {
    href: 'plain-intermediate',
    rows: 'S4',
    what: 'outer reaches its inner through a plain function',
  },
  {
    href: 'lazy-inner',
    jsOnly: true,
    rows: 'S6',
    what: 'inner module first loaded in the browser',
  },
  { href: 'late-boundary', rows: 'S7', what: 'B in the shell, A in a late boundary' },
  { href: 'late-unrelated', rows: 'S8a', what: 'unrelated component in a late boundary' },
  { href: 'late-new-name', rows: 'S8b', what: 'late instance mints a new generated name' },
  { href: 'streaming', rows: 'S8c, S26, cost', what: 'late client boundaries and late globals' },
  { href: 'svg', rows: 'S9', what: 'SVG children with child-index selectors' },
  { href: 'sibling', rows: 'S10', what: 'adjacent-sibling selector on list items' },
  { href: 'cycle-p', rows: 'S11', what: 'cycle, B rendered as A' },
  {
    hardLoadOnly: {
      reason:
        'a pair wrapping each other both ways keeps definition order only once both rendered in one page load',
    },
    href: 'cycle-q',
    rows: 'S11',
    what: 'cycle, A rendered as B',
  },
  { href: 'cycle-both', rows: 'S11', what: 'cycle, both nestings on one page' },
  { href: 'globals', rows: 'S13, S25', what: 'globals against components' },
  { href: 'nested-wrappers', rows: 'S16', what: 'three levels through plain functions' },
  { href: 'late-edge', rows: 'S20', what: 'two flushed groups related by a late boundary' },
  { href: 'nested-manager', rows: 'S23', what: 'managers with a nonce or a target' },
  { href: 'layers', rows: 'S24', what: 'layer order without an up-front statement' },
  { href: 'layers-declared', rows: 'S24', what: 'layer order with an up-front statement' },
  {
    hardLoadOnly: {
      fromIndex: true,
      reason:
        'unrelated components follow definition order, so a later streamed chunk sitting after earlier ones applies only to a full page load',
    },
    href: 'late-child-selector',
    rows: 'S27',
    what: 'parent child-selector against a late child',
  },
  {
    href: 'many-instances',
    noProbes: true,
    rows: 'cost',
    what: '5,000 server instances of 50 components',
  },
];
