import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { tokenizeFunctionArgs } from '../tokenize';

/**
 * Minimal `display: grid` subset for React Native.
 *
 * The supported subset is fixed equal columns: `grid-template-columns:
 * repeat(N, 1fr)` or an explicit all-`1fr` track list, plus `gap` /
 * `row-gap` / `column-gap` and `grid-column: span N` on items. The
 * `display: grid` declaration itself is intercepted in `transformDecl`
 * (it maps to a wrapping flex row, not a registered shorthand). These
 * handlers cover the track list, item placement, and auto-flow.
 *
 * Each handler emits a native-only sentinel (`__scGridColumns` /
 * `__scGridSpan`) that `compileNative` lifts into `gridInfo` / `gridSpan`
 * and removes from the style object. On rn-web the browser ships grid, so
 * every handler passes the raw value straight through and never warns.
 *
 * The handlers return `{}` (parsed, emit nothing) rather than `null` when
 * a value is outside the subset, so the generic `native-shorthand-parse`
 * warning does not also fire; the grid-specific warning below names the
 * supported alternative instead.
 */

const GRID_TEMPLATE_SUPPORTED =
  '`grid-template-columns: repeat(N, 1fr)` or an equal `1fr` track list (e.g. `1fr 1fr 1fr`). Fixed px tracks, `minmax()`, `auto`, `auto-fill` / `auto-fit`, and unequal `fr` factors are not supported on React Native; size with `flex` on the children, or render on the web where the browser lays out the grid.';

/**
 * Count the equal `1fr` columns described by a track list. Returns the
 * column count for `repeat(<int>, 1fr)` or N consecutive `1fr` tokens,
 * and `null` for anything else (px, minmax, auto, auto-fill / auto-fit,
 * unequal fr factors).
 */
function countEqualFrColumns(tokens: Token[]): number | null {
  if (tokens.length === 1 && tokens[0].kind === TokenKind.Function && tokens[0].name === 'repeat') {
    const args = tokenizeFunctionArgs(tokens[0]);
    // repeat(<count>, 1fr): Number, Comma, Length(1fr).
    if (
      args.length === 3 &&
      args[0].kind === TokenKind.Number &&
      args[1].kind === TokenKind.Comma &&
      isOneFr(args[2])
    ) {
      const n = args[0].value!;
      if (Number.isInteger(n) && n >= 1) return n;
    }
    return null;
  }
  // Explicit track list: every token must be a `1fr` length.
  for (let i = 0; i < tokens.length; i++) {
    if (!isOneFr(tokens[i])) return null;
  }
  return tokens.length >= 1 ? tokens.length : null;
}

function isOneFr(tok: Token): boolean {
  return tok.kind === TokenKind.Length && tok.unit === 'fr' && tok.value === 1;
}

function gridTemplateColumnsHandler(tokens: Token[], rawValue: string): Dict<any> | null {
  if (__NATIVE_WEB__) return { gridTemplateColumns: rawValue };
  const columns = countEqualFrColumns(tokens);
  if (columns !== null) return { __scGridColumns: columns };
  if (__DEV__) {
    warnOnce(
      'native-grid-template-unsupported',
      `the \`grid-template-columns\` value "${rawValue}" is not in scope of React Native's grid subset, which supports ${GRID_TEMPLATE_SUPPORTED} The declaration was ignored and the container falls back to a wrapping flex row.`,
      rawValue
    );
  }
  return {};
}

function gridColumnHandler(tokens: Token[], rawValue: string): Dict<any> | null {
  if (__NATIVE_WEB__) return { gridColumn: rawValue };
  // `span N`: Ident('span') followed by an integer.
  if (
    tokens.length === 2 &&
    tokens[0].kind === TokenKind.Ident &&
    tokens[0].name === 'span' &&
    tokens[1].kind === TokenKind.Number
  ) {
    const n = tokens[1].value!;
    if (Number.isInteger(n) && n >= 1) return { __scGridSpan: n };
  }
  if (__DEV__) {
    warnOnce(
      'native-grid-placement-unsupported',
      `the \`grid-column\` value "${rawValue}" is not supported on React Native. Only \`grid-column: span N\` (integer N >= 1) is implemented; line numbers, named lines, \`grid-row\`, and \`grid-area\` are not. The declaration was ignored.`,
      `grid-column:${rawValue}`
    );
  }
  return {};
}

function gridPlacementUnsupportedHandler(
  rawValue: string,
  camelKey: string,
  cssName: string
): Dict<any> | null {
  if (__NATIVE_WEB__) return { [camelKey]: rawValue };
  if (__DEV__) {
    warnOnce(
      'native-grid-placement-unsupported',
      `the \`${cssName}\` property is not supported on React Native. Place grid items with \`grid-column: span N\` (integer N >= 1) instead. The declaration was ignored.`,
      `${cssName}:${rawValue}`
    );
  }
  return {};
}

function gridAutoFlowHandler(tokens: Token[], rawValue: string): Dict<any> | null {
  if (__NATIVE_WEB__) return { gridAutoFlow: rawValue };
  // `row` is the initial value and the only flow the subset implements.
  if (tokens.length === 1 && tokens[0].kind === TokenKind.Ident && tokens[0].name === 'row') {
    return {};
  }
  if (__DEV__) {
    warnOnce(
      'native-grid-auto-flow-unsupported',
      `the \`grid-auto-flow\` value "${rawValue}" is not supported on React Native, which auto-places items in row order only. Remove the declaration or set \`grid-auto-flow: row\`. The declaration was ignored.`,
      rawValue
    );
  }
  return {};
}

// `grid-row` and `grid-area` share the placement-unsupported handler;
// the prop names are bound here so the warning and the rn-web passthrough
// key name the right property.
register('gridTemplateColumns', gridTemplateColumnsHandler);
register('gridColumn', gridColumnHandler);
register('gridRow', (_tokens, rawValue) =>
  gridPlacementUnsupportedHandler(rawValue, 'gridRow', 'grid-row')
);
register('gridArea', (_tokens, rawValue) =>
  gridPlacementUnsupportedHandler(rawValue, 'gridArea', 'grid-area')
);
register('gridAutoFlow', gridAutoFlowHandler);
