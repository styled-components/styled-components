/**
 * Properties that are handed to React Native unchanged: the value reaches
 * RN as a CSS string. RN 0.85 parses each of these itself; our transform
 * layer would only introduce translation bugs.
 *
 * Keys are the camelCase CSS property name our parser hands us; values
 * are the prop name RN expects on the style object. Most map identity;
 * the four `background*` props still ship under RN's `experimental_`
 * prefix as of 0.85, so they get renamed at the boundary. When RN
 * graduates them to stable names, drop the rename.
 *
 * Additions to this list should be justified by a concrete RN version —
 * the entry in `knowledge_rn_0_80_to_0_85_css.md` (memory) records
 * when each prop shipped.
 */
export const PASSTHROUGH_PROPS: ReadonlyMap<string, string> = new Map([
  // Transforms; RN parses CSS string form since 0.74
  ['transform', 'transform'],
  ['transformOrigin', 'transformOrigin'],
  // Shadows as CSS strings since 0.76; array form also fine
  ['boxShadow', 'boxShadow'],
  // Filters; RN parses string/array since 0.83
  ['filter', 'filter'],
  // Backgrounds; RN 0.85 still gates the parser behind experimental_
  ['backgroundImage', 'experimental_backgroundImage'],
  ['backgroundSize', 'experimental_backgroundSize'],
  ['backgroundPosition', 'experimental_backgroundPosition'],
  ['backgroundRepeat', 'experimental_backgroundRepeat'],
  // Blending + isolation added 0.85
  ['mixBlendMode', 'mixBlendMode'],
  ['isolation', 'isolation'],
  // Interactivity
  ['cursor', 'cursor'],
  ['pointerEvents', 'pointerEvents'],
  ['userSelect', 'userSelect'],
]);
