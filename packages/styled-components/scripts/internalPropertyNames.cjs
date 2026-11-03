/**
 * Property names a minifier never renames on its own. Every name here is
 * internal to one bundle (an AST field, a Source slot, a per-component cache,
 * a sheet bookkeeping member) and no public type, option, prop, or React
 * field shares the spelling. Names that double as public API (`componentId`,
 * `name`, `prop`, `value`, `children`, `options`, `sheet`, `rules`) or as a
 * builtin (`index`, `length`, `insertRule`) must never appear here. A listed
 * member of a class or type a public type reaches carries `@internal`, which
 * `stripInternal` removes from the emitted declarations. A field that crosses
 * a bundle boundary stays out: `kind`, `stops` and `frames` ride on the
 * keyframes, easing and timeline descriptors the native bundle hands the
 * reanimated adapter bundle, and jest-styled-components resets
 * `mainSheet.names` and calls `.clearTag()` and `.toString()` (the
 * ecosystem-contract tests in `src/test/dist-behavior.test.js` replay it).
 *
 * `rollup.config.mjs` builds the mangle regex from this list;
 * `src/test/dist-behavior.test.js` checks the published declarations and the
 * reanimated sources against it.
 */
const INTERNAL_PROPERTY_NAMES = [
  // parser AST + Source
  'ast',
  'chunks',
  'filled',
  'fragments',
  'kinds',
  'prelude',
  'selectors',
  'slotIsStandalone',
  'slots',
  'staticValues',
  'strings',
  'interpolations',
  // parse context + emit options
  'depth',
  'keepCommaSpaces',
  'len',
  'selfRefSelector',
  'templates',
  'unterminated',
  // WebStyle / generated style
  'baseHash',
  'baseStyle',
  'cssKeyCache',
  'filledBuffer',
  'fragmentsBuffer',
  'generated',
  'interpKeyCache',
  'isNew',
  'keyframesBuffer',
  'levels',
  'resolvedSource',
  'shareRules',
  // sheet internals
  '_cGroup',
  '_cIndex',
  'clearGroup',
  'getGroup',
  'groupSizes',
  'indexOfGroup',
  'provisionalRules',
  // global style + post-attrs plans
  'computeRules',
  'instanceRules',
  'isStatic',
  'lookup',
  'merge',
  'onPop',
  'output',
  'popped',
  'postAttrsPlans',
  'rebuildGroup',
];

module.exports = { INTERNAL_PROPERTY_NAMES };
