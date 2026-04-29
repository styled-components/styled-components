import { mainSheet } from '../models/StyleSheetManager';
import StyleSheet from '../sheet';
import { idForGroup } from '../sheet/GroupIDAllocator';

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
 * Output is plain CSS without the rehydration markers used by `ServerStyleSheet`,
 * so it's safe to inject directly into another document's `<head>` or stamp into
 * a cloned DOM tree.
 */
export default function extractCSS(sheet: StyleSheet = mainSheet): string {
  const tag = sheet.getTag();
  let css = '';
  for (let group = 0; group < tag.length; group++) {
    if (idForGroup(group) === undefined) continue;
    css += tag.getGroup(group);
  }
  return css;
}
