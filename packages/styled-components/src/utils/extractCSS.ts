import { mainSheet } from '../models/StyleSheetManager';
import StyleSheet from '../sheet';
import { idForGroup } from '../sheet/GroupIDAllocator';
import { escapeCssForStyleTag } from './escapeStyleSink';

/**
 * Read the current CSS from a stylesheet as a plain string.
 *
 * Useful when something downstream needs the CSS as text; extraction tooling,
 * static-render pipelines, micro-frontend cloning, or transferring styles into
 * a Shadow DOM / iframe context. Without this, runtime-injected rules live in
 * CSSOM and aren't visible in `<style>` text content.
 *
 * Pass a custom sheet (e.g. one supplied via `<StyleSheetManager sheet={...}>`)
 * to extract from a non-default sheet. Defaults to the library's main sheet.
 *
 * Output is plain CSS without the rehydration markers used by `ServerStyleSheet`
 * and is safe to inject as text into another document, including via
 * `innerHTML`; literal `</style` substrings in interpolated values are emitted
 * as the CSS hex escape `\3C/style` so they cannot terminate a host `<style>`
 * element.
 */
export default function extractCSS(sheet: StyleSheet = mainSheet): string {
  const tag = sheet.getTag();
  const sizes = tag.groupSizes;
  let css = '';
  for (let group = 0; group < tag.length; group++) {
    if (sizes[group] === 0) continue;
    if (idForGroup(group) === undefined) continue;
    css += tag.getGroup(group);
  }
  return escapeCssForStyleTag(css);
}
