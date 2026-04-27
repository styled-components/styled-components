/**
 * Properties that are handed to React Native unchanged. RN 0.85 parses
 * each of these itself; our transform layer adds no value and would
 * only introduce translation bugs.
 *
 * Additions to this list should be justified by a concrete RN version —
 * the entry in `knowledge_rn_0_80_to_0_85_css.md` (memory) records
 * when each prop shipped.
 */
export const PASSTHROUGH_PROPS: ReadonlySet<string> = new Set([
  // Transforms — RN parses CSS string form since 0.74
  'transform',
  'transformOrigin',
  // Shadows as CSS strings since 0.76; array form also fine
  'boxShadow',
  // Filters — RN parses string/array since 0.83
  'filter',
  // Backgrounds — RN parses gradient/url since 0.83
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'backgroundRepeat',
  // Blending + isolation added 0.85
  'mixBlendMode',
  'isolation',
  // Interactivity
  'cursor',
  'pointerEvents',
  'userSelect',
]);
